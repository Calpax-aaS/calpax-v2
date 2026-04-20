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
  User,
  LogOut,
  Globe,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { CalpaxWordmark } from '@/components/brand/calpax-wordmark'
import { StatusDot } from '@/components/cockpit/status-dot'

type NavItem = {
  key: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
}

type NavGroup = {
  label: string | null
  items: NavItem[]
}

type UserRole = 'ADMIN_CALPAX' | 'GERANT' | 'PILOTE' | 'EQUIPIER'

const roleAccess: Record<string, UserRole[]> = {
  home: ['ADMIN_CALPAX', 'GERANT', 'PILOTE', 'EQUIPIER'],
  billets: ['ADMIN_CALPAX', 'GERANT'],
  vols: ['ADMIN_CALPAX', 'GERANT', 'PILOTE', 'EQUIPIER'],
  ballons: ['ADMIN_CALPAX', 'GERANT', 'PILOTE'],
  pilotes: ['ADMIN_CALPAX', 'GERANT', 'PILOTE'],
  equipiers: ['ADMIN_CALPAX', 'GERANT', 'PILOTE'],
  vehicules: ['ADMIN_CALPAX', 'GERANT', 'PILOTE'],
  sites: ['ADMIN_CALPAX', 'GERANT', 'PILOTE'],
  settings: ['ADMIN_CALPAX', 'GERANT'],
  rgpd: ['ADMIN_CALPAX', 'GERANT'],
  audit: ['ADMIN_CALPAX', 'GERANT'],
}

export function AppSidebar({
  userRole,
  exploitantName,
  inFlightCount = 0,
  pendingTicketsCount = 0,
}: {
  userRole?: string
  exploitantName?: string | null
  inFlightCount?: number
  pendingTicketsCount?: number
}) {
  const t = useTranslations('nav')
  const locale = useLocale()
  const pathname = usePathname()

  const groups: NavGroup[] = [
    {
      label: null,
      items: [{ key: 'home', href: `/${locale}`, icon: Home }],
    },
    {
      label: t('groups.activity'),
      items: [
        {
          key: 'billets',
          href: `/${locale}/billets`,
          icon: Ticket,
          badge: pendingTicketsCount > 0 ? pendingTicketsCount : undefined,
        },
        { key: 'vols', href: `/${locale}/vols`, icon: Plane },
      ],
    },
    {
      label: t('groups.fleet'),
      items: [
        { key: 'ballons', href: `/${locale}/ballons`, icon: Wind },
        { key: 'pilotes', href: `/${locale}/pilotes`, icon: User2 },
        { key: 'equipiers', href: `/${locale}/equipiers`, icon: Users },
        { key: 'vehicules', href: `/${locale}/vehicules`, icon: Truck },
        { key: 'sites', href: `/${locale}/sites`, icon: MapPin },
      ],
    },
    {
      label: t('groups.administration'),
      items: [
        { key: 'settings', href: `/${locale}/settings`, icon: Settings },
        { key: 'rgpd', href: `/${locale}/rgpd`, icon: Shield },
        { key: 'audit', href: `/${locale}/audit`, icon: History },
      ],
    },
  ]

  const role = (userRole as UserRole) ?? 'GERANT'
  const filteredGroups = groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        const allowed = roleAccess[item.key]
        return !allowed || allowed.includes(role)
      }),
    }))
    .filter((group) => group.items.length > 0)

  const statusLine = buildStatusLine({ exploitantName, inFlightCount })

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="border-b border-sidebar-border px-2 pb-3 pt-1">
          <CalpaxWordmark
            size={18}
            subtitle={statusLine ?? undefined}
            wordmarkClassName="text-dusk-200"
          />
          {inFlightCount > 0 && (
            <div className="mono cap mt-2 flex items-center gap-1.5 text-[10px] text-dusk-300">
              <StatusDot tone="dusk" pulse size={6} />
              <span>{inFlightCount} en vol</span>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        {filteredGroups.map((group) => (
          <SidebarGroup key={group.label ?? 'top'}>
            {group.label && (
              <SidebarGroupLabel className="cap text-[10px] text-sidebar-muted-foreground">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map(({ key, href, icon: Icon, badge }) => {
                  const isActive =
                    pathname === href || (href !== `/${locale}` && pathname.startsWith(href))
                  return (
                    <SidebarMenuItem key={key}>
                      <SidebarMenuButton
                        isActive={isActive}
                        asChild
                        className="data-[active=true]:border-l-2 data-[active=true]:border-l-dusk-500 data-[active=true]:pl-2"
                      >
                        <Link href={href}>
                          <Icon className="h-4 w-4" />
                          <span className="flex-1">{t(key)}</span>
                          {badge !== undefined && (
                            <span className="mono rounded bg-dusk-500 px-1.5 py-px text-[10px] font-medium text-white">
                              {badge}
                            </span>
                          )}
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
      <SidebarFooter>
        <SidebarMenu>
          {userRole === 'ADMIN_CALPAX' && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href={`/${locale}/admin`}>
                  <Shield className="h-4 w-4" />
                  <span>{t('superAdmin')}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href={`/${locale}/profil`}>
                <User className="h-4 w-4" />
                <span>{t('profil')}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <form action={`/${locale}/signout`} method="POST">
              <SidebarMenuButton type="submit" className="w-full text-sidebar-muted-foreground">
                <LogOut className="h-4 w-4" />
                <span>{t('signout')}</span>
              </SidebarMenuButton>
            </form>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="text-sidebar-muted-foreground">
              <Link href={pathname.replace(`/${locale}`, `/${locale === 'fr' ? 'en' : 'fr'}`)}>
                <Globe className="h-4 w-4" />
                <span>{locale === 'fr' ? 'English' : 'Français'}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

function buildStatusLine({
  exploitantName,
  inFlightCount,
}: {
  exploitantName?: string | null
  inFlightCount: number
}): string | null {
  if (!exploitantName) return null
  if (inFlightCount === 0) return exploitantName
  return exploitantName
}
