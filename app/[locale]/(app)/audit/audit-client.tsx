'use client'

import { useState, useEffect } from 'react'
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
import { fetchAuditLogs } from '@/lib/actions/audit'
import { formatDateTimeShort } from '@/lib/format'
import {
  TENANT_AUDIT_ENTITY_TYPES,
  TENANT_AUDIT_ACTIONS,
  type AuditLogRow,
} from '@/lib/audit/types'

export function AuditClient() {
  const t = useTranslations('audit')
  const locale = useLocale()
  const [entityType, setEntityType] = useState('')
  const [action, setAction] = useState('')
  const [page, setPage] = useState(1)
  const [logs, setLogs] = useState<AuditLogRow[]>([])
  const [total, setTotal] = useState(0)
  const [pageCount, setPageCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetchAuditLogs({
      entityType: entityType || undefined,
      action: action || undefined,
      page,
    }).then((result) => {
      if (cancelled) return
      setLogs(result.logs)
      setTotal(result.total)
      setPageCount(result.pageCount)
    })
    return () => {
      cancelled = true
    }
  }, [entityType, action, page])

  function formatJson(value: unknown): string {
    if (value === null || value === undefined) return '—'
    if (typeof value === 'string') return value
    return JSON.stringify(value)
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3 items-end">
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
            {TENANT_AUDIT_ENTITY_TYPES.map((et) => (
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
            {TENANT_AUDIT_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <span className="text-sm text-muted-foreground">{t('results', { count: total })}</span>
      </div>

      {/* Table */}
      {logs.length === 0 ? (
        <p className="text-muted-foreground">{t('noEntries')}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('fields.date')}</TableHead>
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
                <TableCell>
                  <Badge variant="outline">{log.entityType}</Badge>{' '}
                  <span className="text-xs text-muted-foreground">{log.entityId.slice(0, 8)}</span>
                </TableCell>
                <TableCell>
                  <Badge>{log.action}</Badge>
                </TableCell>
                <TableCell>{log.field ?? '—'}</TableCell>
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
            {t('prev')}
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
            {t('next')}
          </Button>
        </div>
      )}
    </div>
  )
}
