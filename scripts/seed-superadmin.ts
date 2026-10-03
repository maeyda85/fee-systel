import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function main() {
  const { data: existing } = await supabase
    .from('profiles').select('id').eq('role', 'superadmin').limit(1)
  if (existing?.length) return console.log(' Super Admin already exists, skipping.')

  const { data, error } = await supabase.auth.admin.createUser({
    email: process.env.ADMIN_EMAIL!,
    password: process.env.ADMIN_PASSWORD!,
    email_confirm: true,
  })
  if (error) throw error

  const { error: pErr } = await supabase.from('profiles').insert({
    id: data.user.id, full_name: 'Main Admin', role: 'superadmin',
  })
  if (pErr) throw pErr
  console.log('Admin created:', data.user.email)
}
main()