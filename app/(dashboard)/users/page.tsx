import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/superadmin'
import { UserTable, type UserRow } from '@/components/ui/user-table'

import { AddUserDialog } from '@/components/ui/user-dialog'

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('profiles').select('role, is_active').eq('id', user.id).single()
  if (me?.role !== 'superadmin' || !me.is_active) redirect('/')

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, role, is_active, can_manage_courses, created_at')
    .order('created_at', { ascending: false })

  // emails live in auth.users, so fetch them with the service role
  const { data: authData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
  const emails = new Map(authData?.users.map((u) => [u.id, u.email ?? '']))

  const rows: UserRow[] = (profiles ?? []).map((p) => ({
    ...p,
    email: emails.get(p.id) ?? '',
  }))

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-sm text-muted-foreground">
            Add staff, change their access, or deactivate accounts.
          </p>
        </div>
        <AddUserDialog />
      </div>
      <UserTable rows={rows} currentUserId={user.id} />
    </div>
  )
}