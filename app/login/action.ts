'use server'
import { z } from 'zod'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(input: unknown): Promise<{ error: string }> {
  const parsed = z.object({
    email: z.string().trim().email('Enter a valid email'),
    password: z.string().min(1, 'Enter your password'),
  }).safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error || !data.user) return { error: 'Incorrect email or password' }

  const { data: p } = await supabase.from('profiles').select('is_active').eq('id', data.user.id).single()
  if (!p?.is_active) {
    await supabase.auth.signOut()
    return { error: 'This account is not active. Please contact the admin.' }
  }
  redirect('/')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}