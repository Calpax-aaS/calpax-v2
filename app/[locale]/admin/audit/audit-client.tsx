'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
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

const ENTITY_TYPES = ['Ballon', 'Pilote', 'Billet', 'Passager', 'Paiement', 'Vol']
const ACTIONS = ['CREATE', 'UPDATE', 'DELETE']

type AuditLog = {
  id: bigint
  exploitantId: string | null
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

export function AdminAuditClient({ exploitants }: { exploitants: Exploitant[] }) {
  const t = useTranslations('audit')
  const ta = useTranslations('admin.audit')
  const [exploitantId, setExploitantId] = useState('')
  const [entityType, setEntityType] = useState('')
  const [action, setAction] = useState('')
  const [page, setPage] = useState(1)
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [pageCount, setPageCount] = useState(0)

  async function load() {
    const result = await fetchAdminAuditLogs({
      exploitantId: exploitantId || undefined,
      entityType: entityType || undefined,
      action: action || undefined,
      page,
    })
    setLogs(result.logs as unknown as AuditLog[])
    setTotal(result.total)
    setPageCount(result.pageCount)
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exploitantId, entityType, action, page])

  function formatDate(date: Date) {
    return new Date(date).toLocaleString('fr-FR')
  }

  function formatJson(value: unknown): string {
    if (value === null || value === undefined) return '--'
    if (typeof value === 'string') return value
    return JSON.stringify(value)
  }

  const exploitantMap = new Map(exploitants.map((e) => [e.id, e.name]))

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
            <label className="text-sm text-muted-foreground">{ta('exploitant')}</label>
            <select
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
            <label className="text-sm text-muted-foreground">{t('filters.entityType')}</label>
            <select
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
            <label className="text-sm text-muted-foreground">{t('filters.action')}</label>
            <select
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
                  <TableCell className="text-xs">{formatDate(log.createdAt)}</TableCell>
                  <TableCell className="text-xs">
                    {log.exploitantId ? (exploitantMap.get(log.exploitantId) ?? '--') : '--'}
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
              Precedent
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
              Suivant
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
