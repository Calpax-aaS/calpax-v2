'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  LayoutDashboard,
  Users,
  MonitorSmartphone,
  History,
  UserPlus,
  ArrowLeft,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type NavItem = {
  key: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

export function AdminNav({ locale }: { locale: string }) {
  const t = useTranslations('admin.nav')
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const items: NavItem[] = [
    { key: 'dashboard', href: `/${locale}/admin`, icon: LayoutDashboard },
    { key: 'users', href: `/${locale}/admin/users`, icon: Users },
    { key: 'sessions', href: `/${locale}/admin/sessions`, icon: MonitorSmartphone },
    { key: 'audit', href: `/${locale}/admin/audit`, icon: History },
    { key: 'invitations', href: `/${locale}/admin/invitations`, icon: UserPlus },
  ]

  const navContent = (
    <>
      <div className="flex items-center justify-between gap-2 px-2 py-3 mb-4 border-b">
        <div className="flex items-center gap-2">
          <Image src="/logo.svg" alt="Calpax" width={24} height={24} className="h-6 w-6" />
          <span className="text-sm font-bold">Super Admin</span>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="md:hidden p-1"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      {items.map(({ key, href, icon: Icon }) => {
        const isActive =
          pathname === href || (href !== `/${locale}/admin` && pathname.startsWith(href))
        return (
          <Link
            key={key}
            href={href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{t(key)}</span>
          </Link>
        )
      })}
      <div className="mt-auto pt-4 border-t space-y-1">
        <Link
          href={`/${locale}`}
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{t('backToApp')}</span>
        </Link>
        <form action={`/${locale}/signout`} method="POST">
          <button
            type="submit"
            className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>{t('signout')}</span>
          </button>
        </form>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-20 flex h-12 items-center gap-2 border-b bg-background px-4">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="p-1"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="text-sm font-semibold text-primary">Super Admin</span>
      </header>

      {/* Mobile drawer backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          'md:hidden fixed inset-y-0 left-0 z-40 w-64 bg-muted/95 backdrop-blur p-4 flex flex-col gap-1 transition-transform',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {navContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 border-r bg-muted/30 p-4 flex-col gap-1">
        {navContent}
      </aside>
    </>
  )
}
