'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { X, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createTag, deleteTag } from '@/lib/actions/tag'

type TagData = { id: string; nom: string; couleur: string | null }

export function TagManager({ tags }: { tags: TagData[] }) {
  const t = useTranslations('tags')
  const [pending, startTransition] = useTransition()
  const [nom, setNom] = useState('')
  const [couleur, setCouleur] = useState('#6366f1')

  function handleCreate() {
    if (!nom.trim()) return
    const formData = new FormData()
    formData.set('nom', nom.trim())
    formData.set('couleur', couleur)
    startTransition(async () => {
      const result = await createTag(formData)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(t('saveSuccess'))
      setNom('')
    })
  }

  function handleDelete(tagId: string) {
    if (!confirm(t('deleteConfirm'))) return
    startTransition(async () => {
      const result = await deleteTag(tagId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(t('deleteSuccess'))
    })
  }

  return (
    <div className="space-y-4">
      {/* Existing tags */}
      <div className="flex flex-wrap gap-2">
        {tags.length === 0 && <p className="text-sm text-muted-foreground">{t('noTags')}</p>}
        {tags.map((tag) => (
          <Badge
            key={tag.id}
            variant="outline"
            className="gap-1 pl-2 pr-1 py-1"
            style={tag.couleur ? { borderColor: tag.couleur, color: tag.couleur } : undefined}
          >
            {tag.nom}
            <button
              onClick={() => handleDelete(tag.id)}
              className="ml-1 rounded-full p-0.5 hover:bg-muted"
              disabled={pending}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>

      {/* Add new tag */}
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Input
            placeholder={t('name')}
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
        </div>
        <Input
          type="color"
          value={couleur}
          onChange={(e) => setCouleur(e.target.value)}
          className="w-12 h-9 p-1 cursor-pointer"
        />
        <Button size="sm" onClick={handleCreate} disabled={pending || !nom.trim()}>
          <Plus className="h-4 w-4 mr-1" />
          {t('add')}
        </Button>
      </div>
    </div>
  )
}
