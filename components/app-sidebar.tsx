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
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

type NavItem = {
  key: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

type NavGroup = {
  label: string | null
  items: NavItem[]
}

export function AppSidebar() {
  const t = useTranslations('nav')
  const locale = useLocale()
  const pathname = usePathname()

  const groups: NavGroup[] = [
    {
      label: null,
      items: [{ key: 'home', href: `/${locale}`, icon: Home }],
    },
    {
      label: 'Activité',
      items: [
        { key: 'billets', href: `/${locale}/billets`, icon: Ticket },
        { key: 'vols', href: `/${locale}/vols`, icon: Plane },
      ],
    },
    {
      label: 'Flotte',
      items: [
        { key: 'ballons', href: `/${locale}/ballons`, icon: Wind },
        { key: 'pilotes', href: `/${locale}/pilotes`, icon: User2 },
        { key: 'equipiers', href: `/${locale}/equipiers`, icon: Users },
        { key: 'vehicules', href: `/${locale}/vehicules`, icon: Truck },
        { key: 'sites', href: `/${locale}/sites`, icon: MapPin },
      ],
    },
    {
      label: 'Administration',
      items: [
        { key: 'settings', href: `/${locale}/settings`, icon: Settings },
        { key: 'rgpd', href: `/${locale}/rgpd`, icon: Shield },
        { key: 'audit', href: `/${locale}/audit`, icon: History },
      ],
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
        {groups.map((group, i) => (
          <SidebarGroup key={group.label ?? 'top'}>
            {group.label && (
              <SidebarGroupLabel className="text-sidebar-muted-foreground">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map(({ key, href, icon: Icon }) => {
                  const isActive =
                    pathname === href || (href !== `/${locale}` && pathname.startsWith(href))
                  return (
                    <SidebarMenuItem key={key}>
                      <SidebarMenuButton isActive={isActive} asChild>
                        <Link href={href}>
                          <Icon className="h-4 w-4" />
                          <span>{t(key)}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  )
}
