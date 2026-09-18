import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { dirname, resolve as resolvePath } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

process.env.NODE_ENV ??= "test";
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test-service-role-key";
process.env.MFA_COOKIE_SECRET ??= "00".repeat(32);
process.env.BROKER_ENC_KEY ??= "00".repeat(32);

// jsconfig maps "@/*" to "./src/*". Next resolves that at build time; plain
// `node --test` does not, so anything importing through the alias is otherwise
// untestable.
const SRC = resolvePath(dirname(dirname(fileURLToPath(import.meta.url))), "src");

function resolveAliased(specifier) {
  const base = resolvePath(SRC, specifier.slice(2));
  for (const candidate of [base, `${base}.js`, `${base}.jsx`, `${base}.json`, resolvePath(base, "index.js")]) {
    if (existsSync(candidate)) return pathToFileURL(candidate).href;
  }
  return null;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const url = resolveAliased(specifier);
      if (url) return { url, format: url.endsWith(".json") ? "json" : "module", shortCircuit: true };
    }
    return nextResolve(specifier, context);
  }
});
