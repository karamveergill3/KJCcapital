process.env.NODE_ENV ??= "test";
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test-service-role-key";
process.env.MFA_COOKIE_SECRET ??= "00".repeat(32);
process.env.BROKER_ENC_KEY ??= "00".repeat(32);
