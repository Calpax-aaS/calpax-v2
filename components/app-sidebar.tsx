'use client'

import { usePathname } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { Home, Wind, User2, Settings } from 'lucide-react'
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
      key: 'settings' as const,
      href: `/${locale}/settings`,
      icon: Settings,
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
                      <span>{t(key)}</span>
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
