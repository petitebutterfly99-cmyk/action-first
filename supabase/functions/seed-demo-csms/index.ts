// Seeds 4 demo CSM auth users. Idempotent. Protected by a shared secret.
// Requires SEED_DEMO_SECRET to be set; caller must pass matching X-Seed-Secret header.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-seed-secret",
};

const DEMO_CSMS = [
  { email: "sarah.chen@demo.app", full_name: "Sarah Chen" },
  { email: "marcus.rivera@demo.app", full_name: "Marcus Rivera" },
  { email: "priya.patel@demo.app", full_name: "Priya Patel" },
  { email: "daniel.kim@demo.app", full_name: "Daniel Kim" },
  { email: "alex.morgan@demo.app", full_name: "Alex Morgan" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const expectedSecret = Deno.env.get("SEED_DEMO_SECRET");
  const providedSecret = req.headers.get("x-seed-secret");
  if (!expectedSecret || !providedSecret || providedSecret !== expectedSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const demoPassword = Deno.env.get("SEED_DEMO_PASSWORD");
  if (!demoPassword) {
    return new Response(JSON.stringify({ error: "Server not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const results: Array<{ email: string; status: string }> = [];
  const { data: existing } = await admin.auth.admin.listUsers();

  for (const csm of DEMO_CSMS) {
    const found = existing?.users.find((u) => u.email === csm.email);
    if (found) {
      results.push({ email: csm.email, status: "exists" });
      continue;
    }

    const { error } = await admin.auth.admin.createUser({
      email: csm.email,
      password: demoPassword,
      email_confirm: true,
      user_metadata: { full_name: csm.full_name },
    });

    results.push({ email: csm.email, status: error ? `error: ${error.message}` : "created" });
  }

  return new Response(
    JSON.stringify({ users: results }, null, 2),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
