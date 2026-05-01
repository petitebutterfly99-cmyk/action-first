import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const redirectTo = process.argv[2];
const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const stamp = Date.now();
const email = `password-reset-test-${stamp}@example.com`;
const password = `OldPass-${stamp}!`;
const { error: createError } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: 'Password Reset Test' },
});
if (createError) throw createError;
const { data, error } = await admin.auth.admin.generateLink({ type: 'recovery', email, options: { redirectTo } });
if (error) throw error;
const res = await fetch(data.properties.action_link, { redirect: 'manual' });
console.log(JSON.stringify({ email, status: res.status, location: res.headers.get('location') }, null, 2));
