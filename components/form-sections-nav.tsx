'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

type Section = {
  id: string
  label: string
}

type Props = {
  sections: Section[]
  className?: string
}

/**
 * Sticky top navigation for long single-page forms with multiple Card
 * sections (cf. issue #6). Shows "1 · Label" pills linked to `#id`
 * anchors and highlights the section currently closest to the top of
 * the viewport via IntersectionObserver.
 *
 * Drop-in: render just above the form and give each Card an `id`
 * matching a section in the list.
 */
export function FormSectionsNav({ sections, className }: Props) {
  const [activeId, setActiveId] = useState<string | null>(sections[0]?.id ?? null)

  useEffect(() => {
    if (sections.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting)
        if (visible) setActiveId(visible.target.id)
      },
      { rootMargin: '-30% 0% -60% 0%', threshold: 0 },
    )
    for (const s of sections) {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [sections])

  return (
    <nav
      aria-label="Form sections"
      className={cn(
        'sticky top-0 z-30 -mx-6 mb-2 flex gap-1 overflow-x-auto border-b border-sky-100 bg-card/95 px-6 py-2 backdrop-blur',
        className,
      )}
    >
      {sections.map((s, index) => (
        <a
          key={s.id}
          href={`#${s.id}`}
          aria-current={activeId === s.id ? 'step' : undefined}
          className={cn(
            'mono cap inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-[10px] transition-colors',
            activeId === s.id
              ? 'bg-dusk-100 text-dusk-700'
              : 'text-sky-500 hover:bg-sky-50 hover:text-sky-700',
          )}
        >
          <span className="font-semibold">{index + 1}</span>
          <span className="opacity-40">·</span>
          <span>{s.label}</span>
        </a>
      ))}
    </nav>
  )
}
