import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const schemaPath = resolve(here, "..", "supabase", "schema.sql");
const dictPath = resolve(here, "..", "src", "lib", "i18n", "dictionaries", "en.json");

// CI has no Postgres, so these tests read the file. They parse it rather than
// grep it: comments are removed first, so a guard cannot be satisfied (or
// tripped) by prose, and string literals and dollar-quoted bodies are kept
// whole, so a semicolon inside one does not split a statement.
function statementsOf(sql) {
  const statements = [];
  let current = "";
  let i = 0;
  while (i < sql.length) {
    const ch = sql[i];
    const next = sql[i + 1];
    if (ch === "-" && next === "-") {
      const end = sql.indexOf("\n", i);
      i = end === -1 ? sql.length : end;
      current += " ";
      continue;
    }
    if (ch === "/" && next === "*") {
      const end = sql.indexOf("*/", i + 2);
      if (end === -1) throw new Error("schema.sql: unterminated block comment");
      i = end + 2;
      current += " ";
      continue;
    }
    if (ch === "'" || ch === "\"") {
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === ch && sql[j + 1] === ch) {
          j += 2;
          continue;
        }
        if (sql[j] === ch) break;
        j += 1;
      }
      if (j >= sql.length) throw new Error("schema.sql: unterminated quote");
      current += sql.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    if (ch === "$") {
      const tag = /^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(i));
      if (tag) {
        const end = sql.indexOf(tag[0], i + tag[0].length);
        if (end === -1) throw new Error("schema.sql: unterminated dollar quote");
        current += sql.slice(i, end + tag[0].length);
        i = end + tag[0].length;
        continue;
      }
    }
    if (ch === ";") {
      statements.push(current);
      current = "";
      i += 1;
      continue;
    }
    current += /\s/.test(ch) ? " " : ch;
    i += 1;
  }
  statements.push(current);
  return statements.map((s) => s.replace(/\s+/g, " ").trim()).filter(Boolean);
}

// Splits on commas that are not inside parentheses or quotes.
function splitTopLevel(text) {
  const parts = [];
  let depth = 0;
  let quote = null;
  let start = 0;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quote) {
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === "\"") quote = ch;
    else if (ch === "(") depth += 1;
    else if (ch === ")") depth -= 1;
    else if (ch === "," && depth === 0) {
      parts.push(text.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(text.slice(start).trim());
  return parts.filter(Boolean);
}

// The text inside the parentheses that open at or after `from`.
function parenthesised(text, from = 0) {
  const open = text.indexOf("(", from);
  if (open === -1) return null;
  let depth = 0;
  let quote = null;
  for (let i = open; i < text.length; i += 1) {
    const ch = text[i];
    if (quote) {
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === "\"") quote = ch;
    else if (ch === "(") depth += 1;
    else if (ch === ")") {
      depth -= 1;
      if (depth === 0) return { inner: text.slice(open + 1, i), end: i };
    }
  }
  throw new Error(`unbalanced parentheses in: ${text}`);
}

const squash = (s) => s.toLowerCase().replace(/\s+/g, "");

function parseSchema(sql) {
  const statements = statementsOf(sql);
  const tables = new Map();
  const policies = [];
  const triggers = [];
  const functions = new Map();
  const enums = new Map();
  const indexes = [];
  const revokes = [];
  const grants = [];

  statements.forEach((stmt, index) => {
    const lower = stmt.toLowerCase();

    const table = /^create table (if not exists )?([a-z_][a-z0-9_]*) \(/i.exec(stmt);
    if (table) {
      const body = parenthesised(stmt, table[0].length - 1);
      const columns = new Map();
      const constraints = [];
      for (const item of splitTopLevel(body.inner)) {
        if (/^(constraint|check|unique|primary key|foreign key|exclude)\b/i.test(item)) {
          constraints.push(item);
        } else {
          const [name, ...rest] = item.split(" ");
          columns.set(name.toLowerCase(), rest.join(" "));
        }
      }
      tables.set(table[2].toLowerCase(), { ifNotExists: Boolean(table[1]), columns, constraints, stmt });
      return;
    }

    const policy = /^create policy ([a-z_][a-z0-9_]*) on ([a-z_][a-z0-9_]*)(.*)$/i.exec(stmt);
    if (policy) {
      const rest = policy[3];
      const usingAt = rest.search(/\busing\s*\(/i);
      const checkAt = rest.search(/\bwith check\s*\(/i);
      // FOR and TO come before the expressions; read them from there only.
      const head = rest.slice(0, Math.min(...[usingAt, checkAt, rest.length].filter((n) => n >= 0)));
      const command = /\bfor (select|insert|update|delete|all)\b/i.exec(head);
      const roles = /\bto ([a-z_][a-z0-9_]*(?:\s*,\s*[a-z_][a-z0-9_]*)*)/i.exec(head);
      policies.push({
        index,
        name: policy[1].toLowerCase(),
        table: policy[2].toLowerCase(),
        command: command ? command[1].toLowerCase() : "all",
        roles: roles ? roles[1].toLowerCase().split(/\s*,\s*/) : ["public"],
        using: usingAt === -1 ? null : parenthesised(rest, usingAt).inner,
        withCheck: checkAt === -1 ? null : parenthesised(rest, checkAt).inner,
        stmt
      });
      return;
    }

    const trigger = /^create trigger ([a-z_][a-z0-9_]*) (before|after|instead of) (.+?) on ([a-z_][a-z0-9_]*) for each (row|statement) execute (?:function|procedure) ([a-z_][a-z0-9_.]*)\(/i.exec(stmt);
    if (trigger) {
      triggers.push({
        index,
        name: trigger[1].toLowerCase(),
        timing: trigger[2].toLowerCase(),
        events: trigger[3].toLowerCase().split(/\s+or\s+/),
        table: trigger[4].toLowerCase(),
        level: trigger[5].toLowerCase(),
        fn: trigger[6].toLowerCase()
      });
      return;
    }

    const fn = /^create (or replace )?function ([a-z_][a-z0-9_.]*)\(/i.exec(stmt);
    if (fn) {
      const body = /\$([a-z_]*)\$([\s\S]*)\$\1\$/i.exec(stmt);
      // Attributes are read from outside the body, so a SET inside it does
      // not count.
      const header = body ? stmt.replace(body[0], "") : stmt;
      functions.set(fn[2].toLowerCase(), {
        orReplace: Boolean(fn[1]),
        setsSearchPath: /\bset search_path\b/i.test(header),
        body: body ? body[2] : ""
      });
      return;
    }

    if (/^do \$/i.test(stmt)) {
      for (const m of stmt.matchAll(/create type ([a-z_][a-z0-9_]*) as enum \(([^)]*)\)/gi)) {
        enums.set(m[1].toLowerCase(), {
          labels: [...m[2].matchAll(/'([^']*)'/g)].map((l) => l[1]),
          guarded: /exception when duplicate_object then null/i.test(stmt)
        });
      }
      return;
    }

    const idx = /^create (unique )?index (if not exists )?([a-z_][a-z0-9_]*) on ([a-z_][a-z0-9_]*) \(/i.exec(stmt);
    if (idx) {
      const cols = parenthesised(stmt, idx[0].length - 1).inner;
      indexes.push({
        ifNotExists: Boolean(idx[2]),
        name: idx[3].toLowerCase(),
        table: idx[4].toLowerCase(),
        leading: splitTopLevel(cols)[0].split(" ")[0].toLowerCase()
      });
      return;
    }

    const revoke = /^revoke (.+?) on (?:table )?(.+?) from (.+)$/i.exec(stmt);
    if (revoke) {
      revokes.push({
        privileges: revoke[1].toLowerCase().split(/\s*,\s*/),
        tables: revoke[2].toLowerCase().split(/\s*,\s*/),
        roles: revoke[3].toLowerCase().split(/\s*,\s*/)
      });
      return;
    }

    if (/^grant\b/.test(lower)) grants.push(stmt);
  });

  return { statements, tables, policies, triggers, functions, enums, indexes, revokes, grants };
}

const sql = await readFile(schemaPath, "utf8");
const dict = JSON.parse(await readFile(dictPath, "utf8"));
const { statements, tables, policies, triggers, functions, enums, indexes, revokes, grants } = parseSchema(sql);

// Every CHECK that touches a column: inline on the column or table-level.
function checksOn(tableName, column) {
  const t = tables.get(tableName);
  const found = [];
  const def = t.columns.get(column) ?? "";
  for (const m of def.matchAll(/\bcheck\s*\(/gi)) found.push(parenthesised(def, m.index).inner);
  for (const c of t.constraints) {
    const at = c.search(/\bcheck\s*\(/i);
    if (at === -1) continue;
    const inner = parenthesised(c, at).inner;
    if (new RegExp(`\\b${column}\\b`, "i").test(inner)) found.push(inner);
  }
  return found;
}

const tokensOf = (name) => name.toLowerCase().split(/[_.]+/).filter(Boolean);

const allColumns = () =>
  [...tables].flatMap(([table, t]) => [...t.columns].map(([column, def]) => ({ table, column, def })));

test("the parser sees the schema it is meant to guard", () => {
  // If this fails the tokenizer has broken, and every test below would pass
  // vacuously on an empty parse.
  for (const name of ["clients", "broker_accounts", "mandates", "mandate_activity", "documents", "fee_charges", "notices", "notice_acknowledgements", "desk_notes", "audit_events"]) {
    assert.ok(tables.has(name), `expected a ${name} table`);
  }
  assert.ok(policies.length >= 10, "expected the read policies");
  assert.ok(triggers.length >= 5, "expected the triggers");
  assert.ok(enums.size >= 5, "expected the enums");
  assert.ok(tables.get("clients").columns.has("us_person"), "expected clients.us_person");
  const count = (re) => statements.filter((s) => re.test(s)).length;
  assert.equal(count(/^create table\b/i), tables.size, "a CREATE TABLE escaped the parser");
  assert.equal(count(/^create policy\b/i), policies.length, "a CREATE POLICY escaped the parser");
  assert.equal(count(/^create trigger\b/i), triggers.length, "a CREATE TRIGGER escaped the parser");
  assert.equal(count(/^create (or replace )?function\b/i), functions.size, "a CREATE FUNCTION escaped the parser");
  assert.equal(count(/^create (unique )?index\b/i), indexes.length, "a CREATE INDEX escaped the parser");
  assert.equal(count(/\bcreate type\b/i), enums.size, "a CREATE TYPE escaped the parser");
});

test("schema.sql is re-runnable (idempotent guards)", () => {
  for (const [name, t] of tables) {
    assert.ok(t.ifNotExists, `create table ${name} is not IF NOT EXISTS`);
  }
  for (const i of indexes) {
    assert.ok(i.ifNotExists, `create index ${i.name} is not IF NOT EXISTS`);
  }
  for (const [name, f] of functions) {
    assert.ok(f.orReplace, `function ${name} is not CREATE OR REPLACE`);
  }
  for (const [name, e] of enums) {
    assert.ok(e.guarded, `enum ${name} is not guarded by a duplicate_object handler`);
  }
  for (const stmt of statements) {
    assert.doesNotMatch(stmt, /^create type\b/i, `unguarded create type: ${stmt.slice(0, 60)}`);
    assert.doesNotMatch(stmt, /^create table (?!if not exists )/i, `not idempotent: ${stmt.slice(0, 60)}`);
    assert.doesNotMatch(stmt, /^create (unique )?index (?!if not exists )/i, `not idempotent: ${stmt.slice(0, 60)}`);
    assert.doesNotMatch(stmt, /^create (?!or replace )(function|view)\b/i, `not idempotent: ${stmt.slice(0, 60)}`);
  }
  for (const p of policies) {
    const dropped = statements.some(
      (s, i) => i < p.index && new RegExp(`^drop policy if exists ${p.name} on ${p.table}$`, "i").test(s)
    );
    assert.ok(dropped, `policy ${p.name} is not preceded by DROP POLICY IF EXISTS`);
  }
  for (const t of triggers) {
    const dropped = statements.some(
      (s, i) => i < t.index && new RegExp(`^drop trigger if exists ${t.name} on ${t.table}$`, "i").test(s)
    );
    assert.ok(dropped, `trigger ${t.name} is not preceded by DROP TRIGGER IF EXISTS`);
  }
});

// The pooled-fund draft was never applied; if it was, its tables are dropped
// by hand. A DROP here would run on every re-apply.
test("schema.sql drops and deletes nothing", () => {
  for (const stmt of statements) {
    assert.doesNotMatch(stmt, /^(drop (table|type|schema|function|index)|truncate|delete from)\b/i, `destructive statement: ${stmt.slice(0, 80)}`);
  }
});

test("schema.sql enables RLS on every table it creates", () => {
  for (const name of tables.keys()) {
    const enabled = statements.some((s) => new RegExp(`^alter table ${name} enable row level security$`, "i").test(s));
    assert.ok(enabled, `RLS not enabled on ${name}`);
  }
});

test("schema.sql includes the audit_events table with the columns recordAuditEvent writes", () => {
  const audit = tables.get("audit_events");
  assert.ok(audit, "audit_events is missing");
  for (const column of ["occurred_at", "actor_user_id", "actor_role", "actor_ip", "action", "target_kind", "target_id", "before_state", "after_state", "metadata"]) {
    assert.ok(audit.columns.has(column), `audit_events.${column} is missing`);
  }
  assert.ok(tables.has("ops_pin_hashes"), "ops_pin_hashes is missing");
  assert.ok(tables.has("mfa_backup_codes"), "mfa_backup_codes is missing");
});

// The firm manages each client's own account. Nothing is pooled, so there is
// nothing to divide into units, no NAV to strike, nobody subscribing or
// redeeming, and no high-water mark computed from a valuation of ours.
test("no table, column or enum belongs to the pooled-fund model", () => {
  const banned = new Set(["investor", "investors", "subscription", "subscriptions", "subscribe", "redemption", "redemptions", "redeem", "redeeming", "redeemed", "nav", "unit", "units", "hwm", "strike", "strikes", "fund"]);
  const check = (name, where) => {
    const tokens = tokensOf(name);
    for (const token of tokens) {
      assert.ok(!banned.has(token), `${where} "${name}" belongs to the pooled-fund model`);
    }
    assert.doesNotMatch(tokens.join("_"), /high_?water/, `${where} "${name}" belongs to the pooled-fund model`);
  };
  for (const name of tables.keys()) check(name, "table");
  for (const { table, column } of allColumns()) check(column, `column on ${table}`);
  for (const [name, e] of enums) {
    check(name, "enum");
    for (const label of e.labels) check(label, `label of ${name}`);
  }
});

// Balances, positions, trades, P&L and valuations stay with the broker, whose
// statement is authoritative. A column for any of them would be a second set
// of numbers, which the programme page promises does not exist.
test("no column stores a balance, a position, a price or a result", () => {
  const banned = new Set(["balance", "balances", "equity", "valuation", "valuations", "value", "values", "position", "positions", "price", "prices", "quantity", "quantities", "qty", "pnl", "profit", "profits", "gain", "gains", "holding", "holdings", "performance", "aum", "nav", "fill", "fills", "return", "returns"]);
  for (const { table, column } of allColumns()) {
    for (const token of tokensOf(column)) {
      assert.ok(!banned.has(token), `${table}.${column} looks like money the broker holds the record of`);
    }
  }
});

// A numeric column can hold a balance whatever it is called. The only money
// the firm records is the fee it charged.
test("the only decimal column is the fee charged", () => {
  const numeric = /^(numeric|decimal|money|real|double precision|float\d*)\b/i;
  const found = allColumns().filter(({ def }) => numeric.test(def)).map(({ table, column }) => `${table}.${column}`);
  assert.deepEqual(found, ["fee_charges.amount"]);
});

// jsonb can hide anything. Each one in use is accounted for.
test("jsonb columns are the known ones", () => {
  const found = allColumns().filter(({ def }) => /^jsonb\b/i.test(def)).map(({ table, column }) => `${table}.${column}`);
  assert.deepEqual(found.sort(), ["audit_events.after_state", "audit_events.before_state", "audit_events.metadata", "mandates.limits"]);
});

// The account is opened under the client's own credentials, and the firm
// never holds them.
test("no column could hold a broker credential or a full account number", () => {
  const banned = /password|passwd|pwd|secret|api_?key|token|credential|login|private_key|account_(number|no|num)|acct|iban|otp|session/i;
  for (const { table, column } of allColumns()) {
    assert.doesNotMatch(column, banned, `${table}.${column} looks like a credential`);
  }

  const broker = tables.get("broker_accounts");
  const textColumns = [...broker.columns].filter(([, def]) => /^(text|varchar|character|char)\b/i.test(def)).map(([c]) => c);
  assert.deepEqual(textColumns.sort(), ["account_last4", "base_currency", "broker_name"], "broker_accounts gained a text column");
  const masked = checksOn("broker_accounts", "account_last4").map(squash);
  assert.ok(
    masked.some((c) => /^account_last4~'\^\[[a-z0-9-]+\]\{4\}\$'$/.test(c)),
    `account_last4 must be held to exactly four characters by a check, found: ${masked.join(" | ")}`
  );
});

// The governance and disclosures pages say the firm can trade and nothing
// else. If the real authority is broader, those pages change first.
test("the authority scope admits trade_only and nothing else", () => {
  const mandates = tables.get("mandates");
  const column = mandates.columns.get("authority_scope");
  assert.ok(column, "mandates.authority_scope is missing");
  assert.match(column, /^text not null default 'trade_only'$/i, `authority_scope must be text, not null, default trade_only: ${column}`);
  const checks = checksOn("mandates", "authority_scope").map(squash).map((c) => c.replace(/^\((.*)\)$/, "$1"));
  assert.deepEqual(checks, ["authority_scope='trade_only'"]);
  for (const stmt of statements) {
    for (const m of stmt.matchAll(/'([^']*)'/g)) {
      assert.doesNotMatch(m[1], /withdraw|transfer|pledge/i, `the schema names a wider authority: '${m[1]}'`);
    }
  }
});

test("no policy lets anon or authenticated write", () => {
  for (const p of policies) {
    assert.equal(p.command, "select", `${p.name} on ${p.table} is FOR ${p.command}`);
    assert.deepEqual(p.roles, ["authenticated"], `${p.name} on ${p.table} must be TO authenticated only`);
    assert.equal(p.withCheck, null, `${p.name} on ${p.table} has a WITH CHECK, which only a write uses`);
    assert.ok(p.using, `${p.name} on ${p.table} has no USING clause`);
    assert.doesNotMatch(squash(p.using), /^true$|\bortrue\b|or1=1/, `${p.name} on ${p.table} admits every row`);
  }
  for (const g of grants) {
    assert.doesNotMatch(g, /\b(insert|update|delete|truncate|all)\b.*\bto\b.*\b(anon|authenticated|public)\b/i, `grant opens a write: ${g}`);
  }
});

test("write privileges are revoked from anon and authenticated on every table", () => {
  const covered = new Set();
  for (const r of revokes) {
    const privileges = ["insert", "update", "delete", "truncate"].every((p) => r.privileges.includes(p) || r.privileges.includes("all"));
    const roles = ["anon", "authenticated"].every((role) => r.roles.includes(role));
    if (privileges && roles) r.tables.forEach((t) => covered.add(t));
  }
  for (const name of tables.keys()) {
    assert.ok(covered.has(name), `write privileges are not revoked on ${name}`);
  }
});

test("every table carrying client_id lets a client read their own rows, and only those", () => {
  const ownRows = squash("client_id in (select id from clients where auth_user_id = (select auth.uid()))");
  const clientTables = [...tables].filter(([, t]) => t.columns.has("client_id")).map(([name]) => name);
  assert.ok(clientTables.length >= 8, "expected the client-scoped tables");
  for (const name of clientTables) {
    const own = policies.filter((p) => p.table === name && squash(p.using).includes(ownRows));
    assert.ok(own.length > 0, `${name} has client_id but no self-read policy`);
  }
  const self = policies.find((p) => p.table === "clients");
  assert.ok(self, "clients has no self-read policy");
  assert.equal(squash(self.using), squash("auth_user_id = (select auth.uid())"));
});

// Wrapped in a sub-select, auth.uid() becomes an InitPlan evaluated once per
// query; bare, Postgres calls it for every row.
test("every policy calls auth.uid() through a sub-select", () => {
  for (const p of policies) {
    const text = squash(p.using);
    const bare = (text.match(/auth\.uid\(\)/g) ?? []).length;
    const wrapped = (text.match(/\(selectauth\.uid\(\)\)/g) ?? []).length;
    assert.ok(bare > 0, `${p.name} does not identify the caller`);
    assert.equal(bare, wrapped, `${p.name} calls auth.uid() without (select ...)`);
  }
});

test("every client_id an RLS policy looks up is indexed", () => {
  for (const [name, t] of tables) {
    if (!t.columns.has("client_id")) continue;
    assert.ok(
      indexes.some((i) => i.table === name && i.leading === "client_id"),
      `${name}.client_id has no index leading on it`
    );
  }
  assert.match(tables.get("clients").columns.get("auth_user_id"), /\bunique\b/i, "clients.auth_user_id must be unique, and so indexed");
});

test("desk notes are read only by active clients, once published", () => {
  const p = policies.filter((x) => x.table === "desk_notes");
  assert.equal(p.length, 1);
  const using = squash(p[0].using);
  assert.ok(using.includes("published_at<=now()"), "desk notes must be published to be read");
  assert.ok(using.includes("status='active'"), "desk notes must be limited to active clients");
});

test("audit_events, mandate_activity and notice_acknowledgements are append-only for every role", () => {
  for (const table of ["audit_events", "mandate_activity", "notice_acknowledgements"]) {
    const rowLevel = triggers.find(
      (t) => t.table === table && t.timing === "before" && t.level === "row" && t.events.includes("update") && t.events.includes("delete")
    );
    assert.ok(rowLevel, `${table} has no BEFORE UPDATE OR DELETE row trigger`);
    const truncate = triggers.find((t) => t.table === table && t.timing === "before" && t.events.includes("truncate"));
    assert.ok(truncate, `${table} has no BEFORE TRUNCATE trigger; TRUNCATE skips row triggers`);
    for (const t of [rowLevel, truncate]) {
      const fn = functions.get(t.fn);
      assert.ok(fn, `${t.name} calls ${t.fn}, which schema.sql does not define`);
      assert.match(fn.body, /\braise exception\b/i, `${t.fn} does not raise`);
      assert.doesNotMatch(fn.body, /\breturn\b/i, `${t.fn} has a path that lets the change through`);
    }
  }
});

// Pinned on every function, so one later made SECURITY DEFINER cannot be
// pointed at a caller's own objects.
test("every function pins search_path", () => {
  assert.ok(functions.size > 0);
  for (const [name, f] of functions) {
    assert.ok(f.setsSearchPath, `${name} does not set search_path`);
  }
});

// The programme is offered in any country. US-person status is still recorded,
// because it carries tax-reporting obligations, but nothing refuses a client
// on it or on where they live.
test("no client is refused by nationality or residence", () => {
  const clients = tables.get("clients");
  assert.match(clients.columns.get("us_person"), /^boolean not null$/i, "us_person must be recorded, boolean not null, with no default");
  for (const column of ["us_person", "country_of_residence"]) {
    const refusing = checksOn("clients", column).filter((c) => /status/i.test(c) && !/is not null/i.test(c));
    assert.deepEqual(refusing, [], `a check ties ${column} to who may be a client: ${refusing.join("; ")}`);
  }
  for (const c of checksOn("clients", "country_of_residence")) {
    assert.doesNotMatch(c, /'US'|<>|!=|is distinct from '/i, `residence is filtered: ${c}`);
  }
});

// No minimum appears anywhere on the site, and USD 20,000 was never confirmed.
test("no minimum is enforced on any amount", () => {
  for (const { table, column } of allColumns()) {
    for (const c of checksOn(table, column)) {
      for (const m of c.matchAll(/([a-z_]+)\s*>=?\s*(\d+(?:\.\d+)?)/gi)) {
        assert.ok(Number(m[2]) === 0, `${table}: check "${c}" sets a minimum on ${m[1]}`);
      }
    }
  }
  assert.doesNotMatch(statements.join("\n"), /20,?000/, "the unconfirmed USD 20,000 minimum is back");
});

// The fee basis lives in the client agreement. A row names the clause and the
// broker statement line, never a rate.
test("fee charges carry the agreement clause and statement line, never a basis", () => {
  const fees = tables.get("fee_charges");
  for (const column of ["amount", "currency", "agreement_clause", "broker_statement_reference", "period_start", "period_end", "status"]) {
    assert.ok(fees.columns.has(column), `fee_charges.${column} is missing`);
  }
  const basis = new Set(["rate", "rates", "percent", "percentage", "pct", "bps", "basis", "hurdle", "multiplier", "threshold", "crystallised", "crystallisation"]);
  for (const column of fees.columns.keys()) {
    for (const token of tokensOf(column)) {
      assert.ok(!basis.has(token), `fee_charges.${column} states a fee basis the agreement holds`);
    }
  }
  assert.ok(checksOn("fee_charges", "amount").map(squash).includes("amount>=0"), "fee amounts must be checked >= 0");
  const paid = checksOn("fee_charges", "broker_statement_reference").map(squash);
  assert.ok(
    paid.some((c) => c.includes("status<>'paid'") && c.includes("broker_statement_reference")),
    "a fee must not be marked paid without its broker statement line"
  );
});

test("the registers are the four the site names", () => {
  const fromSite = dict.home.registers.map((r) => r.name.toLowerCase().replace(/[^a-z]+/g, "_"));
  assert.deepEqual(enums.get("programme_register").labels, fromSite);
});
