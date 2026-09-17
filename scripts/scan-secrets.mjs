import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const patterns = [
  { name: "Supabase service role JWT", re: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/ },
  { name: "Slack webhook", re: /https:\/\/hooks\.slack\.com\/services\/[A-Z0-9]{9,}\/[A-Z0-9]{9,}\/[A-Za-z0-9]{20,}/ },
  { name: "Resend API key", re: /re_[A-Za-z0-9]{20,}/ },
  { name: "AWS access key", re: /AKIA[0-9A-Z]{16}/ },
  { name: "Private key block", re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |)PRIVATE KEY-----/ },
  { name: "Broker enc key hex", re: /BROKER_ENC_KEY\s*=\s*[a-f0-9]{32,}/i },
  { name: "MT5 shared secret", re: /MT5_SYNC_SHARED_SECRET\s*=\s*[^\s\n]{16,}/i },
  { name: "Generic API key line", re: /(?:api|secret|token|password)[_-]?key\s*=\s*['"][A-Za-z0-9+/=]{24,}['"]/i }
];

const skipPathRe = /(^|\/)(node_modules|\.next|\.git|public|out|build|dist|coverage)(\/|$)/;
const allowFileRe = /(\.env\.local\.example|scan-secrets\.mjs)$/;

let files;
try {
  const staged = execSync("git diff --cached --name-only --diff-filter=ACM", { encoding: "utf8" }).trim();
  files = staged ? staged.split("\n") : [];
  if (files.length === 0) {
    const tracked = execSync("git ls-files", { encoding: "utf8" }).trim();
    files = tracked ? tracked.split("\n") : [];
  }
} catch {
  process.exit(0);
}

let violations = 0;
for (const file of files) {
  if (!file || skipPathRe.test(file) || allowFileRe.test(file)) continue;
  let content;
  try { content = readFileSync(file, "utf8"); } catch { continue; }
  for (const { name, re } of patterns) {
    const match = content.match(re);
    if (match) {
      console.error(`  ${file}: ${name}`);
      violations += 1;
    }
  }
}

if (violations > 0) {
  console.error(`\nSecret scanner found ${violations} suspicious value${violations === 1 ? "" : "s"}.`);
  console.error("Move the value to Vercel env or Supabase config; commit references, not secrets.");
  process.exit(1);
}
