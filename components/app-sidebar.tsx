'use client'

import { usePathname } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import {
  Home,
  Wind,
  User2,
  Users,
  Truck,
  MapPin,
  Settings,
  Ticket,
  Shield,
  Plane,
  History,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

export function AppSidebar({ alertCount = 0 }: { alertCount?: number }) {
  const t = useTranslations('nav')
  const locale = useLocale()
  const pathname = usePathname()

  const navItems = [
    {
      key: 'home' as const,
      href: `/${locale}`,
      icon: Home,
    },
    {
      key: 'ballons' as const,
      href: `/${locale}/ballons`,
      icon: Wind,
    },
    {
      key: 'pilotes' as const,
      href: `/${locale}/pilotes`,
      icon: User2,
    },
    {
      key: 'equipiers' as const,
      href: `/${locale}/equipiers`,
      icon: Users,
    },
    {
      key: 'vehicules' as const,
      href: `/${locale}/vehicules`,
      icon: Truck,
    },
    {
      key: 'sites' as const,
      href: `/${locale}/sites`,
      icon: MapPin,
    },
    {
      key: 'billets' as const,
      href: `/${locale}/billets`,
      icon: Ticket,
    },
    {
      key: 'vols' as const,
      href: `/${locale}/vols`,
      icon: Plane,
    },
    {
      key: 'settings' as const,
      href: `/${locale}/settings`,
      icon: Settings,
    },
    {
      key: 'rgpd' as const,
      href: `/${locale}/rgpd`,
      icon: Shield,
    },
    {
      key: 'audit' as const,
      href: `/${locale}/audit`,
      icon: History,
    },
  ]

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-3 border-b">
        <span className="text-lg font-semibold tracking-tight">Calpax</span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(({ key, href, icon: Icon }) => {
                const isActive =
                  pathname === href || (href !== `/${locale}` && pathname.startsWith(href))
                return (
                  <SidebarMenuItem key={key}>
                    <SidebarMenuButton isActive={isActive} render={<Link href={href} />}>
                      <Icon className="h-4 w-4" />
                      <span className="flex-1">{t(key)}</span>
                      {key === 'home' && alertCount > 0 && (
                        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-medium text-white">
                          {alertCount}
                        </span>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
