import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Fail loudly at startup if critical env vars are missing
if (!supabaseUrl) {
  const msg = "❌ Missing NEXT_PUBLIC_SUPABASE_URL - app cannot start";
  console.error(msg);
  throw new Error(msg);
}

if (!serviceRoleKey) {
  const msg = "❌ Missing SUPABASE_SERVICE_ROLE_KEY - app cannot start";
  console.error(msg);
  throw new Error(msg);
}

// Debug logging
const isDev = process.env.NODE_ENV !== 'production';
if (isDev) {
  console.log("✓ Supabase Admin Client initialized");
  console.log(`  URL: ${supabaseUrl.substring(0, 30)}...`);
  console.log(`  Service Role Key: ${serviceRoleKey.substring(0, 20)}...`);
} else {
  console.log("✓ Supabase Admin Client initialized (production mode)");
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
