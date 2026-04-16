'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { createUserForExploitant } from '@/lib/actions/admin'

type Exploitant = {
  id: string
  name: string
}

type RecentUser = {
  id: string
  name: string
  email: string
  role: string
  exploitantName: string
  createdAt: Date
}

const ROLES = ['GERANT', 'PILOTE', 'EQUIPIER'] as const

export function InvitationForm({
  exploitants,
  recentUsers: initialRecentUsers,
}: {
  exploitants: Exploitant[]
  recentUsers: RecentUser[]
}) {
  const t = useTranslations('admin.invitations')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [exploitantId, setExploitantId] = useState(exploitants[0]?.id ?? '')
  const [role, setRole] = useState<string>('GERANT')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ email: string; emailSent: boolean } | null>(null)
  const [recentUsers, setRecentUsers] = useState(initialRecentUsers)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !name || !exploitantId) return

    setLoading(true)
    setResult(null)
    try {
      const res = await createUserForExploitant({ email, name, exploitantId, role })
      setResult({ email: res.user.email, emailSent: res.emailSent })
      // Add to recent users list
      const exploitant = exploitants.find((ex) => ex.id === exploitantId)
      setRecentUsers((prev) => [
        {
          id: res.user.id,
          name: res.user.name,
          email: res.user.email,
          role: res.user.role,
          exploitantName: exploitant?.name ?? '',
          createdAt: new Date(),
        },
        ...prev.slice(0, 9),
      ])
      setEmail('')
      setName('')
    } finally {
      setLoading(false)
    }
  }

  function formatDate(date: Date) {
    return new Date(date).toLocaleString('fr-FR')
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="name">{t('name')}</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t('email')}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exploitant">{t('exploitant')}</Label>
              <select
                id="exploitant"
                value={exploitantId}
                onChange={(e) => setExploitantId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                required
              >
                {exploitants.map((exp) => (
                  <option key={exp.id} value={exp.id}>
                    {exp.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">{t('role')}</Label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={loading}>
              {t('submit')}
            </Button>
          </form>

          {result && (
            <div
              className={`mt-4 rounded-md border p-4 text-sm ${
                result.emailSent
                  ? 'border-success/30 bg-success/10 text-success'
                  : 'border-warning/30 bg-warning/10 text-warning'
              }`}
            >
              <p className="font-medium">
                {result.emailSent
                  ? `Utilisateur cree. Un email de configuration du mot de passe a ete envoye a ${result.email}.`
                  : `Utilisateur cree mais l'email n'a pas pu etre envoye. Verifiez la config Resend ou renvoyez manuellement un lien de reset a ${result.email}.`}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('recentUsers')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('name')}</TableHead>
                <TableHead>{t('email')}</TableHead>
                <TableHead>{t('role')}</TableHead>
                <TableHead>{t('exploitant')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentUsers.map((user) => (
                <TableRow key={user.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{user.role}</Badge>
                  </TableCell>
                  <TableCell>{user.exploitantName}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
