"""Tests for scripts/mt5_history.py. From the repository root:

    python3 -m unittest scripts/test_mt5_history.py

They need neither MetaTrader5 nor numpy. The rebuild is plain functions of
plain data, and the terminal is a fake that answers as the real package does:
namedtuples for deals, positions, symbols, ticks and the account, and rows
read by field name for the price bars.
"""

import json
import os
import re
import subprocess
import sys
import tempfile
import unittest
from collections import namedtuple
from types import SimpleNamespace
from unittest import mock

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPT = os.path.join(HERE, "mt5_history.py")
sys.path.insert(0, HERE)

import mt5_history as m  # noqa: E402

H = 3600
D = 86400
T0 = 1749996000  # on the hour, server clock
CAPITAL = 100000.0

SPECS = {
    "EURUSD": {"contract": 100000.0, "base": "EUR", "profit": "USD", "point": 0.00001},
    "GBPUSD": {"contract": 100000.0, "base": "GBP", "profit": "USD", "point": 0.00001},
    "EURJPY": {"contract": 100000.0, "base": "EUR", "profit": "JPY", "point": 0.001},
    "USDJPY": {"contract": 100000.0, "base": "USD", "profit": "JPY", "point": 0.001},
    "AUDNZD": {"contract": 100000.0, "base": "AUD", "profit": "NZD", "point": 0.00001},
    "NZDUSD": {"contract": 100000.0, "base": "NZD", "profit": "USD", "point": 0.00001},
}

# The only MetaTrader5 functions the script may call. Every one of them reads.
ALLOWED = {
    "initialize",
    "shutdown",
    "last_error",
    "account_info",
    "history_deals_get",
    "positions_get",
    "symbols_get",
    "symbol_info",
    "symbol_info_tick",
    "symbol_select",
    "copy_rates_range",
}


def deal(ticket, t, kind, symbol="", volume=0.0, price=0.0, profit=0.0, swap=0.0, position_id=0, entry=None):
    return {
        "ticket": ticket,
        "position_id": position_id,
        "time": t,
        "type": kind,
        "entry": entry,
        "symbol": symbol,
        "volume": volume,
        "price": price,
        "profit": profit,
        "swap": swap,
        "commission": 0.0,
        "fee": 0.0,
    }


def deposit(ticket, t, amount=CAPITAL):
    return deal(ticket, t, "balance", profit=amount)


def hourly(start, hours, close, spread=0):
    """Bars opening every hour from start: (open time, close, spread in points)."""
    return [(start + i * H, close, spread) for i in range(hours)]


def row_at(rows, t):
    found = [r for r in rows if r[0] == t]
    return found[0] if found else None


class RebuildTest(unittest.TestCase):
    def test_jpy_profit_converts_through_a_usdjpy_style_symbol(self):
        deals = [deposit(1, T0), deal(2, T0 + 1800, "buy", "EURJPY", 1.0, 160.0, position_id=10, entry="in")]
        bars = {"EURJPY": hourly(T0 - 2 * H, 12, 161.0, 20), "USDJPY": hourly(T0 - 2 * H, 12, 150.0, 10)}
        rows = m.rebuild(deals, bars, SPECS, "USD", {}, T0 + 9 * H, H)
        # Every EURJPY close after the first deal, up to the end.
        self.assertEqual([r[0] for r in rows], [T0 + i * H for i in range(1, 10)])
        t, balance, equity = rows[0]
        self.assertEqual(balance, CAPITAL)
        # 1 lot up 1.00 yen is 100,000 JPY, divided by USDJPY's 150.
        self.assertAlmostEqual(equity, CAPITAL + 100000.0 / 150.0, places=6)

    def test_a_short_is_marked_at_the_ask(self):
        deals = [deposit(1, T0), deal(2, T0 + 600, "sell", "EURUSD", 1.0, 1.1000, position_id=20, entry="in")]
        bars = {"EURUSD": hourly(T0 - 2 * H, 6, 1.0950, 15)}
        _t, _b, equity = m.rebuild(deals, bars, SPECS, "USD", {}, T0 + 3 * H, H)[0]
        # Ask = bid 1.09500 + 15 points of 0.00001: the short is up 0.00485.
        self.assertAlmostEqual(equity, CAPITAL + 485.0, places=6)

    def test_a_usd_quoted_pair_needs_no_conversion(self):
        deals = [deposit(1, T0), deal(2, T0 + 600, "buy", "EURUSD", 1.0, 1.0900, position_id=21, entry="in")]
        bars = {"EURUSD": hourly(T0 - 2 * H, 6, 1.0950, 15)}
        rows = m.rebuild(deals, bars, SPECS, "USD", {}, T0 + 3 * H, H)
        # A buy is marked at the bid, and the spread does not touch it.
        self.assertAlmostEqual(rows[0][2], CAPITAL + 500.0, places=6)

    def test_a_cross_multiplies_by_its_profit_currency_against_the_account(self):
        deals = [deposit(1, T0), deal(2, T0 + 600, "buy", "AUDNZD", 1.0, 1.0800, position_id=22, entry="in")]
        bars = {"AUDNZD": hourly(T0 - 2 * H, 6, 1.0900), "NZDUSD": hourly(T0 - 2 * H, 6, 0.6000)}
        rows = m.rebuild(deals, bars, SPECS, "USD", {}, T0 + 3 * H, H)
        # 1,000 NZD at NZDUSD 0.6000.
        self.assertAlmostEqual(rows[0][2], CAPITAL + 600.0, places=6)

    def test_a_partial_close_takes_volume_off_and_keeps_the_open_price(self):
        deals = [
            deposit(1, T0),
            deal(2, T0 + 600, "buy", "EURUSD", 2.0, 1.1000, position_id=30, entry="in"),
            deal(3, T0 + H + 600, "sell", "EURUSD", 1.0, 1.1050, profit=500.0, position_id=30, entry="out"),
            deal(4, T0 + 3 * H + 600, "sell", "EURUSD", 1.0, 1.1100, profit=1000.0, position_id=30, entry="out"),
        ]
        bars = {"EURUSD": hourly(T0 - 2 * H, 10, 1.1100)}
        rows = m.rebuild(deals, bars, SPECS, "USD", {}, T0 + 5 * H, H)
        self.assertEqual(row_at(rows, T0 + H), (T0 + H, CAPITAL, CAPITAL + 2000.0))
        _t, balance, equity = row_at(rows, T0 + 2 * H)
        self.assertEqual(balance, CAPITAL + 500.0)
        self.assertAlmostEqual(equity, CAPITAL + 500.0 + 1000.0, places=6)
        self.assertEqual(row_at(rows, T0 + 4 * H), (T0 + 4 * H, CAPITAL + 1500.0, CAPITAL + 1500.0))

    def test_a_netting_reversal_opens_the_rest_at_its_own_price(self):
        deals = [
            deposit(1, T0),
            deal(2, T0 + 600, "buy", "EURUSD", 1.0, 1.1000, position_id=31, entry="in"),
            deal(3, T0 + 1200, "sell", "EURUSD", 3.0, 1.2000, profit=10000.0, position_id=31, entry="inout"),
        ]
        p = m.positions_now(deals).open[31]
        self.assertEqual((p["q"], p["p0"]), (-2.0, 1.2))
        rows = m.rebuild(deals, {"EURUSD": hourly(T0 - 2 * H, 6, 1.1900)}, SPECS, "USD", {}, T0 + 2 * H, H)
        self.assertAlmostEqual(rows[0][2], CAPITAL + 10000.0 + 2000.0, places=6)

    def test_swap_on_a_closed_position_is_spread_over_its_life(self):
        deals = [
            deposit(1, T0 - H),
            deal(2, T0, "buy", "EURUSD", 1.0, 1.1000, position_id=40, entry="in"),
            deal(3, T0 + 10 * H, "sell", "EURUSD", 1.0, 1.1000, swap=-10.0, position_id=40, entry="out"),
        ]
        rows = m.rebuild(deals, {"EURUSD": hourly(T0 - 3 * H, 18, 1.1000)}, SPECS, "USD", {}, T0 + 12 * H, H)
        self.assertAlmostEqual(row_at(rows, T0 + 4 * H)[2], CAPITAL - 4.0, places=6)
        # Closed: the whole swap is in the balance and nothing accrues on top.
        self.assertEqual(row_at(rows, T0 + 10 * H)[1:], (CAPITAL - 10.0, CAPITAL - 10.0))
        self.assertEqual(row_at(rows, T0 + 11 * H)[1:], (CAPITAL - 10.0, CAPITAL - 10.0))

    def test_swap_on_an_open_position_is_spread_up_to_now(self):
        deals = [deposit(1, T0 - H), deal(2, T0, "buy", "EURUSD", 1.0, 1.1000, position_id=41, entry="in")]
        rows = m.rebuild(deals, {"EURUSD": hourly(T0 - 3 * H, 18, 1.1000)}, SPECS, "USD", {41: -6.0}, T0 + 12 * H, H)
        self.assertAlmostEqual(row_at(rows, T0 + 6 * H)[2], CAPITAL - 3.0, places=6)
        self.assertAlmostEqual(row_at(rows, T0 + 12 * H)[2], CAPITAL - 6.0, places=6)
        self.assertIsNone(row_at(rows, T0 + 13 * H), "a point after the end")

    def test_swap_a_partial_close_booked_is_not_counted_twice(self):
        deals = [
            deposit(1, T0 - H),
            deal(2, T0, "buy", "EURUSD", 2.0, 1.1000, position_id=42, entry="in"),
            deal(3, T0 + 4 * H, "sell", "EURUSD", 1.0, 1.1000, swap=-4.0, position_id=42, entry="out"),
        ]
        rows = m.rebuild(deals, {"EURUSD": hourly(T0 - 3 * H, 18, 1.1000)}, SPECS, "USD", {42: -8.0}, T0 + 12 * H, H)
        # 12 of swap in all, half of it accrued by T0+6h: 4 booked, 2 still open.
        _t, balance, equity = row_at(rows, T0 + 6 * H)
        self.assertEqual(balance, CAPITAL - 4.0)
        self.assertAlmostEqual(equity, CAPITAL - 6.0, places=6)
        self.assertAlmostEqual(row_at(rows, T0 + 12 * H)[2], CAPITAL - 12.0, places=6)

    def test_credit_is_left_out(self):
        deals = [
            deposit(1, T0),
            deal(2, T0 + 300, "credit", profit=5000.0),
            deal(3, T0 + 600, "buy", "EURUSD", 1.0, 1.1000, position_id=50, entry="in"),
        ]
        rows = m.rebuild(deals, {"EURUSD": hourly(T0 - 2 * H, 6, 1.1000)}, SPECS, "USD", {}, T0 + 3 * H, H)
        self.assertTrue(rows)
        self.assertTrue(all(r[1:] == (CAPITAL, CAPITAL) for r in rows))
        self.assertTrue(all(pct == 0.0 for _t, pct in m.kjc_points(rows, deals)))
        account = {"currency": "USD", "balance": CAPITAL, "equity": CAPITAL + 5000.0, "credit": 5000.0, "profit": 0.0}
        self.assertEqual(m.headline_pct(account, m.net_deposits(deals)), 0.0)

    def test_a_missing_or_stale_price_leaves_the_point_out(self):
        base = [
            deposit(1, T0),
            # A GBPUSD round trip gives the grid every GBPUSD close.
            deal(2, T0 + 60, "buy", "GBPUSD", 1.0, 1.3, position_id=2, entry="in"),
            deal(3, T0 + 120, "sell", "GBPUSD", 1.0, 1.3, position_id=2, entry="out"),
        ]
        gbpusd = hourly(T0 - 2 * H, 10 * 24, 1.3)

        with self.subTest("stale: EURUSD's last bar closed at T0+2h"):
            deals = base + [deal(4, T0 + 600, "buy", "EURUSD", 1.0, 1.1, position_id=60, entry="in")]
            bars = {"GBPUSD": gbpusd, "EURUSD": hourly(T0 - 2 * H, 4, 1.1)}
            skipped = []
            rows = m.rebuild(deals, bars, SPECS, "USD", {}, T0 + 9 * D, H, skipped)
            self.assertEqual(rows[-1][0], T0 + 2 * H + 7 * D)
            self.assertEqual(skipped[0], T0 + 3 * H + 7 * D)
            self.assertEqual(len(rows) + len(skipped), 9 * 24)

        with self.subTest("missing: EURUSD's bars begin after the trade"):
            deals = base + [deal(4, T0 + 600, "buy", "EURUSD", 1.0, 1.1, position_id=61, entry="in")]
            bars = {"GBPUSD": gbpusd, "EURUSD": hourly(T0 + 5 * H, 24, 1.1)}
            skipped = []
            rows = m.rebuild(deals, bars, SPECS, "USD", {}, T0 + 12 * H, H, skipped)
            self.assertEqual(skipped, [T0 + i * H for i in range(1, 6)])
            self.assertEqual(rows[0][0], T0 + 6 * H)

        with self.subTest("missing: no conversion prices for JPY"):
            deals = base + [deal(4, T0 + 600, "buy", "EURJPY", 1.0, 160.0, position_id=62, entry="in")]
            bars = {"GBPUSD": gbpusd, "EURJPY": hourly(T0 - 2 * H, 24, 161.0)}
            skipped = []
            rows = m.rebuild(deals, bars, SPECS, "USD", {}, T0 + 12 * H, H, skipped)
            self.assertEqual(rows, [])
            self.assertEqual(len(skipped), 12)


class KjcPointsTest(unittest.TestCase):
    def test_capital_is_the_net_deposits_made_by_then(self):
        deals = [
            deal(1, 50, "credit", profit=999.0),
            deposit(2, 100, 1000.0),
            deal(3, 150, "buy", "EURUSD", 1.0, 1.1, profit=0.0, position_id=9, entry="in"),
            deposit(4, 300, 1000.0),
            deposit(5, 500, -500.0),
            deposit(6, 700, -1500.0),
        ]
        rows = [(60, 0.0, 1000.0), (200, 0.0, 1100.0), (400, 0.0, 2200.0), (600, 0.0, 1650.0), (800, 0.0, 10.0)]
        # Before the first deposit and after the last withdrawal there is
        # nothing to divide by, so those points go.
        self.assertEqual(m.kjc_points(rows, deals), [(200, 10.0), (400, 10.0), (600, 10.0)])

    def test_withdrawing_more_than_was_deposited_drops_the_point(self):
        # Profit taken out beyond the deposits leaves negative capital, and a
        # percentage of it would read upside down.
        deals = [deposit(1, 100, 1000.0), deposit(2, 300, -1200.0)]
        self.assertEqual(m.kjc_points([(200, 0.0, 1300.0), (400, 0.0, 100.0)], deals), [(200, 30.0)])

    def test_percentages_are_rounded_to_four_places(self):
        points = m.kjc_points([(200, 0.0, 1000.123456)], [deposit(1, 100, 1000.0)])
        self.assertEqual(points, [(200, 0.0123)])

    def test_the_headline_takes_credit_off_the_terminals_equity(self):
        account = {"currency": "USD", "balance": 0.0, "equity": 117000.0, "credit": 1000.0, "profit": 0.0}
        self.assertEqual(m.headline_pct(account, CAPITAL), 16.0)


class ThinTest(unittest.TestCase):
    TIERS = ((2 * D, None), (30 * D, H), (365 * D, 4 * H), (None, D))

    def tier(self, age):
        for i, (limit, _size) in enumerate(self.TIERS):
            if limit is None or age <= limit:
                return i

    def test_each_age_keeps_the_last_point_of_its_block(self):
        latest = 1760000000 + 37 * 60
        points = [(latest - i * 900, float(i)) for i in range(400 * 96)][::-1]
        kept = m.thin(points)
        self.assertEqual(kept, sorted(kept))
        self.assertEqual(kept[-1], points[-1])
        kept_set = set(kept)

        blocks = {}
        for t, pct in points:
            i = self.tier(latest - t)
            size = self.TIERS[i][1]
            key = (i, t if size is None else t // size)
            blocks[key] = max(blocks.get(key, (t, pct)), (t, pct))
        self.assertEqual(kept_set, set(blocks.values()))

        by_tier = [0, 0, 0, 0]
        for t, _pct in kept:
            by_tier[self.tier(latest - t)] += 1
        # Every 15 minutes for two days; about one an hour, then one in four
        # hours, then one a day.
        self.assertEqual(by_tier[0], 2 * 96 + 1)
        self.assertTrue(28 * 24 <= by_tier[1] <= 28 * 24 + 1)
        self.assertTrue(335 * 6 <= by_tier[2] <= 335 * 6 + 1)
        self.assertTrue(35 <= by_tier[3] <= 36)

    def test_nothing_in_nothing_out(self):
        self.assertEqual(m.thin([]), [])


class ClockTest(unittest.TestCase):
    NOW = 1760000000.0

    def test_the_offset_comes_from_a_price_seen_arriving(self):
        server = self.NOW + 3 * H
        observations = [
            (self.NOW, {"EURUSD": server - 0.4}),
            (self.NOW + 1, {"EURUSD": server + 0.7}),
            (self.NOW + 2, {"EURUSD": server + 1.6}),
        ]
        self.assertEqual(m.server_offset(observations), 3 * H)

    def test_a_half_hour_zone_is_read_too(self):
        server = self.NOW - 3.5 * H
        observations = [(self.NOW + i, {"X": server + i - 0.2}) for i in range(3)]
        self.assertEqual(m.server_offset(observations), int(-3.5 * H))

    def test_a_price_that_never_moves_is_not_fresh(self):
        friday = self.NOW - 30 * H
        observations = [(self.NOW + i, {"EURUSD": friday, "GBPUSD": friday - 5}) for i in range(21)]
        with self.assertRaises(m.Stop) as caught:
            m.server_offset(observations)
        self.assertIn("--utc-offset", str(caught.exception))
        self.assertIn("weekend", str(caught.exception))

    def test_one_catch_up_quote_or_a_new_symbol_is_not_a_live_price(self):
        friday = self.NOW - 30 * H
        observations = [
            (self.NOW, {"EURUSD": friday}),
            (self.NOW + 1, {"EURUSD": friday + 40, "USDJPY": friday + 50}),
            (self.NOW + 2, {"EURUSD": friday + 40, "USDJPY": friday + 50}),
        ]
        self.assertIsNone(m.fresh_tick(observations))

    def test_the_flag_wins(self):
        self.assertEqual(m.server_offset([], 3), 3 * H)
        self.assertEqual(m.server_offset([], 5.5), int(5.5 * H))
        self.assertEqual(m.server_offset([], -4), -4 * H)

    def test_a_pc_clock_a_day_out_is_called_out(self):
        observations = [(self.NOW + i, {"X": self.NOW + 20 * H + i}) for i in range(3)]
        with self.assertRaises(m.Stop) as caught:
            m.server_offset(observations)
        self.assertIn("Set time automatically", str(caught.exception))

    def test_labels(self):
        self.assertEqual([m.utc_label(s) for s in (0, 3 * H, -4 * H, int(5.5 * H))], ["UTC", "UTC+3", "UTC-4", "UTC+5:30"])

    def test_output_times_are_server_times_less_the_offset(self):
        deals = [deposit(1, T0), deal(2, T0 + 600, "buy", "EURUSD", 1.0, 1.1, position_id=7, entry="in")]
        data = {
            "account": {"currency": "USD", "balance": CAPITAL, "equity": CAPITAL, "credit": 0.0, "profit": 0.0},
            "deals": deals,
            "specs": SPECS,
            "bars": {"EURUSD": hourly(T0 - 2 * H, 4, 1.1)},
            "open_swaps": {},
            "ticks": {"EURUSD": {"time": T0 + 2 * H, "bid": 1.1, "ask": 1.1}},
            "offset_s": 3 * H,
            "now_s": T0 + 2 * H - 3 * H + 120.5,
            "tf_seconds": H,
        }
        series = m.history_from(data)["feed"]["series"]
        # Bars closed at server T0+1h and T0+2h: UTC three hours earlier.
        self.assertEqual([p["at"] for p in series[:2]], [m.iso_utc(T0 - 2 * H), m.iso_utc(T0 - H)])
        self.assertEqual(series[-1]["at"], m.iso_utc(data["now_s"]))


class ConversionTest(unittest.TestCase):
    CATALOGUE = [
        ("USDJPY", "USD", "JPY", True),
        ("USDJPYm", "USD", "JPY", True),
        ("USDJPY.r", "USD", "JPY", False),
        ("EURJPY.r", "EUR", "JPY", True),
        ("NZDUSD", "NZD", "USD", True),
        ("NZDUSD.r", "NZD", "USD", True),
    ]

    def test_the_traded_symbols_suffix_wins(self):
        self.assertEqual(m.rank_conversions("EURJPY.r", "JPY", "USD", self.CATALOGUE)[0], ("USDJPY.r", "div"))
        self.assertEqual(m.rank_conversions("AUDNZD.r", "NZD", "USD", self.CATALOGUE)[0], ("NZDUSD.r", "mul"))
        self.assertEqual(m.rank_conversions("EURJPY", "JPY", "USD", self.CATALOGUE)[0], ("USDJPY", "div"))

    def test_without_the_suffix_any_will_do(self):
        self.assertEqual(m.rank_conversions("EURJPY.ecn", "JPY", "USD", self.CATALOGUE)[0], ("USDJPY", "div"))

    def test_the_same_currency_needs_none_and_an_unknown_one_finds_none(self):
        self.assertEqual(m.rank_conversions("EURUSD", "USD", "USD", self.CATALOGUE), [(None, "same")])
        self.assertEqual(m.rank_conversions("USDCHF", "CHF", "USD", self.CATALOGUE), [])


class FeedTest(unittest.TestCase):
    def test_the_file_has_exactly_as_at_pct_and_series_of_at_and_pct(self):
        now = 1760000000.25
        feed = m.build_feed([(now - 2 * H, 1.5), (now - H, -0.25)], now, 2.125)
        self.assertEqual(set(feed), {"as_at", "pct", "series"})
        self.assertEqual(feed["as_at"], "2025-10-09T08:53:20.250Z")
        self.assertEqual(feed["pct"], 2.125)
        for point in feed["series"]:
            self.assertEqual(set(point), {"at", "pct"})
            self.assertRegex(point["at"], r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$")
        self.assertEqual(feed["series"][-1], {"at": feed["as_at"], "pct": 2.125})
        self.assertEqual([p["pct"] for p in feed["series"]], [1.5, -0.25, 2.125])

        text = m.dumps_feed(feed)
        self.assertEqual(json.loads(text), feed)
        self.assertEqual(text.count("\n"), len(feed["series"]) + 2, "one point per line")

    def test_iso_utc(self):
        self.assertEqual(m.iso_utc(0), "1970-01-01T00:00:00.000Z")
        self.assertEqual(m.iso_utc(T0 + 1.25), "2025-06-15T14:00:01.250Z")


# ---------------------------------------------------------------------------
# A fake terminal


TradeDeal = namedtuple(
    "TradeDeal",
    "ticket order time time_msc type entry magic position_id reason volume price commission swap profit fee symbol comment external_id",
)
TradePosition = namedtuple("TradePosition", "ticket time type magic identifier volume price_open price_current swap profit symbol")
SymbolInfo = namedtuple("SymbolInfo", "name currency_base currency_profit trade_contract_size point digits visible")
Tick = namedtuple("Tick", "time bid ask last volume time_msc")
AccountInfo = namedtuple("AccountInfo", "login currency balance credit profit equity server")


class FakeClock:
    def __init__(self, now):
        self.now = now

    def __call__(self):
        return self.now

    def sleep(self, seconds):
        self.now += seconds


class FakeMT5:
    """Answers like the MetaTrader5 package, with nothing but the read functions it allows."""

    DEAL_TYPE_BUY, DEAL_TYPE_SELL, DEAL_TYPE_BALANCE, DEAL_TYPE_CREDIT = 0, 1, 2, 3
    DEAL_ENTRY_IN, DEAL_ENTRY_OUT, DEAL_ENTRY_INOUT, DEAL_ENTRY_OUT_BY = 0, 1, 2, 3
    POSITION_TYPE_BUY, POSITION_TYPE_SELL = 0, 1
    TIMEFRAME_M1, TIMEFRAME_M5, TIMEFRAME_M15, TIMEFRAME_M30 = 1, 5, 15, 30
    TIMEFRAME_H1, TIMEFRAME_H4, TIMEFRAME_D1 = 16385, 16388, 16408
    LOGIN = 5550001
    OFFSET = 3 * H

    def __init__(self, clock, live=True):
        self.clock = clock
        self.live = live
        self.calls = []
        self.connects = True
        self.logged_in = True
        self.not_ready = {"USDJPY.r": 1}  # first request comes back empty
        self.no_history = set()
        self.extra_positions = []
        server_now = clock.now + self.OFFSET
        self.start = int(server_now - 10 * D) // H * H
        s = self.start
        self.deals = [
            TradeDeal(1, 0, s, s * 1000, 2, 0, 0, 0, 0, 0.0, 0.0, 0.0, 0.0, CAPITAL, 0.0, "", "deposit", ""),
            TradeDeal(2, 0, s + 600, (s + 600) * 1000, 3, 0, 0, 0, 0, 0.0, 0.0, 0.0, 0.0, 1000.0, 0.0, "", "credit", ""),
            TradeDeal(3, 11, s + 1800, (s + 1800) * 1000, 0, 0, 0, 100, 0, 1.0, 160.0, -2.0, 0.0, 0.0, 0.0, "EURJPY.r", "", ""),
            TradeDeal(4, 12, s + 2 * H, (s + 2 * H) * 1000, 1, 0, 0, 101, 0, 0.5, 1.1050, 0.0, 0.0, 0.0, 0.0, "EURUSD.r", "", ""),
            TradeDeal(5, 13, s + 5 * H, (s + 5 * H) * 1000, 0, 1, 0, 101, 0, 0.5, 1.1000, 0.0, 0.0, 250.0, 0.0, "EURUSD.r", "", ""),
        ]
        self.symbols = [
            SymbolInfo("EURJPY.r", "EUR", "JPY", 100000.0, 0.001, 3, True),
            SymbolInfo("EURUSD.r", "EUR", "USD", 100000.0, 0.00001, 5, True),
            SymbolInfo("EURUSD", "EUR", "USD", 100000.0, 0.00001, 5, True),
            SymbolInfo("USDJPY", "USD", "JPY", 100000.0, 0.001, 3, True),
            SymbolInfo("USDJPYm", "USD", "JPY", 100000.0, 0.001, 3, True),
            SymbolInfo("USDJPY.r", "USD", "JPY", 100000.0, 0.001, 3, False),
        ]
        self.prices = {"EURJPY.r": (161.0, 20), "EURUSD.r": (1.1, 10), "EURUSD": (1.1, 10)}
        for name in ("USDJPY", "USDJPYm", "USDJPY.r"):
            self.prices[name] = (150.0, 10)
        balance = CAPITAL - 2.0 + 250.0
        self.swap = -3.0
        self.profit = 100000.0 / 150.005 + self.swap
        self.account = AccountInfo(self.LOGIN, "USD", balance, 1000.0, self.profit, balance + 1000.0 + self.profit, "Broker-Live")

    def _record(self, name, *args):
        self.calls.append((name, args))

    def initialize(self, path=None):
        self._record("initialize", path)
        return self.connects

    def shutdown(self):
        self._record("shutdown")

    def last_error(self):
        self._record("last_error")
        return (-10005, "IPC timeout") if not self.connects else (1, "Success")

    def account_info(self):
        self._record("account_info")
        return self.account if self.logged_in else None

    def history_deals_get(self, date_from, date_to):
        self._record("history_deals_get", date_from, date_to)
        return tuple(self.deals)

    def positions_get(self):
        self._record("positions_get")
        s = self.start
        return (TradePosition(100, s + 1800, 0, 0, 100, 1.0, 160.0, 161.0, self.swap, 666.0, "EURJPY.r"),) + tuple(self.extra_positions)

    def symbols_get(self):
        self._record("symbols_get")
        return tuple(self.symbols)

    def symbol_info(self, name):
        self._record("symbol_info", name)
        return next((s for s in self.symbols if s.name == name), None)

    def symbol_select(self, name, enable):
        self._record("symbol_select", name, enable)
        return True

    def symbol_info_tick(self, name):
        self._record("symbol_info_tick", name)
        if name not in self.prices:
            return None
        bid, spread = self.prices[name]
        point = self.symbol_info(name).point
        t = self.clock.now + self.OFFSET - 0.2 if self.live else self.start + 9 * D
        return Tick(int(t), bid, bid + spread * point, 0.0, 0, int(t * 1000))

    def copy_rates_range(self, name, timeframe, date_from, date_to):
        self._record("copy_rates_range", name, timeframe, date_from, date_to)
        if self.not_ready.get(name, 0) > 0:
            self.not_ready[name] -= 1
            return None
        if name in self.no_history or name not in self.prices:
            return None
        close, spread = self.prices[name]
        last = int(self.clock.now + self.OFFSET) // H * H
        first = self.start - 9 * D
        lo, hi = date_from.timestamp(), date_to.timestamp()
        return [
            {"time": t, "open": close, "high": close, "low": close, "close": close, "tick_volume": 10, "spread": spread, "real_volume": 0}
            for t in range(first, last + 1, H)
            if lo <= t <= hi
        ]

    def called(self, name):
        return [args for n, args in self.calls if n == name]


def args(**overrides):
    values = {"terminal": None, "login": None, "utc_offset": None, "timeframe": "H1", "out": None}
    values.update(overrides)
    return SimpleNamespace(**values)


def quiet(*_args):
    pass


class TerminalTest(unittest.TestCase):
    def setUp(self):
        self.clock = FakeClock(1760000000.0)
        self.mt5 = FakeMT5(self.clock)

    def load(self, **overrides):
        return m.load_from_terminal(self.mt5, args(**overrides), clock=self.clock, sleep=self.clock.sleep, say=quiet)

    def stop(self, **overrides):
        with self.assertRaises(m.Stop) as caught:
            self.load(**overrides)
        self.assertEqual(self.mt5.calls[-1][0], "shutdown", "the terminal is let go even on a stop")
        return str(caught.exception)

    def test_reads_the_terminal_into_plain_data(self):
        data = self.load(login=FakeMT5.LOGIN)
        s = self.mt5.start
        self.assertEqual([d["type"] for d in data["deals"]], ["balance", "credit", "buy", "sell", "buy"])
        self.assertEqual([d["entry"] for d in data["deals"]], [None, None, "in", "in", "out"])
        self.assertEqual(data["deals"][2]["time"], s + 1800)
        self.assertEqual(data["deals"][2]["commission"], -2.0)
        self.assertEqual(set(data["account"]), {"currency", "balance", "equity", "credit", "profit"})
        self.assertEqual(data["open_swaps"], {100: -3.0})
        self.assertEqual(data["offset_s"], 3 * H)
        self.assertEqual(data["tf_seconds"], H)

        # EURJPY.r converts through the USDJPY with its own suffix, hidden
        # from Market Watch until the script adds it, not the visible ones.
        self.assertEqual(set(data["specs"]), {"EURJPY.r", "EURUSD.r", "USDJPY.r"})
        self.assertEqual(data["specs"]["USDJPY.r"], {"contract": 100000.0, "base": "USD", "profit": "JPY", "point": 0.001})
        self.assertEqual(self.mt5.called("symbol_select"), [("USDJPY.r", True)])
        self.assertEqual(set(data["bars"]), {"EURJPY.r", "EURUSD.r", "USDJPY.r"})
        # Its history was not there on the first ask, so it was asked again.
        self.assertEqual(len([a for a in self.mt5.called("copy_rates_range") if a[0] == "USDJPY.r"]), 2)
        bars = data["bars"]["USDJPY.r"]
        # Asked from eight days before the first JPY trade (s + 30 minutes).
        self.assertEqual(bars[0], (s + H - 8 * D, 150.0, 10))
        self.assertEqual([b[0] for b in bars], sorted(b[0] for b in bars))
        self.assertEqual(data["ticks"]["EURJPY.r"]["bid"], 161.0)

        names = {name for name, _args in self.mt5.calls}
        self.assertLessEqual(names, ALLOWED)
        self.assertEqual(self.mt5.calls[0][0], "initialize")
        self.assertEqual(self.mt5.calls[-1][0], "shutdown")

    def test_the_history_and_check_come_out_of_it(self):
        result = m.history_from(self.load())
        rebuilt, reported, difference = result["check"]
        self.assertAlmostEqual(rebuilt, self.mt5.profit, places=6)
        self.assertAlmostEqual(difference, 0.0, places=6)
        feed = result["feed"]
        s = self.mt5.start
        self.assertEqual(feed["series"][0]["at"], m.iso_utc(s + H - 3 * H))
        self.assertEqual(feed["series"][-1], {"at": feed["as_at"], "pct": feed["pct"]})
        equity = self.mt5.account.equity - self.mt5.account.credit
        self.assertEqual(feed["pct"], round((equity - CAPITAL) / CAPITAL * 100, 4))
        self.assertEqual(result["skipped"], 0)

    def test_terminal_path_is_passed_only_when_given(self):
        self.load()
        self.assertEqual(self.mt5.called("initialize"), [(None,)])
        with tempfile.NamedTemporaryFile(suffix=".exe") as exe:
            self.mt5.calls = []
            self.load(terminal=exe.name)
            self.assertEqual(self.mt5.called("initialize"), [(exe.name,)])

    def test_a_terminal_path_that_is_not_there(self):
        with self.assertRaises(m.Stop) as caught:
            self.load(terminal=os.path.join(HERE, "no-such-terminal64.exe"))
        self.assertIn("There is no file at", str(caught.exception))
        self.assertEqual(self.mt5.calls, [], "nothing is asked of the terminal")

    def test_terminal_not_running(self):
        self.mt5.connects = False
        message = self.stop()
        self.assertIn("-10005", message)
        self.assertIn("Open MT5", message)
        self.assertIn("--terminal", message)

    def test_not_logged_in(self):
        self.mt5.logged_in = False
        self.assertIn("not logged in", self.stop())

    def test_the_wrong_login(self):
        message = self.stop(login=12345678)
        self.assertIn("logged in to account 5550001, not 12345678", message)
        self.assertIn("Login to Trade Account", message)

    def test_no_history_downloaded(self):
        self.mt5.deals = []
        self.assertIn("All History", self.stop())

    def test_no_prices_for_a_traded_symbol(self):
        self.mt5.no_history.add("EURUSD.r")
        message = self.stop()
        self.assertIn("no H1 prices for EURUSD.r", message)
        self.assertIn("chart", message)

    def test_no_conversion_symbol_names_the_currency(self):
        self.mt5.symbols = [s for s in self.mt5.symbols if not s.name.startswith("USDJPY")]
        message = self.stop()
        self.assertIn("EURJPY.r pays its profit in JPY", message)
        self.assertIn("no JPYUSD or USDJPY symbol", message)

    def test_a_stale_tick_at_the_weekend_needs_the_flag(self):
        self.mt5.live = False
        self.assertIn("--utc-offset", self.stop())
        self.mt5.calls = []
        data = self.load(utc_offset=3)
        self.assertEqual(data["offset_s"], 3 * H)

    def test_positions_the_deals_do_not_explain(self):
        self.mt5.extra_positions = [TradePosition(999, 0, 1, 0, 999, 0.3, 1.1, 1.1, 0.0, 0.0, "EURUSD.r")]
        message = self.stop()
        self.assertIn("do not match the deal history (for example #999)", message)
        self.assertIn("All History", message)


class MainTest(unittest.TestCase):
    def run_main(self, mt5, clock, *argv):
        lines = []
        with mock.patch.dict(sys.modules, {"MetaTrader5": mt5}):
            code = m.main(list(argv), clock=clock, sleep=clock.sleep, say=lines.append)
        return code, "\n".join(lines)

    def test_writes_percentages_only_and_says_so(self):
        clock = FakeClock(1760000000.0)
        mt5 = FakeMT5(clock)
        with tempfile.TemporaryDirectory() as folder:
            out = os.path.join(folder, "kjc-history.json")
            code, said = self.run_main(mt5, clock, "--out", out, "--login", str(FakeMT5.LOGIN))
            self.assertEqual(code, 0, said)
            with open(out, encoding="utf-8") as handle:
                text = handle.read()
            self.assertFalse(os.path.exists(out + ".part"))
        feed = json.loads(text)
        self.assertEqual(set(feed), {"as_at", "pct", "series"})
        self.assertTrue(all(set(p) == {"at", "pct"} for p in feed["series"]))
        # Nothing about the account but its percentages.
        for secret in (str(FakeMT5.LOGIN), "Broker", "EURJPY", "USDJPY", "USD", "%.2f" % mt5.account.balance, "100000"):
            self.assertNotIn(secret, text)
        for line in ("Account currency: USD", "$KJC now:", "History:", "Check:", "OK", "Written:          " + out):
            self.assertIn(line, said)
        self.assertNotIn("WARNING", said)

    def test_a_check_that_is_out_warns_and_still_writes(self):
        clock = FakeClock(1760000000.0)
        mt5 = FakeMT5(clock)
        mt5.account = mt5.account._replace(profit=mt5.profit + 900.0)
        with tempfile.TemporaryDirectory() as folder:
            out = os.path.join(folder, "kjc-history.json")
            code, said = self.run_main(mt5, clock, "--out", out)
            self.assertEqual(code, 0)
            self.assertTrue(os.path.exists(out))
        self.assertIn("WARNING", said)
        self.assertIn("0.900% of net deposits", said)

    def test_a_stop_writes_nothing(self):
        clock = FakeClock(1760000000.0)
        mt5 = FakeMT5(clock)
        mt5.logged_in = False
        with tempfile.TemporaryDirectory() as folder:
            out = os.path.join(folder, "kjc-history.json")
            code, said = self.run_main(mt5, clock, "--out", out)
            self.assertEqual(code, 1)
            self.assertFalse(os.path.exists(out))
        self.assertIn("STOPPED:", said)
        self.assertIn("Nothing was written.", said)

    def test_without_the_package_it_says_how_to_install_it(self):
        lines = []
        with mock.patch.dict(sys.modules, {"MetaTrader5": None}):
            code = m.main(["--out", os.devnull], say=lines.append)
        self.assertEqual(code, 1)
        self.assertIn("py -m pip install --upgrade MetaTrader5", lines[0])

    def test_a_utc_offset_no_zone_has_is_refused(self):
        with mock.patch("sys.stderr"), self.assertRaises(SystemExit):
            m.parse_args(["--utc-offset", "20"])


class GuardTest(unittest.TestCase):
    def setUp(self):
        with open(SCRIPT, encoding="utf-8") as handle:
            self.source = handle.read()

    def test_it_calls_nothing_but_the_read_functions(self):
        used = set(re.findall(r"\bmt5\s*\.\s*([A-Za-z_][A-Za-z0-9_]*)", self.source))
        calls = {name for name in used if not name.isupper()}
        self.assertLessEqual(calls, ALLOWED, "calls a MetaTrader5 function outside the read-only list")
        constants = used - calls
        self.assertTrue(all(re.match(r"^(DEAL_TYPE|DEAL_ENTRY|POSITION_TYPE|TIMEFRAME)_", c) for c in constants), constants)
        for word in ("order_send", "order_check", "order_calc", "orders_get", "history_orders", "positions_total",
                     "orders_total", "market_book", "TRADE_ACTION", "ORDER_TYPE"):
            self.assertNotIn(word, self.source)
        # No way round the list: the package is reached only as mt5.<name>.
        self.assertNotRegex(self.source, r"getattr\(\s*mt5|vars\(\s*mt5|mt5\.__|importlib")
        imports = re.findall(r"^(\s*)import MetaTrader5 as mt5$", self.source, re.M)
        self.assertEqual(len(imports), 1)
        self.assertTrue(imports[0], "MetaTrader5 is imported at the top level, so the module needs it to load")

    def test_it_imports_without_metatrader5_or_numpy(self):
        code = (
            "import sys; sys.modules['MetaTrader5'] = None; sys.modules['numpy'] = None; "
            "sys.path.insert(0, %r); import mt5_history; "
            "print(sorted(n for n in ('MetaTrader5', 'numpy') if sys.modules.get(n) is not None))" % HERE
        )
        done = subprocess.run([sys.executable, "-c", code], capture_output=True, text=True)
        self.assertEqual(done.returncode, 0, done.stderr)
        self.assertEqual(done.stdout.strip(), "[]")

    def test_it_is_plain_ascii(self):
        # A Windows console prints it whatever its code page, and no em dash
        # can slip into what the owner reads.
        self.assertTrue(all(ord(ch) < 128 for ch in self.source))


if __name__ == "__main__":
    unittest.main()
