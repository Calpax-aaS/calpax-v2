'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export type PassagerRow = {
  prenom: string
  nom: string
  email: string
  telephone: string
  age: string
  poids: string
  pmr: boolean
}

type Props = {
  passagers: readonly PassagerRow[]
  onChange: (passagers: PassagerRow[]) => void
}

const EMPTY_ROW: PassagerRow = {
  prenom: '',
  nom: '',
  email: '',
  telephone: '',
  age: '',
  poids: '',
  pmr: false,
}

export function PassagerTableEditor({ passagers, onChange }: Props) {
  const t = useTranslations('passagers')

  function addRow() {
    onChange([...passagers, { ...EMPTY_ROW }])
  }

  function removeRow(index: number) {
    onChange(passagers.filter((_, i) => i !== index))
  }

  function updateRow(index: number, field: keyof PassagerRow, value: string | boolean) {
    onChange(passagers.map((row, i) => (i === index ? { ...row, [field]: value } : row)))
  }

  return (
    <div className="space-y-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('fields.prenom')}</TableHead>
            <TableHead>{t('fields.nom')}</TableHead>
            <TableHead>{t('fields.age')}</TableHead>
            <TableHead>{t('fields.poids')}</TableHead>
            <TableHead>{t('fields.pmr')}</TableHead>
            <TableHead>{t('fields.email')}</TableHead>
            <TableHead>{t('fields.telephone')}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {passagers.map((row, i) => (
            <TableRow key={i}>
              <TableCell>
                <Input
                  value={row.prenom}
                  onChange={(e) => updateRow(i, 'prenom', e.target.value)}
                  required
                />
              </TableCell>
              <TableCell>
                <Input
                  value={row.nom}
                  onChange={(e) => updateRow(i, 'nom', e.target.value)}
                  required
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  value={row.age}
                  onChange={(e) => updateRow(i, 'age', e.target.value)}
                  className="w-16"
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  value={row.poids}
                  onChange={(e) => updateRow(i, 'poids', e.target.value)}
                  className="w-20"
                />
              </TableCell>
              <TableCell>
                <input
                  type="checkbox"
                  checked={row.pmr}
                  onChange={(e) => updateRow(i, 'pmr', e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
              </TableCell>
              <TableCell>
                <Input
                  type="email"
                  value={row.email}
                  onChange={(e) => updateRow(i, 'email', e.target.value)}
                />
              </TableCell>
              <TableCell>
                <Input
                  value={row.telephone}
                  onChange={(e) => updateRow(i, 'telephone', e.target.value)}
                />
              </TableCell>
              <TableCell>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeRow(i)}
                  aria-label={t('removeRow')}
                  title={t('removeRow')}
                >
                  X
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Button type="button" variant="outline" size="sm" onClick={addRow}>
        + {t('addRow')}
      </Button>
    </div>
  )
}
