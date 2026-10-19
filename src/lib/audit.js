// Actions follow supabase/schema.sql: the record of the relationship, never of
// the money. There is nothing here for a deposit, a withdrawal, a transfer, a
// valuation or a trade fill, because the firm makes none of them; the broker
// holds that record. A fee is charged and then paid against a broker statement
// line, never taken by the firm.
export const AUDIT_ACTIONS = Object.freeze({
  CLIENT_ENQUIRY_RECORDED: "client.enquiry_recorded",
  CLIENT_ADMITTED: "client.admitted",
  CLIENT_UPDATED: "client.updated",
  CLIENT_PAUSED: "client.paused",
  CLIENT_RESUMED: "client.resumed",
  CLIENT_ENDED: "client.ended",
  CLIENT_DECLINED: "client.declined",
  KYC_CHECK_RECORDED: "kyc.check.recorded",
  BROKER_ACCOUNT_LINKED: "broker_account.linked",
  BROKER_ACCOUNT_CLOSED: "broker_account.closed",
  AUTHORITY_GRANTED: "authority.granted",
  AUTHORITY_REVOKED: "authority.revoked",
  MANDATE_ISSUED: "mandate.issued",
  MANDATE_AMENDED: "mandate.amended",
  MANDATE_ENDED: "mandate.ended",
  MANDATE_ACTIVITY_LOGGED: "mandate.activity.logged",
  DOCUMENT_ISSUED: "document.issued",
  DOCUMENT_SIGNED: "document.signed",
  FEE_CHARGED: "fee.charged",
  FEE_PAID: "fee.paid",
  FEE_WAIVED: "fee.waived",
  FEE_VOIDED: "fee.voided",
  NOTICE_ISSUED: "notice.issued",
  NOTICE_ACKNOWLEDGED: "notice.acknowledged",
  DESK_NOTE_PUBLISHED: "desk_note.published",
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
