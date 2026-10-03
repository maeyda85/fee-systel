'use server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/superadmin'

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().min(2),
  role: z.enum(['superadmin', 'accountant', 'admin']),
})

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data } = await supabase
    .from('profiles').select('role, is_active').eq('id', user.id).single()
  if (data?.role !== 'superadmin' || !data.is_active) throw new Error('Forbidden')
  return user
}

export async function createUser(input: unknown) {
  await requireAdmin()
  const v = createUserSchema.parse(input)

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: v.email, password: v.password, email_confirm: true,
  })
  if (error) return { error: error.message }

  const { error: pErr } = await supabaseAdmin.from('profiles').insert({
    id: data.user.id, full_name: v.full_name, role: v.role,
  })
  if (pErr) {
    await supabaseAdmin.auth.admin.deleteUser(data.user.id) // roll back
    return { error: pErr.message }
  }
  revalidatePath('/users')
  return { success: true }
}

export async function setUserActive(userId: string, active: boolean) {
  const admin = await requireAdmin()
  if (admin.id === userId) return { error: "You can't deactivate yourself" }

  await supabaseAdmin.from('profiles').update({ is_active: active }).eq('id', userId)
  await supabaseAdmin.auth.admin.updateUserById(userId, {
    ban_duration: active ? 'none' : '876000h',
  })
  revalidatePath('/users')
  return { success: true }
}

export async function resetUserPassword(userId: string, newPassword: string) {
  await requireAdmin()
  z.string().min(8).parse(newPassword)
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: newPassword })
  return error ? { error: error.message } : { success: true }
}