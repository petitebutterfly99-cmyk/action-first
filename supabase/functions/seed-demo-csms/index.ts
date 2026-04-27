// Seeds 4 demo CSM auth users with a shared password. Idempotent.
// Public endpoint (verify_jwt = false in config.toml).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEMO_PASSWORD = "demo1234";

const DEMO_CSMS = [
  { email: "sarah.chen@demo.app", full_name: "Sarah Chen" },
  { email: "marcus.rivera@demo.app", full_name: "Marcus Rivera" },
  { email: "priya.patel@demo.app", full_name: "Priya Patel" },
  { email: "daniel.kim@demo.app", full_name: "Daniel Kim" },
  { email: "alex.morgan@demo.app", full_name: "Alex Morgan" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const results: Array<{ email: string; status: string; id?: string }> = [];

  for (const csm of DEMO_CSMS) {
    // Check if user already exists by listing (small set, fine for demo).
    const { data: existing } = await admin.auth.admin.listUsers();
    const found = existing?.users.find((u) => u.email === csm.email);

    if (found) {
      results.push({ email: csm.email, status: "exists", id: found.id });
      continue;
    }

    const { data, error } = await admin.auth.admin.createUser({
      email: csm.email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: csm.full_name },
    });

    if (error) {
      results.push({ email: csm.email, status: `error: ${error.message}` });
      continue;
    }
    results.push({ email: csm.email, status: "created", id: data.user?.id });
  }

  return new Response(
    JSON.stringify({ password: DEMO_PASSWORD, users: results }, null, 2),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
