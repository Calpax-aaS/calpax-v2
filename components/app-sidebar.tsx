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

export function AppSidebar() {
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
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1">
          <span className="text-lg font-bold text-sidebar-primary">Calpax</span>
        </div>
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
                    <SidebarMenuButton isActive={isActive} asChild>
                      <Link href={href}>
                        <Icon className="h-4 w-4" />
                        <span className="flex-1">{t(key)}</span>
                      </Link>
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
