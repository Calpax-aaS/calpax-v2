'use client'

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

  const items: NavItem[] = [
    { key: 'dashboard', href: `/${locale}/admin`, icon: LayoutDashboard },
    { key: 'users', href: `/${locale}/admin/users`, icon: Users },
    { key: 'sessions', href: `/${locale}/admin/sessions`, icon: MonitorSmartphone },
    { key: 'audit', href: `/${locale}/admin/audit`, icon: History },
    { key: 'invitations', href: `/${locale}/admin/invitations`, icon: UserPlus },
  ]

  return (
    <aside className="w-56 border-r bg-muted/30 p-4 flex flex-col gap-1">
      <div className="flex items-center gap-2 px-2 py-3 mb-4 border-b">
        <img src="/logo.svg" alt="Calpax" className="h-6 w-6" />
        <span className="text-sm font-bold">Super Admin</span>
      </div>
      {items.map(({ key, href, icon: Icon }) => {
        const isActive =
          pathname === href || (href !== `/${locale}/admin` && pathname.startsWith(href))
        return (
          <Link
            key={key}
            href={href}
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
    </aside>
  )
}
