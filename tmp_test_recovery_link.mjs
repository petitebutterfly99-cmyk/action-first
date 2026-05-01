import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error('Missing Supabase env');
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
const redirectTo = 'https://1612507e-fd7d-4cb3-bf7e-8eb90b27d9c4.lovableproject.com/reset-password';
const { data, error } = await admin.auth.admin.generateLink({
  type: 'recovery',
  email,
  options: { redirectTo },
});
if (error) throw error;
console.log(JSON.stringify({ email, action_link: data.properties.action_link }, null, 2));
