import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const schemaPath = resolve(here, "..", "supabase", "schema.sql");

test("schema.sql is re-runnable (idempotent guards)", async () => {
  const sql = await readFile(schemaPath, "utf8");
  const stripped = sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
  const tableCreates = [...stripped.matchAll(/create\s+table\s+[^\n;]+/gi)];
  assert.ok(tableCreates.length > 0, "expected at least one CREATE TABLE statement");
  for (const m of tableCreates) {
    assert.match(m[0].toLowerCase(), /create\s+table\s+if\s+not\s+exists/, `not idempotent: ${m[0]}`);
  }
});

test("schema.sql enables RLS on every table it creates", async () => {
  const sql = await readFile(schemaPath, "utf8");

  const tableNames = [...sql.matchAll(/create table if not exists\s+([a-z_]+)/gi)].map((m) => m[1]);
  for (const name of tableNames) {
    const enableRe = new RegExp(`alter table\\s+${name}\\s+enable row level security`, "i");
    assert.match(sql, enableRe, `RLS not enabled on ${name}`);
  }
});

test("schema.sql includes the audit_events table", async () => {
  const sql = await readFile(schemaPath, "utf8");
  assert.match(sql, /create table if not exists audit_events/);
});

test("subscription minimum is enforced in the database (USD 20,000)", async () => {
  const sql = await readFile(schemaPath, "utf8");
  assert.match(sql, /amount_usd\s*>=\s*20000/);
});
