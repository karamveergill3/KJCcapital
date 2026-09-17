export const AUDIT_ACTIONS = Object.freeze({
  INVESTOR_ADMITTED: "investor.admitted",
  INVESTOR_SUSPENDED: "investor.suspended",
  INVESTOR_UPDATED: "investor.updated",
  SUBSCRIPTION_CREATED: "subscription.created",
  SUBSCRIPTION_FUNDS_RECEIVED: "subscription.funds_received",
  SUBSCRIPTION_SETTLED: "subscription.settled",
  SUBSCRIPTION_CANCELLED: "subscription.cancelled",
  REDEMPTION_REQUESTED: "redemption.requested",
  REDEMPTION_SETTLED: "redemption.settled",
  REDEMPTION_CANCELLED: "redemption.cancelled",
  NAV_STRIKE_RECORDED: "nav.strike.recorded",
  AUTH_MFA_ENROLLED: "auth.mfa.enrolled",
  AUTH_MFA_UNENROLLED: "auth.mfa.unenrolled",
  AUTH_BACKUP_CODES_REGENERATED: "auth.backup_codes.regenerated",
  AUTH_STEP_UP_PASSED: "auth.step_up.passed",
  OPS_PIN_SET: "ops.pin.set",
  OPS_PIN_VERIFIED: "ops.pin.verified",
  OPS_PIN_FAILED: "ops.pin.failed"
});

const REQUIRED = ["action"];

function assert(entry) {
  for (const k of REQUIRED) {
    if (!entry[k]) throw new Error(`audit.record: missing required field "${k}"`);
  }
}

function pickIp(headers) {
  if (!headers) return null;
  const xff = headers.get?.("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const real = headers.get?.("x-real-ip");
  return real || null;
}

export async function recordAuditEvent(entry, { headers } = {}) {
  assert(entry);
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const row = {
    actor_user_id: entry.actorUserId ?? null,
    actor_role: entry.actorRole ?? null,
    actor_ip: entry.actorIp ?? pickIp(headers) ?? null,
    action: entry.action,
    target_kind: entry.targetKind ?? null,
    target_id: entry.targetId ?? null,
    before_state: entry.before ?? null,
    after_state: entry.after ?? null,
    metadata: entry.metadata ?? null
  };
  const { error } = await admin.from("audit_events").insert(row);
  if (error) {
    console.error("audit.record failed:", error);
    return { ok: false, error };
  }
  return { ok: true };
}

export function serialiseForAudit(value) {
  if (value === null || value === undefined) return null;
  const seen = new WeakSet();
  return JSON.parse(
    JSON.stringify(value, (_, v) => {
      if (typeof v === "object" && v !== null) {
        if (seen.has(v)) return "[circular]";
        seen.add(v);
      }
      if (typeof v === "bigint") return v.toString();
      return v;
    })
  );
}
