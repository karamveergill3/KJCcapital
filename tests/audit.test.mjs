import test from "node:test";
import assert from "node:assert/strict";
import { AUDIT_ACTIONS, serialiseForAudit } from "../src/lib/audit.js";

test("AUDIT_ACTIONS enumerates the actions we log today", () => {
  const required = [
    "CLIENT_ADMITTED",
    "CLIENT_UPDATED",
    "CLIENT_PAUSED",
    "CLIENT_ENDED",
    "KYC_CHECK_RECORDED",
    "BROKER_ACCOUNT_LINKED",
    "AUTHORITY_GRANTED",
    "AUTHORITY_REVOKED",
    "MANDATE_ISSUED",
    "MANDATE_AMENDED",
    "MANDATE_ENDED",
    "MANDATE_ACTIVITY_LOGGED",
    "DOCUMENT_ISSUED",
    "FEE_CHARGED",
    "FEE_PAID",
    "FEE_WAIVED",
    "NOTICE_ISSUED",
    "NOTICE_ACKNOWLEDGED",
    "DESK_NOTE_PUBLISHED",
    "AUTH_MFA_ENROLLED",
    "AUTH_MFA_UNENROLLED",
    "AUTH_BACKUP_CODES_REGENERATED",
    "AUTH_STEP_UP_PASSED",
    "OPS_PIN_SET",
    "OPS_PIN_VERIFIED",
    "OPS_PIN_FAILED"
  ];
  for (const key of required) {
    assert.ok(key in AUDIT_ACTIONS, `AUDIT_ACTIONS missing ${key}`);
    assert.equal(typeof AUDIT_ACTIONS[key], "string");
  }
});

test("AUDIT_ACTIONS keeps the auth and ops actions exactly as stored", () => {
  // Rows already written carry these strings; renaming one orphans them.
  assert.equal(AUDIT_ACTIONS.AUTH_MFA_ENROLLED, "auth.mfa.enrolled");
  assert.equal(AUDIT_ACTIONS.AUTH_MFA_UNENROLLED, "auth.mfa.unenrolled");
  assert.equal(AUDIT_ACTIONS.AUTH_BACKUP_CODES_REGENERATED, "auth.backup_codes.regenerated");
  assert.equal(AUDIT_ACTIONS.AUTH_STEP_UP_PASSED, "auth.step_up.passed");
  assert.equal(AUDIT_ACTIONS.OPS_PIN_SET, "ops.pin.set");
  assert.equal(AUDIT_ACTIONS.OPS_PIN_VERIFIED, "ops.pin.verified");
  assert.equal(AUDIT_ACTIONS.OPS_PIN_FAILED, "ops.pin.failed");
});

test("action strings are dotted lower-case, unique, and match their key", () => {
  const seen = new Set();
  for (const [key, action] of Object.entries(AUDIT_ACTIONS)) {
    assert.match(key, /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)+$/, `key ${key} is not SCREAMING_SNAKE_CASE`);
    assert.match(action, /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/, `${key}: "${action}" is not dotted lower-case`);
    assert.ok(!seen.has(action), `${action} is used by more than one key`);
    seen.add(action);
    // The key is the action spelled the other way, so the two cannot drift.
    assert.equal(action.replace(/\./g, "_").toUpperCase(), key, `${key} does not spell "${action}"`);
  }
});

// The firm manages each client's own account and pools nothing. An action
// named for the fund it is not would be the first step to logging one.
test("no action belongs to the pooled-fund model", () => {
  const banned = /investor|subscri|redempt|redeem|(^|[._])navs?([._]|$)|(^|[._])units?([._]|$)|high_?water|(^|[._])hwm([._]|$)|strike/i;
  for (const [key, action] of Object.entries(AUDIT_ACTIONS)) {
    assert.doesNotMatch(key.toLowerCase(), banned, `pooled-fund action key: ${key}`);
    assert.doesNotMatch(action, banned, `pooled-fund action: ${action}`);
  }
});

// The firm holds no money and has no authority to move any. An action for
// moving or valuing it would record something the firm cannot do.
test("no action records moving or valuing client money", () => {
  const banned = /withdraw|deposit|transfer|payout|disburse|balance|valuation|equity|position|(^|[._])trade_fill|(^|[._])pnl([._]|$)|deduct/i;
  for (const [key, action] of Object.entries(AUDIT_ACTIONS)) {
    assert.doesNotMatch(key.toLowerCase(), banned, `money-moving action key: ${key}`);
    assert.doesNotMatch(action, banned, `money-moving action: ${action}`);
  }
});

test("AUDIT_ACTIONS is frozen", () => {
  assert.throws(() => {
    AUDIT_ACTIONS.NEW_ACTION = "should not stick";
  });
});

test("serialiseForAudit handles null and undefined", () => {
  assert.equal(serialiseForAudit(null), null);
  assert.equal(serialiseForAudit(undefined), null);
});

test("serialiseForAudit round-trips plain objects", () => {
  const input = { a: 1, b: "two", c: [3, 4], d: { e: 5 } };
  const output = serialiseForAudit(input);
  assert.deepEqual(output, input);
  assert.notStrictEqual(output, input);
});

test("serialiseForAudit stringifies bigints", () => {
  const input = { count: 42n };
  const output = serialiseForAudit(input);
  assert.equal(output.count, "42");
});

test("serialiseForAudit handles cycles without throwing", () => {
  const node = { name: "loop" };
  node.self = node;
  const output = serialiseForAudit(node);
  assert.equal(output.name, "loop");
  assert.equal(output.self, "[circular]");
});
