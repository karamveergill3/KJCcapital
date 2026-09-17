import test from "node:test";
import assert from "node:assert/strict";
import { AUDIT_ACTIONS, serialiseForAudit } from "../src/lib/audit.js";

test("AUDIT_ACTIONS enumerates the actions we log today", () => {
  const required = [
    "INVESTOR_ADMITTED",
    "SUBSCRIPTION_CREATED",
    "SUBSCRIPTION_SETTLED",
    "REDEMPTION_REQUESTED",
    "REDEMPTION_SETTLED",
    "NAV_STRIKE_RECORDED",
    "AUTH_MFA_ENROLLED",
    "OPS_PIN_VERIFIED"
  ];
  for (const key of required) {
    assert.ok(key in AUDIT_ACTIONS, `AUDIT_ACTIONS missing ${key}`);
    assert.equal(typeof AUDIT_ACTIONS[key], "string");
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
