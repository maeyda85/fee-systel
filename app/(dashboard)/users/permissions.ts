'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function setCanManageCourses(userId: string, allowed: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: me } = await supabase
    .from('profiles').select('role, is_active').eq('id', user.id).single()
  if (me?.role !== 'admin' || !me.is_active) throw new Error('Forbidden')

  // RLS also restricts this update to admins
  const { error } = await supabase
    .from('profiles').update({ can_manage_courses: allowed }).eq('id', userId)
  if (error) return { error: error.message }
  revalidatePath('/users')
  return { success: true as const }
}