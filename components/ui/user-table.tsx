'use client'

import { useMemo, useState, useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { setUserActive } from '@/app/(dashboard)/users/actions'
import { setCanManageCourses } from '@/app/(dashboard)/users/permissions'
import { ResetPasswordDialog, ROLES } from './user-dialog'

export type UserRow = {
  id: string
  full_name: string
  email: string
  role: 'superadmin' | 'accountant' | 'admin'
  is_active: boolean
  can_manage_courses: boolean
  created_at: string
}

export function UserTable({
  rows, currentUserId,
}: {
  rows: UserRow[]
  currentUserId: string
}) {
  const [query, setQuery] = useState('')
  const [toggle, setToggle] = useState<UserRow | null>(null)
  const [reset, setReset] = useState<UserRow | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (r) => r.full_name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q),
    )
  }, [rows, query])

  function confirmToggle() {
    if (!toggle) return
    const target = toggle
    setError(null)
    start(async () => {
      const res = await setUserActive(target.id, !target.is_active)
      if (res && 'error' in res && res.error) setError(res.error)
      setToggle(null)
    })
  }

  return (
    <div className="space-y-3">
      <Input
        placeholder="Search by name or email"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-sm"
        aria-label="Search users"
      />
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Manage courses</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  {rows.length === 0
                    ? 'No users yet. Use Add user to create the first one.'
                    : 'No users match your search.'}
                </TableCell>
              </TableRow>
            )}
            {filtered.map((u) => {
              const isMe = u.id === currentUserId
              return (
                <TableRow key={u.id} className={u.is_active ? '' : 'opacity-60'}>
                  <TableCell className="font-medium">
                    {u.full_name}
                    {isMe && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                  </TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{ROLES.find((r) => r.value === u.role)?.label}</TableCell>
                  <TableCell>
                    {u.role === 'admin' ? (
                      <span className="text-sm text-muted-foreground">Always</span>
                    ) : (
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        aria-label={`Allow ${u.full_name} to manage courses`}
                        checked={u.can_manage_courses}
                        disabled={pending}
                        onChange={(e) =>
                          start(async () => {
                            const res = await setCanManageCourses(u.id, e.target.checked)
                            if (res && 'error' in res) setError(res.error)
                          })
                        }
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.is_active ? 'default' : 'secondary'}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="space-x-2 text-right">
                    <Button variant="outline" size="sm" onClick={() => setReset(u)}>
                      Reset password
                    </Button>
                    <Button
                      variant={u.is_active ? 'destructive' : 'secondary'}
                      size="sm"
                      disabled={isMe}
                      onClick={() => setToggle(u)}
                    >
                      {u.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!toggle} onOpenChange={(o) => !o && setToggle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggle?.is_active ? 'Deactivate' : 'Activate'} {toggle?.full_name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggle?.is_active
                ? 'They will be signed out and unable to log in. Their past invoices and payments stay in the records.'
                : 'They will be able to log in again with their existing password.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmToggle} disabled={pending}>
              {toggle?.is_active ? 'Deactivate' : 'Activate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {reset && (
        <ResetPasswordDialog
          userId={reset.id}
          name={reset.full_name}
          open
          onOpenChange={(o) => !o && setReset(null)}
        />
      )}
    </div>
  )
}