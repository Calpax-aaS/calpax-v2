'use client'

import { useState, useEffect, useMemo, useId } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { fetchAdminAuditLogs } from '@/lib/actions/admin'
import { formatDateTimeShort } from '@/lib/format'

const ENTITY_TYPES = ['Ballon', 'Pilote', 'Billet', 'Passager', 'Paiement', 'Vol', 'AUTH']
const ACTIONS = [
  'CREATE',
  'UPDATE',
  'DELETE',
  'SIGN_IN',
  'SIGN_IN_FAILED',
  'SIGN_OUT',
  'PASSWORD_RESET',
  'PASSWORD_CHANGED',
  'ACCOUNT_LOCKED',
]

type AuditLog = {
  id: bigint
  exploitantId: string | null
  impersonatedBy: string | null
  entityType: string
  entityId: string
  action: string
  field: string | null
  beforeValue: unknown
  afterValue: unknown
  createdAt: Date
}

type Exploitant = {
  id: string
  name: string
}

type Admin = {
  id: string
  name: string
  email: string
}

export function AdminAuditClient({
  exploitants,
  admins,
}: {
  exploitants: Exploitant[]
  admins: Admin[]
}) {
  const t = useTranslations('audit')
  const ta = useTranslations('admin.audit')
  const locale = useLocale()
  const [exploitantId, setExploitantId] = useState('')
  const [entityType, setEntityType] = useState('')
  const [action, setAction] = useState('')
  const [page, setPage] = useState(1)
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [pageCount, setPageCount] = useState(0)

  const exploitantSelectId = useId()
  const entityTypeSelectId = useId()
  const actionSelectId = useId()

  useEffect(() => {
    let cancelled = false
    fetchAdminAuditLogs({
      exploitantId: exploitantId || undefined,
      entityType: entityType || undefined,
      action: action || undefined,
      page,
    }).then((result) => {
      if (cancelled) return
      setLogs(result.logs as unknown as AuditLog[])
      setTotal(result.total)
      setPageCount(result.pageCount)
    })
    return () => {
      cancelled = true
    }
  }, [exploitantId, entityType, action, page])

  function formatJson(value: unknown): string {
    if (value === null || value === undefined) return '--'
    if (typeof value === 'string') return value
    return JSON.stringify(value)
  }

  const exploitantMap = useMemo(
    () => new Map(exploitants.map((e) => [e.id, e.name])),
    [exploitants],
  )
  const adminMap = useMemo(() => new Map(admins.map((a) => [a.id, a.name || a.email])), [admins])

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {ta('title')} ({total})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex gap-3 items-end flex-wrap">
          <div>
            <label htmlFor={exploitantSelectId} className="text-sm text-muted-foreground">
              {ta('exploitant')}
            </label>
            <select
              id={exploitantSelectId}
              value={exploitantId}
              onChange={(e) => {
                setExploitantId(e.target.value)
                setPage(1)
              }}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            >
              <option value="">{ta('all')}</option>
              {exploitants.map((exp) => (
                <option key={exp.id} value={exp.id}>
                  {exp.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={entityTypeSelectId} className="text-sm text-muted-foreground">
              {t('filters.entityType')}
            </label>
            <select
              id={entityTypeSelectId}
              value={entityType}
              onChange={(e) => {
                setEntityType(e.target.value)
                setPage(1)
              }}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            >
              <option value="">{t('filters.all')}</option>
              {ENTITY_TYPES.map((et) => (
                <option key={et} value={et}>
                  {et}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={actionSelectId} className="text-sm text-muted-foreground">
              {t('filters.action')}
            </label>
            <select
              id={actionSelectId}
              value={action}
              onChange={(e) => {
                setAction(e.target.value)
                setPage(1)
              }}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            >
              <option value="">{t('filters.all')}</option>
              {ACTIONS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        {logs.length === 0 ? (
          <p className="text-muted-foreground">{ta('noEntries')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('fields.date')}</TableHead>
                <TableHead>{ta('exploitant')}</TableHead>
                <TableHead>{ta('impersonatedBy')}</TableHead>
                <TableHead>{t('fields.entity')}</TableHead>
                <TableHead>{t('fields.action')}</TableHead>
                <TableHead>{t('fields.field')}</TableHead>
                <TableHead>{t('fields.before')}</TableHead>
                <TableHead>{t('fields.after')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={String(log.id)}>
                  <TableCell className="text-xs">
                    {formatDateTimeShort(log.createdAt, locale)}
                  </TableCell>
                  <TableCell className="text-xs">
                    {log.exploitantId ? (exploitantMap.get(log.exploitantId) ?? '--') : '--'}
                  </TableCell>
                  <TableCell className="text-xs">
                    {log.impersonatedBy ? (
                      <Badge variant="outline" className="border-amber-500 text-amber-700">
                        {adminMap.get(log.impersonatedBy) ?? log.impersonatedBy.slice(0, 8)}
                      </Badge>
                    ) : (
                      '--'
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{log.entityType}</Badge>{' '}
                    <span className="text-xs text-muted-foreground">
                      {log.entityId.slice(0, 8)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge>{log.action}</Badge>
                  </TableCell>
                  <TableCell>{log.field ?? '--'}</TableCell>
                  <TableCell className="max-w-32 truncate text-xs">
                    {formatJson(log.beforeValue)}
                  </TableCell>
                  <TableCell className="max-w-32 truncate text-xs">
                    {formatJson(log.afterValue)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Pagination */}
        {pageCount > 1 && (
          <div className="flex justify-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              {ta('prev')}
            </Button>
            <span className="text-sm py-2">
              {page} / {pageCount}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= pageCount}
              onClick={() => setPage(page + 1)}
            >
              {ta('next')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
