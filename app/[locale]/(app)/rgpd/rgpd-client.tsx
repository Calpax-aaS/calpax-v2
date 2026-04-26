'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfirmDialog } from '@/components/confirm-dialog'
import {
  searchPassagers,
  exportPassagerData,
  anonymisePassager,
  type PassagerSearchResult,
} from '@/lib/actions/rgpd'

export function RgpdClient() {
  const t = useTranslations('rgpd')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PassagerSearchResult[]>([])
  const [searched, setSearched] = useState(false)

  async function handleSearch() {
    const data = await searchPassagers(query)
    setResults(data)
    setSearched(true)
  }

  async function handleExport(passagerId: string) {
    const json = await exportPassagerData(passagerId)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `passager-${passagerId}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleAnonymise(passagerId: string) {
    await anonymisePassager(passagerId)
    await handleSearch()
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('searchPlaceholder')}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <Button onClick={handleSearch}>{t('search')}</Button>
      </div>

      {searched && results.length === 0 && (
        <p className="text-muted-foreground">{t('noResults')}</p>
      )}

      {results.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Billet</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  {r.prenom} {r.nom}
                </TableCell>
                <TableCell>{r.email ?? '—'}</TableCell>
                <TableCell>{r.billetReference}</TableCell>
                <TableCell className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => handleExport(r.id)}>
                    {t('actions.export')}
                  </Button>
                  <ConfirmDialog
                    title={t('actions.confirmAnonymiseTitle')}
                    description={t('actions.confirmAnonymise')}
                    confirmLabel={t('actions.anonymise')}
                    destructive
                    onConfirm={() => handleAnonymise(r.id)}
                    trigger={
                      <Button size="sm" variant="destructive">
                        {t('actions.anonymise')}
                      </Button>
                    }
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
