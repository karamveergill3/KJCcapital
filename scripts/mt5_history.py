#!/usr/bin/env python3
"""Exact $KJC history, read from the MT5 terminal on the PC where it runs.

Run it on the Windows PC where MetaTrader 5 is open and logged in to the
account (the investor password is enough):

    py -m pip install MetaTrader5
    py mt5_history.py

It reads the terminal's own deal history and the broker's own price bars,
rebuilds the account's equity at the close of every hour since its first deal,
and writes kjc-history.json next to this file. The file holds times and $KJC
percentages and nothing else: no money figure, login, server, symbol or
position. It becomes the website's committed snapshot,
src/lib/keystoneSnapshot.json, which has the same shape.

    $KJC(t) = (own equity(t) - net deposits(t)) / net deposits(t) * 100

Own equity is the balance plus the open profit, with any broker credit left
out. Net deposits are the deposits less the withdrawals made by t.

The script only reads. It never places, checks, changes or closes an order or
a position, and it does not touch the KeystoneSync EA. The one change it can
make to the terminal is to add a symbol to Market Watch, which the terminal
needs before it serves that symbol's prices. scripts/test_mt5_history.py fails
if any other MetaTrader5 function appears in this file.

Every calculation is a plain function of plain data, tested without
MetaTrader5; load_from_terminal() is the only code that talks to the terminal.
"""

import argparse
import json
import os
import sys
import time
import traceback
from bisect import bisect_right
from datetime import datetime, timedelta, timezone

HOUR = 3600
DAY = 86400
EPOCH = datetime(1970, 1, 1, tzinfo=timezone.utc)

TIMEFRAMES = {"M1": 60, "M5": 300, "M15": 900, "M30": 1800, "H1": HOUR, "H4": 4 * HOUR, "D1": DAY}
TRADES = ("buy", "sell")

# A price older than this is not the price at t, so the point is left out.
STALE_S = 7 * DAY
# The terminal downloads history on demand, so the first request for a
# symbol's bars often comes back short; it is asked again a few times.
BAR_ATTEMPTS = 6
BAR_RETRY_S = 1.5
# How long to watch for a live price, one look a second, before asking for
# --utc-offset: a busy pair ticks several times a second while its market is
# open, and not at all while it is shut.
CLOCK_WAIT_S = 20
# A check difference above this share of net deposits gets a warning.
WARN_SHARE = 0.005
EPS = 1e-9

DOWNLOAD_HISTORY = (
    "In MT5 open the Toolbox (Ctrl+T), go to the History tab, right-click it and choose "
    "All History, wait for it to fill, then run this again."
)
SEND_BACK = "Send this message back to whoever asked you to run the script."


class Stop(Exception):
    """A problem the owner can act on. The message says what happened and what to do."""


# ---------------------------------------------------------------------------
# Positions


def _volume(x):
    # Lots are decimals held as floats, and 0.1 + 0.2 - 0.3 is not quite
    # zero: a position must close when its deals cancel out.
    x = round(x, 8)
    return 0.0 if abs(x) < EPS else x


def _in_time_order(deals):
    # Tickets rise with time, so they order deals booked in the same second.
    return sorted(deals, key=lambda d: (d["time"], d["ticket"]))


class _Book:
    """Each position's net volume and average price as its deals arrive in time order.

    A deal in the position's direction averages its price in; one against it
    takes volume off and leaves the price alone; one that goes through zero
    (a netting account's reversal) opens the remainder at its own price. A
    hedging account opens each position with one deal, so its price is that
    deal's price, the volume-weighted average of its "in" deals.
    """

    def __init__(self):
        self.positions = {}
        self.open = {}

    def apply(self, deal):
        if deal["type"] not in TRADES:
            return
        pid = deal["position_id"]
        p = self.positions.setdefault(pid, {"symbol": deal["symbol"], "q": 0.0, "p0": 0.0, "booked": 0.0})
        p["booked"] += deal["swap"]
        v = deal["volume"] if deal["type"] == "buy" else -deal["volume"]
        if v == 0:
            return
        q = p["q"]
        if q == 0 or q * v > 0:
            p["p0"] = (abs(q) * p["p0"] + abs(v) * deal["price"]) / (abs(q) + abs(v))
        elif abs(v) > abs(q) + EPS:
            p["p0"] = deal["price"]
        p["q"] = _volume(q + v)
        if p["q"] == 0:
            self.open.pop(pid, None)
        else:
            self.open[pid] = p


def positions_now(deals):
    """The book after every deal: each position's volume, price and swap booked so far."""
    book = _Book()
    for deal in _in_time_order(deals):
        book.apply(deal)
    return book


def _lives(deals, open_swaps, end_server_s):
    """Each position's (start, end, total swap), for spreading its swap over its life.

    MT5 books swap nightly but reports it only on the deal that closes a
    position, or on the position while it is open, so the total is spread
    evenly from opening to closing (to now while it is still open): within a
    day's swap of the nightly figure. Swap that a partial close has already
    booked into the balance is part of the total and is taken back off while
    the rest stays open, so it is never counted twice.
    """
    book = _Book()
    first, last = {}, {}
    for deal in _in_time_order(deals):
        if deal["type"] in TRADES:
            first.setdefault(deal["position_id"], deal["time"])
            last[deal["position_id"]] = deal["time"]
        book.apply(deal)
    lives = {}
    for pid, p in book.positions.items():
        if p["q"] == 0:
            lives[pid] = (first[pid], last[pid], p["booked"])
        else:
            lives[pid] = (first[pid], end_server_s, p["booked"] + open_swaps.get(pid, 0.0))
    return lives


def unexplained_positions(deals, open_volumes):
    """Position ids where the deal history and the terminal's open positions disagree.

    open_volumes is {position id: signed volume} from the terminal. Any
    disagreement means deals are missing (the history is not all downloaded)
    or a trade was booked while the script was reading.
    """
    book = positions_now(deals)
    bad = set()
    for pid, volume in open_volumes.items():
        q = book.positions.get(pid, {}).get("q", 0.0)
        if abs(q - volume) > 1e-6:
            bad.add(pid)
    bad.update(pid for pid in book.open if pid not in open_volumes)
    return sorted(bad)


# ---------------------------------------------------------------------------
# Currency conversion


def suffix(name):
    """A broker's suffix on a symbol: whatever follows the six letters of the pair."""
    return name[6:]


def rank_conversions(symbol, profit_currency, account_currency, candidates):
    """Symbols that turn symbol's profit currency into the account currency, best first.

    candidates are (name, base, profit) or (name, base, profit, visible).
    Gives [(None, "same")] when no conversion is needed, else a list of
    (name, "mul") for a P/A pair (NZDUSD for NZD into USD) and (name, "div")
    for an A/P pair (USDJPY for JPY into USD). One carrying the traded
    symbol's own suffix comes first, since a broker's suffixes mark account
    types whose prices can differ; then one already in Market Watch; then the
    shortest name.
    """
    if profit_currency == account_currency:
        return [(None, "same")]
    want = suffix(symbol)
    found = []
    for candidate in candidates:
        name, base, profit = candidate[0], candidate[1], candidate[2]
        visible = candidate[3] if len(candidate) > 3 else True
        if base == profit_currency and profit == account_currency:
            mode = "mul"
        elif base == account_currency and profit == profit_currency:
            mode = "div"
        else:
            continue
        found.append((suffix(name) != want, not visible, len(name), name, mode))
    return [(name, mode) for _s, _v, _l, name, mode in sorted(found)]


def conversion_map(symbols, specs, account_currency, usable):
    """{symbol: (conversion symbol or None, "same" | "mul" | "div")} for each symbol that can be converted.

    Only symbols in usable (those with prices) are considered; a symbol left
    out of the map cannot be valued, and any point that needs it is skipped.
    """
    candidates = [(n, s["base"], s["profit"]) for n, s in specs.items() if n in usable]
    found = {}
    for symbol in symbols:
        spec = specs.get(symbol)
        if spec is None:
            continue
        ranked = rank_conversions(symbol, spec["profit"], account_currency, candidates)
        if ranked:
            found[symbol] = ranked[0]
    return found


def _to_account(value, mode, rate):
    if mode == "same":
        return value
    if rate is None or rate <= 0:
        return None
    return value * rate if mode == "mul" else value / rate


def _floating(p, bid, ask, spec):
    # A buy closes at the bid and a sell at the ask, as the terminal values them.
    price = bid if p["q"] > 0 else ask
    return p["q"] * (price - p["p0"]) * spec["contract"]


# ---------------------------------------------------------------------------
# The rebuild


class _Prices:
    """One symbol's bars, looked up as of a time: the last bar closed by then."""

    def __init__(self, rows, tf_seconds):
        rows = sorted(rows)
        self.closed_at = [row[0] + tf_seconds for row in rows]
        self.close = [row[1] for row in rows]
        self.spread = [row[2] for row in rows]

    def at(self, t):
        i = bisect_right(self.closed_at, t) - 1
        if i < 0 or t - self.closed_at[i] > STALE_S:
            return None
        return i


def _value_at(p, t, prices, specs, conversions):
    symbol = p["symbol"]
    spec, series, conversion = specs.get(symbol), prices.get(symbol), conversions.get(symbol)
    if spec is None or series is None or conversion is None:
        return None
    i = series.at(t)
    if i is None:
        return None
    bid = series.close[i]
    value = _floating(p, bid, bid + series.spread[i] * spec["point"], spec)
    name, mode = conversion
    rate = None
    if mode != "same":
        rates = prices.get(name)
        j = rates.at(t) if rates else None
        if j is None:
            return None
        rate = rates.close[j]
    return _to_account(value, mode, rate)


def rebuild(deals, bars, specs, account_currency, open_swaps, end_server_s, tf_seconds, skipped=None):
    """The account at every bar close since its first deal: [(t_server_s, balance, equity), ...].

    Times are the broker server's clock. The grid is every close of a traded
    symbol's bar after the first deal and up to end_server_s. The balance is
    every deal but credit; equity adds each open position marked at its
    symbol's last close (the bid for a buy, bid plus spread for a sell),
    converted at the conversion symbol's last close, plus its swap so far.
    A time where any price needed is missing or over a week old is left out,
    never guessed, and appended to skipped when a list is given.
    """
    deals = _in_time_order(deals)
    if not deals:
        return []
    first = deals[0]["time"]
    traded = {d["symbol"] for d in deals if d["type"] in TRADES}
    prices = {name: _Prices(rows, tf_seconds) for name, rows in bars.items() if rows}
    conversions = conversion_map(traded, specs, account_currency, usable=prices)
    lives = _lives(deals, open_swaps, end_server_s)
    closes = (row[0] + tf_seconds for name in traded for row in bars.get(name, ()))
    grid = sorted({t for t in closes if first < t <= end_server_s})

    book = _Book()
    balance = 0.0
    i = 0
    rows = []
    for t in grid:
        while i < len(deals) and deals[i]["time"] <= t:
            deal = deals[i]
            i += 1
            if deal["type"] != "credit":
                balance += deal["profit"] + deal["swap"] + deal["commission"] + deal["fee"]
            book.apply(deal)
        equity = balance
        for pid, p in book.open.items():
            value = _value_at(p, t, prices, specs, conversions)
            if value is None:
                equity = None
                break
            start, end, total = lives[pid]
            share = 1.0 if end <= start else min(1.0, max(0.0, (t - start) / float(end - start)))
            equity += value + total * share - p["booked"]
        if equity is None:
            if skipped is not None:
                skipped.append(t)
            continue
        rows.append((t, balance, equity))
    return rows


def net_deposits(deals, until=None):
    """Deposits less withdrawals (the "balance" deals) up to until, or all of them."""
    return sum(d["profit"] for d in deals if d["type"] == "balance" and (until is None or d["time"] <= until))


def _pct(equity, capital):
    value = round((equity - capital) / capital * 100, 4)
    return 0.0 if value == 0 else value


def kjc_points(rows, deals):
    """[(t, $KJC percent), ...]: each row's equity against the net deposits made by its time.

    A point with nothing deposited (or everything withdrawn) has no
    percentage and is dropped.
    """
    deposits = sorted((d["time"], d["profit"]) for d in deals if d["type"] == "balance")
    capital = 0.0
    j = 0
    points = []
    for t, _balance, equity in sorted(rows):
        while j < len(deposits) and deposits[j][0] <= t:
            capital += deposits[j][1]
            j += 1
        if capital > EPS:
            points.append((t, _pct(equity, capital)))
    return points


def headline_pct(account, capital):
    """$KJC now, from the terminal's own equity less any broker credit."""
    return _pct(account["equity"] - account["credit"], capital)


def thin(points):
    """Thins (t_utc_s, pct) points as Keystone does, each block keeping its last point.

    By age from the latest point: every point within two days; the last per
    UTC clock hour within 30 days; the last per 4-hour UTC block within a
    year; the last per UTC day before that.
    """
    if not points:
        return []
    points = sorted(points)
    latest = points[-1][0]
    kept = {}
    for t, pct in points:
        age = latest - t
        if age <= 2 * DAY:
            key = (0, t)
        elif age <= 30 * DAY:
            key = (1, t // HOUR)
        elif age <= 365 * DAY:
            key = (2, t // (4 * HOUR))
        else:
            key = (3, t // DAY)
        kept[key] = (t, pct)
    return sorted(kept.values())


# ---------------------------------------------------------------------------
# The current check


def check_now(deals, specs, ticks, conversions, open_swaps, account):
    """(rebuilt, reported, difference) for the open profit right now.

    rebuilt is the open positions' profit worked out from the deals at the
    current prices (a buy at the bid, a sell at the ask, converted at the mid
    of the conversion symbol), plus the open swaps; reported is the
    terminal's own figure. A close match shows the deals, contract sizes and
    conversions were read correctly. rebuilt and difference are None when a
    current price is missing.
    """
    reported = account["profit"]
    rebuilt = 0.0
    for p in positions_now(deals).open.values():
        symbol = p["symbol"]
        tick, spec, conversion = ticks.get(symbol), specs.get(symbol), conversions.get(symbol)
        if tick is None or spec is None or conversion is None:
            return None, reported, None
        value = _floating(p, tick["bid"], tick["ask"], spec)
        name, mode = conversion
        rate = None
        if mode != "same":
            quote = ticks.get(name)
            if quote is None:
                return None, reported, None
            rate = (quote["bid"] + quote["ask"]) / 2.0
        value = _to_account(value, mode, rate)
        if value is None:
            return None, reported, None
        rebuilt += value
    rebuilt += sum(open_swaps.values())
    return rebuilt, reported, rebuilt - reported


# ---------------------------------------------------------------------------
# The server's clock


def fresh_tick(observations):
    """The (utc_now_s, tick_server_s) of a price seen arriving while the script watched, or None.

    observations are (this PC's UTC clock, {symbol: latest tick time in server
    seconds}) pairs, in the order taken. A tick's time alone cannot say
    whether it is a second old or from Friday night, since the server's
    offset is the unknown. A tick newer than the same symbol's tick at an
    earlier look arrived between the two looks, so it is seconds old. One
    symbol has to move twice, so that a quote the terminal was still catching
    up on at the first look is not taken for a live one.
    """
    last, moves = {}, {}
    for now_s, times in observations:
        for symbol in sorted(times):
            tick_s = times[symbol]
            if tick_s is None:
                continue
            if symbol in last and tick_s > last[symbol]:
                moves[symbol] = moves.get(symbol, 0) + 1
                if moves[symbol] >= 2:
                    return now_s, tick_s
            last[symbol] = tick_s
    return None


def server_offset(observations, utc_offset_hours=None):
    """Seconds the broker server's clock runs ahead of UTC, so utc = server - offset.

    --utc-offset wins when given. Otherwise it is read from a price that
    arrived while the script watched, rounded to a quarter hour. Either way
    it is today's offset and serves the whole history, so if the server
    changed between winter and summer time inside it, the points before the
    change sit an hour out: the same limit the EA has.
    """
    if utc_offset_hours is not None:
        return int(round(utc_offset_hours * HOUR))
    seen = fresh_tick(observations)
    if seen is None:
        raise Stop(
            "Could not read the broker server's clock: no new price arrived in %d seconds, which is "
            "what happens while the markets are shut, at a weekend or on a holiday. Run this again "
            "while the market is open (a weekday), or give the server's hours ahead of UTC, for "
            "example --utc-offset 3 for a server on UTC+3." % CLOCK_WAIT_S
        )
    now_s, tick_s = seen
    offset = int(round((tick_s - now_s) / 900.0)) * 900
    if not -12 * HOUR <= offset <= 14 * HOUR:
        raise Stop(
            "This PC's clock and the broker server's differ by %.1f hours, which no time zone explains, "
            "so this PC's date or time is wrong. Turn on Settings > Time & language > Date & time > "
            "Set time automatically, then run this again." % (offset / float(HOUR))
        )
    return offset


def utc_label(offset_s):
    """Names an offset: UTC+3, UTC+5:30, UTC-4 or plain UTC."""
    if offset_s == 0:
        return "UTC"
    sign = "+" if offset_s > 0 else "-"
    hours, rest = divmod(abs(int(offset_s)), HOUR)
    return "UTC%s%d%s" % (sign, hours, ":%02d" % (rest // 60) if rest else "")


# ---------------------------------------------------------------------------
# The file


def iso_utc(seconds):
    """A UTC time as ISO 8601 with milliseconds and a Z."""
    ms = int(round(seconds * 1000))
    moment = EPOCH + timedelta(milliseconds=ms)
    return moment.strftime("%Y-%m-%dT%H:%M:%S") + ".%03dZ" % (ms % 1000)


def build_feed(points_utc, now_utc_s, headline):
    """The file's content: as_at, pct and a series of at and pct, and nothing else.

    The series is the thinned history, oldest first, ending on the headline
    at as_at, the same shape as Keystone's feed and the committed snapshot.
    """
    points = [(t, pct) for t, pct in points_utc if t < now_utc_s]
    points.append((now_utc_s, headline))
    as_at = iso_utc(now_utc_s)
    series = [{"at": iso_utc(t), "pct": pct} for t, pct in thin(points)]
    return {"as_at": as_at, "pct": headline, "series": series}


def dumps_feed(feed):
    """The file's text: valid JSON with one point per line, so two runs diff point by point."""
    def number(value):
        return json.dumps(float(value), allow_nan=False)

    head = '{"as_at": %s, "pct": %s, "series": [' % (json.dumps(feed["as_at"]), number(feed["pct"]))
    lines = ['  {"at": %s, "pct": %s}' % (json.dumps(p["at"]), number(p["pct"])) for p in feed["series"]]
    return head + "\n" + ",\n".join(lines) + "\n]}\n"


def history_from(data):
    """Everything the run produces from what load_from_terminal() read: no terminal needed."""
    deals, specs, account = data["deals"], data["specs"], data["account"]
    currency, offset_s, now_s = account["currency"], data["offset_s"], data["now_s"]
    end_server_s = int(now_s) + offset_s
    capital = net_deposits(deals)
    if capital <= EPS:
        raise Stop(
            "No deposit was found in the account's history, so there is nothing to measure the gain against. "
            + DOWNLOAD_HISTORY
        )

    skipped = []
    rows = rebuild(
        deals, data["bars"], specs, currency, data["open_swaps"], end_server_s, data["tf_seconds"], skipped
    )
    points = [(t - offset_s, pct) for t, pct in kjc_points(rows, deals)]
    headline = headline_pct(account, capital)
    traded = {d["symbol"] for d in deals if d["type"] in TRADES}
    conversions = conversion_map(traded, specs, currency, usable=data["ticks"])
    return {
        "feed": build_feed(points, now_s, headline),
        "rows": len(rows),
        "skipped": len(skipped),
        "capital": capital,
        "check": check_now(deals, specs, data["ticks"], conversions, data["open_swaps"], account),
    }


# ---------------------------------------------------------------------------
# The terminal. Everything above is plain data; this is the only part that
# calls MetaTrader5, and only the read functions the test allows.


def _as_datetime(seconds):
    # The terminal takes and gives times as "UTC" datetimes that are really
    # the server's clock, so server seconds are passed through unshifted.
    return EPOCH + timedelta(seconds=seconds)


def _day(seconds):
    return _as_datetime(seconds).strftime("%Y-%m-%d")


def _last_error(mt5):
    try:
        code, message = mt5.last_error()
        return code, message
    except Exception:
        return None, "no detail"


def _account(mt5, login):
    info = mt5.account_info()
    if info is None:
        raise Stop(
            "MT5 is running but not logged in to an account. In MT5 use File > Login to Trade Account "
            "(the investor password is enough), wait until the bottom right corner shows the connection, "
            "then run this again."
        )
    if login is not None and int(info.login) != int(login):
        raise Stop(
            "MT5 is logged in to account %s, not %s. In MT5 use File > Login to Trade Account to log in to %s, "
            "then run this again. If more than one MT5 is installed, point the script at the right one with "
            "--terminal." % (info.login, login, login)
        )
    return {
        "currency": info.currency,
        "balance": float(info.balance),
        "equity": float(info.equity),
        "credit": float(info.credit),
        "profit": float(info.profit),
    }


def _deals(mt5, clock):
    types = {
        mt5.DEAL_TYPE_BUY: "buy",
        mt5.DEAL_TYPE_SELL: "sell",
        mt5.DEAL_TYPE_BALANCE: "balance",
        mt5.DEAL_TYPE_CREDIT: "credit",
    }
    entries = {
        mt5.DEAL_ENTRY_IN: "in",
        mt5.DEAL_ENTRY_OUT: "out",
        mt5.DEAL_ENTRY_INOUT: "inout",
        mt5.DEAL_ENTRY_OUT_BY: "out_by",
    }
    raw = mt5.history_deals_get(datetime(2000, 1, 1, tzinfo=timezone.utc), _as_datetime(clock() + 2 * DAY))
    if raw is None:
        code, message = _last_error(mt5)
        if code != 1:
            raise Stop("Could not read the deal history (MT5 error %s: %s). %s" % (code, message, DOWNLOAD_HISTORY))
        raw = ()
    deals = []
    for d in raw:
        kind = types.get(d.type, "other")
        deals.append(
            {
                "ticket": int(d.ticket),
                "position_id": int(d.position_id),
                "time": int(d.time),
                "type": kind,
                "entry": entries.get(d.entry) if kind in TRADES else None,
                "symbol": d.symbol,
                "volume": float(d.volume),
                "price": float(d.price),
                "profit": float(d.profit),
                "swap": float(d.swap),
                "commission": float(d.commission),
                "fee": float(getattr(d, "fee", 0.0) or 0.0),
            }
        )
    return deals


def _positions(mt5):
    raw = mt5.positions_get()
    if raw is None:
        code, message = _last_error(mt5)
        if code != 1:
            raise Stop(
                "Could not read the open positions (MT5 error %s: %s). Run this again; if it keeps failing, "
                "restart MT5." % (code, message)
            )
        raw = ()
    swaps, volumes = {}, {}
    for p in raw:
        pid = int(p.identifier)
        swaps[pid] = float(p.swap)
        volumes[pid] = -float(p.volume) if p.type == mt5.POSITION_TYPE_SELL else float(p.volume)
    return swaps, volumes


def _spec(mt5, name, required=True):
    info = mt5.symbol_info(name)
    if info is None:
        if not required:
            return None
        raise Stop(
            "The account traded %s, but this terminal has no symbol of that name, so its prices cannot be read. %s"
            % (name, SEND_BACK)
        )
    if not info.visible:
        # Only adds it to Market Watch: the terminal serves a symbol's
        # prices only once it is there.
        mt5.symbol_select(name, True)
    return {
        "contract": float(info.trade_contract_size),
        "base": info.currency_base,
        "profit": info.currency_profit,
        "point": float(info.point),
    }


def _timeframe(mt5, name):
    return {
        "M1": mt5.TIMEFRAME_M1,
        "M5": mt5.TIMEFRAME_M5,
        "M15": mt5.TIMEFRAME_M15,
        "M30": mt5.TIMEFRAME_M30,
        "H1": mt5.TIMEFRAME_H1,
        "H4": mt5.TIMEFRAME_H4,
        "D1": mt5.TIMEFRAME_D1,
    }[name]


def _bar_rows(rates):
    # Rows are read by field name, so a numpy record and a dict both work.
    if rates is None or len(rates) == 0:
        return []
    rows = {}
    for r in rates:
        rows[int(r["time"])] = (int(r["time"]), float(r["close"]), int(r["spread"]))
    return [rows[t] for t in sorted(rows)]


def _bars(mt5, name, timeframe, need_from, clock, sleep):
    start = _as_datetime(need_from - 8 * DAY)
    stop = _as_datetime(clock() + 2 * DAY)
    rows = []
    for attempt in range(BAR_ATTEMPTS):
        rows = _bar_rows(mt5.copy_rates_range(name, timeframe, start, stop))
        if rows and rows[0][0] <= need_from:
            break
        if attempt + 1 < BAR_ATTEMPTS:
            sleep(BAR_RETRY_S)
    return rows


def _late_start(name, rows, need_from, tf_name, use):
    if not rows or rows[0][0] <= need_from:
        return None
    return (
        "%s prices start on %s, after %s on %s, so the points before are left out rather than guessed. "
        "To fill them, open a %s %s chart in MT5, press Home until it reaches %s, and run this again; if it "
        "will not go back that far, raise Tools > Options > Charts > Max. bars in chart."
        % (name, _day(rows[0][0]), use, _day(need_from), name, tf_name, _day(need_from))
    )


def _no_bars(name, need_from, tf_name):
    return Stop(
        "The terminal has no %s prices for %s yet. In MT5 open a %s %s chart, press Home until it reaches %s, "
        "wait for it to load, then run this again." % (tf_name, name, name, tf_name, _day(need_from))
    )


def _tick_time(tick):
    msc = getattr(tick, "time_msc", 0) or 0
    return msc / 1000.0 if msc else float(tick.time)


def _ticks(mt5, names):
    ticks = {}
    for name in names:
        tick = mt5.symbol_info_tick(name)
        if tick is not None and tick.bid > 0 and tick.ask > 0:
            ticks[name] = {"time": _tick_time(tick), "bid": float(tick.bid), "ask": float(tick.ask)}
    return ticks


def _watch_prices(mt5, names, clock, sleep):
    def look():
        return clock(), {name: tick["time"] for name, tick in _ticks(mt5, names).items()}

    observations = [look()]
    for _ in range(CLOCK_WAIT_S):
        if fresh_tick(observations) is not None:
            break
        sleep(1.0)
        observations.append(look())
    return observations


def load_from_terminal(mt5, args, clock=time.time, sleep=time.sleep, say=print):
    """Reads what the rebuild needs from the running terminal and hands it back as plain data.

    args carries terminal, login, utc_offset and timeframe, as main() parses
    them. Any problem the owner can fix stops the run with a Stop that says
    what to do.
    """
    tf_name = args.timeframe
    if args.terminal and not os.path.isfile(args.terminal):
        raise Stop(
            "There is no file at %s. Give the full path to terminal64.exe: right-click the MT5 shortcut, "
            "choose Open file location, and copy the path from the address bar." % args.terminal
        )
    connected = mt5.initialize(path=args.terminal) if args.terminal else mt5.initialize()
    try:
        if not connected:
            code, message = _last_error(mt5)
            raise Stop(
                "Could not connect to MetaTrader 5 (error %s: %s). Open MT5 on this PC, log in to the account and "
                "wait until it shows prices, then run this again. If it still fails, or more than one MT5 is "
                'installed, give the full path to the right one: --terminal "C:\\Program Files\\...\\terminal64.exe" '
                "(right-click the MT5 shortcut and choose Open file location to find it)." % (code, message)
            )
        return _read(mt5, args, tf_name, clock, sleep, say)
    finally:
        mt5.shutdown()


def _read(mt5, args, tf_name, clock, sleep, say):
    account = _account(mt5, args.login)
    currency = account["currency"]
    say("Connected to MT5. Account currency: %s." % currency)

    deals = _deals(mt5, clock)
    if not deals:
        raise Stop("The terminal returned no deals for this account. " + DOWNLOAD_HISTORY)
    first_use = {}
    for d in deals:
        if d["type"] in TRADES:
            first_use[d["symbol"]] = min(first_use.get(d["symbol"], d["time"]), d["time"])
    traded = sorted(first_use)
    times = [d["time"] for d in deals]
    say("Read %d deals, %s to %s." % (len(deals), _day(min(times)), _day(max(times))))

    specs = {name: _spec(mt5, name) for name in traded}
    timeframe = _timeframe(mt5, tf_name)
    warnings = []
    bars = {}
    if traded:
        say(
            "Loading %s prices for %d symbols. The terminal may take a moment to download them..."
            % (tf_name, len(traded))
        )
    for name in traded:
        bars[name] = _bars(mt5, name, timeframe, first_use[name], clock, sleep)
        if not bars[name]:
            raise _no_bars(name, first_use[name], tf_name)
        late = _late_start(name, bars[name], first_use[name], tf_name, "its first trade")
        if late:
            warnings.append(late)

    # Each profit currency that is not the account's needs a pair to convert
    # it, loaded from the first trade that needs one.
    needing = [name for name in traded if specs[name]["profit"] != currency]
    catalogue = None
    if needing:
        catalogue = [(s.name, s.currency_base, s.currency_profit, bool(s.visible)) for s in (mt5.symbols_get() or ())]
        convert_from = min(first_use[name] for name in needing)
    for name in needing:
        profit = specs[name]["profit"]
        ranked = rank_conversions(name, profit, currency, catalogue)
        if not ranked:
            raise Stop(
                "The account is in %s, but %s pays its profit in %s, and this terminal lists no %s%s or %s%s symbol "
                "to convert %s into %s, so the history cannot be valued. %s"
                % (currency, name, profit, profit, currency, currency, profit, profit, currency, SEND_BACK)
            )
        chosen = None
        for candidate, _mode in ranked[:3]:
            have = bars.get(candidate)
            if not have or have[0][0] > first_use[name]:
                if candidate not in specs:
                    spec = _spec(mt5, candidate, required=False)
                    if spec is None:
                        continue
                    specs[candidate] = spec
                need = min(convert_from, first_use.get(candidate, convert_from))
                rows = _bars(mt5, candidate, timeframe, need, clock, sleep)
                if rows:
                    bars[candidate] = rows
            if bars.get(candidate):
                chosen = candidate
                break
        if chosen is None:
            raise _no_bars(ranked[0][0], first_use[name], tf_name)
        late = _late_start(chosen, bars[chosen], first_use[name], tf_name, "the first %s trade it converts" % name)
        if late and late not in warnings:
            warnings.append(late)
    for name in [n for n in specs if n not in bars]:
        del specs[name]

    watched = sorted(bars)
    if args.utc_offset is not None:
        offset_s = server_offset([], args.utc_offset)
        say("Server clock: %s, from --utc-offset." % utc_label(offset_s))
    elif watched:
        say("Reading the broker server's clock from live prices (up to %d seconds)..." % CLOCK_WAIT_S)
        offset_s = server_offset(_watch_prices(mt5, watched, clock, sleep))
        say("Server clock: %s, read from live prices." % utc_label(offset_s))
    else:
        # Nothing was ever traded, so there are no points to place in time
        # and the file is the headline alone.
        offset_s = 0

    # The account may be trading while this runs, so the deals, positions,
    # account and prices the check compares are read again, together, last.
    deals = _deals(mt5, clock)
    open_swaps, open_volumes = _positions(mt5)
    account = _account(mt5, args.login)
    ticks = _ticks(mt5, watched)
    now_s = clock()
    new = sorted({d["symbol"] for d in deals if d["type"] in TRADES} - set(traded))
    if new:
        raise Stop("A trade on %s was booked while the script was reading. Run it again." % new[0])
    bad = unexplained_positions(deals, open_volumes)
    if bad:
        raise Stop(
            "%d open position(s) do not match the deal history (for example #%s). Either a trade was booked while "
            "the script was reading, or the terminal has not downloaded the whole history. %s"
            % (len(bad), bad[0], DOWNLOAD_HISTORY)
        )

    return {
        "account": account,
        "deals": deals,
        "specs": specs,
        "bars": bars,
        "open_swaps": open_swaps,
        "ticks": ticks,
        "offset_s": offset_s,
        "now_s": now_s,
        "tf_seconds": TIMEFRAMES[tf_name],
        "tf_name": tf_name,
        "warnings": warnings,
    }


# ---------------------------------------------------------------------------
# The command


def parse_args(argv=None):
    parser = argparse.ArgumentParser(
        prog="mt5_history.py",
        description=(
            "Writes this account's exact $KJC history, percentages only, from the MT5 terminal on this PC. "
            "It only reads: it never trades."
        ),
    )
    parser.add_argument("--out", help="where to write the file (default: kjc-history.json next to this script)")
    parser.add_argument(
        "--timeframe",
        default="H1",
        choices=sorted(TIMEFRAMES, key=TIMEFRAMES.get),
        help="the price bars to rebuild on (default H1, one point an hour)",
    )
    parser.add_argument("--terminal", help="full path to terminal64.exe, when more than one MT5 is installed")
    parser.add_argument(
        "--login", type=int, help="the account MT5 must be logged in to; the script stops on any other"
    )
    parser.add_argument(
        "--utc-offset",
        type=float,
        metavar="HOURS",
        help="the broker server's hours ahead of UTC, such as 3; needed only while the market is shut",
    )
    args = parser.parse_args(argv)
    if args.utc_offset is not None and not -12 <= args.utc_offset <= 14:
        parser.error("--utc-offset is the server's hours ahead of UTC, from -12 to 14")
    return args


def _write(path, text):
    # Written beside the target and moved over it, so a failed run never
    # leaves half a file where the last good one was.
    part = path + ".part"
    try:
        with open(part, "w", encoding="utf-8", newline="\n") as handle:
            handle.write(text)
        os.replace(part, path)
    except OSError as error:
        try:
            os.remove(part)
        except OSError:
            pass
        raise Stop(
            "Could not write %s (%s). Close any program that has it open, or choose another place with --out."
            % (path, error.strerror or error)
        )


def _when(at):
    return at[:16].replace("T", " ") + " UTC"


def _money(value, currency):
    return "%s %s" % (format(value, ",.2f"), currency)


def _summary(say, data, result, out):
    feed = result["feed"]
    series = feed["series"]
    currency = data["account"]["currency"]
    tf_name = data.get("tf_name", "H1")
    say("Rebuilt %d %s points." % (result["rows"], tf_name))
    if result["skipped"]:
        say("Left out %d more, where a price was missing or over a week old (never guessed)." % result["skipped"])
    for warning in data.get("warnings", ()):
        say("WARNING: " + warning)

    rebuilt, reported, difference = result["check"]
    if rebuilt is None:
        check = "skipped, because a current price was missing (terminal reports %s open)." % _money(
            reported, currency
        )
        off = False
    else:
        share = abs(difference) / result["capital"]
        off = share > WARN_SHARE
        check = "open profit rebuilt from the deals %s, terminal %s, difference %s (%.3f%% of net deposits). %s" % (
            _money(rebuilt, currency),
            _money(reported, currency),
            _money(difference, currency),
            share * 100,
            "WARNING" if off else "OK",
        )

    say("")
    say("Account currency: %s" % currency)
    say("$KJC now:         %+.4f%%" % feed["pct"])
    say("History:          %s to %s, %d points" % (_when(series[0]["at"]), _when(series[-1]["at"]), len(series)))
    say("Check:            " + check)
    say("Written:          " + out)
    if off:
        say("")
        say(
            "WARNING: the open profit rebuilt from the deals is more than %.1f%% of net deposits away from the "
            "terminal's, so a price, contract size or conversion was read wrongly. The file was still written; "
            "mention this warning when you send it." % (WARN_SHARE * 100)
        )
    say("")
    say("Send that file back. It holds times and percentages and nothing else.")


def main(argv=None, clock=time.time, sleep=time.sleep, say=print):
    args = parse_args(argv)
    out = os.path.abspath(args.out or os.path.join(os.path.dirname(os.path.abspath(__file__)), "kjc-history.json"))
    try:
        import MetaTrader5 as mt5
    except Exception as error:
        say(
            "STOPPED: the MetaTrader5 package will not load in this Python (%s). Run  py -m pip install --upgrade "
            "MetaTrader5  and then run this again. It needs Windows and the 64-bit Python from python.org." % error
        )
        return 1
    try:
        data = load_from_terminal(mt5, args, clock=clock, sleep=sleep, say=say)
        result = history_from(data)
        _write(out, dumps_feed(result["feed"]))
    except Stop as problem:
        say("")
        say("STOPPED: %s" % problem)
        say("Nothing was written.")
        return 1
    except Exception:
        say(traceback.format_exc())
        say(
            "Something unexpected went wrong, and nothing was written. Send the text in this window back to "
            "whoever asked you to run the script."
        )
        return 1
    _summary(say, data, result, out)
    return 0


def _own_window():
    # A double-clicked script gets a console of its own that closes the
    # moment it ends, taking any message with it. Only this process and the
    # py launcher are attached to such a console; a Command Prompt adds itself.
    if os.name != "nt" or not sys.stdin or not sys.stdin.isatty():
        return False
    try:
        import ctypes

        ids = (ctypes.c_uint * 4)()
        return 0 < ctypes.windll.kernel32.GetConsoleProcessList(ids, 4) <= 2
    except Exception:
        return False


if __name__ == "__main__":
    try:
        code = main()
    except SystemExit as exit_:
        code = exit_.code
    except KeyboardInterrupt:
        print("\nStopped. Nothing was written.")
        code = 1
    if _own_window():
        input("\nPress Enter to close this window.")
    sys.exit(code)
