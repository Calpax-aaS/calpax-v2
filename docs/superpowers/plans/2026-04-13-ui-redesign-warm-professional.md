# UI Redesign "Terre et Ciel" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reskin the entire Calpax app from default grayscale to "Terre et Ciel" (stone/terracotta warm professional) with DM Sans typography and shadcn/ui components, preserving all existing functionality.

**Architecture:** Bottom-up approach -- design tokens first, then migrate 7 Base UI components to shadcn/ui, add 5 new shadcn components, restyle all 27 pages. No functional changes.

**Tech Stack:** Tailwind CSS 4 (OKLch), shadcn/ui (Radix-based), DM Sans (Google Fonts), next/font

**Spec:** `docs/superpowers/specs/2026-04-13-ui-redesign-warm-professional-design.md`

---

## File Map

### Modified files

| File                                                   | Responsibility                                            |
| ------------------------------------------------------ | --------------------------------------------------------- |
| `app/globals.css`                                      | CSS variables (palette Terre et Ciel, light + dark)       |
| `app/layout.tsx`                                       | Font swap Geist -> DM Sans                                |
| `components.json`                                      | shadcn/ui config (style update if needed)                 |
| `package.json`                                         | Remove @base-ui/react, add shadcn deps                    |
| `components/ui/button.tsx`                             | Replace Base UI with shadcn                               |
| `components/ui/input.tsx`                              | Replace Base UI with shadcn                               |
| `components/ui/badge.tsx`                              | Replace Base UI with shadcn, add success/warning variants |
| `components/ui/separator.tsx`                          | Replace Base UI with shadcn                               |
| `components/ui/sheet.tsx`                              | Replace Base UI with shadcn                               |
| `components/ui/tooltip.tsx`                            | Replace Base UI with shadcn                               |
| `components/ui/sidebar.tsx`                            | Replace Base UI hooks with shadcn sidebar                 |
| `components/app-sidebar.tsx`                           | Update imports post-sidebar migration                     |
| `components/alerts-banner.tsx`                         | Replace hardcoded colors with tokens                      |
| `components/week-grid.tsx`                             | Replace hardcoded status colors with tokens               |
| `components/expiry-badge.tsx`                          | Use Badge success/warning variants                        |
| `app/[locale]/(app)/layout.tsx`                        | Update layout for new sidebar                             |
| `app/[locale]/(app)/page.tsx`                          | Dashboard redesign (stats + prochains vols)               |
| `app/[locale]/(app)/billets/page.tsx`                  | Restyle listing                                           |
| `app/[locale]/(app)/billets/[id]/page.tsx`             | Restyle detail                                            |
| `app/[locale]/(app)/billets/[id]/edit/billet-form.tsx` | Select + toast                                            |
| `app/[locale]/(app)/vols/page.tsx`                     | Restyle listing                                           |
| `app/[locale]/(app)/vols/[id]/page.tsx`                | Restyle detail, add Tabs                                  |
| `app/[locale]/(app)/vols/create/vol-create-form.tsx`   | Select + toast                                            |
| `app/[locale]/(app)/vols/[id]/edit/page.tsx`           | Select + toast                                            |
| `app/[locale]/(app)/vols/[id]/organiser/page.tsx`      | Restyle                                                   |
| `app/[locale]/(app)/vols/[id]/post-vol/page.tsx`       | Restyle                                                   |
| `app/[locale]/(app)/ballons/page.tsx`                  | Restyle listing                                           |
| `app/[locale]/(app)/ballons/[id]/page.tsx`             | Restyle detail                                            |
| `app/[locale]/(app)/ballons/[id]/edit/page.tsx`        | Select + toast                                            |
| `app/[locale]/(app)/ballons/[id]/journal/page.tsx`     | Restyle                                                   |
| `app/[locale]/(app)/pilotes/page.tsx`                  | Restyle listing                                           |
| `app/[locale]/(app)/pilotes/[id]/page.tsx`             | Restyle detail                                            |
| `app/[locale]/(app)/pilotes/[id]/edit/page.tsx`        | Select + toast                                            |
| `app/[locale]/(app)/equipiers/page.tsx`                | Restyle                                                   |
| `app/[locale]/(app)/vehicules/page.tsx`                | Restyle                                                   |
| `app/[locale]/(app)/sites/page.tsx`                    | Restyle                                                   |
| `app/[locale]/(app)/settings/page.tsx`                 | Restyle                                                   |
| `app/[locale]/(app)/audit/page.tsx`                    | Restyle                                                   |
| `app/[locale]/(app)/rgpd/page.tsx`                     | Restyle                                                   |

### New files

| File                              | Responsibility                |
| --------------------------------- | ----------------------------- |
| `components/ui/select.tsx`        | shadcn Select component       |
| `components/ui/dialog.tsx`        | shadcn Dialog component       |
| `components/ui/dropdown-menu.tsx` | shadcn DropdownMenu component |
| `components/ui/tabs.tsx`          | shadcn Tabs component         |
| `components/ui/sonner.tsx`        | shadcn Sonner toast wrapper   |

---

## Task 1: Design tokens -- palette and font

**Files:**

- Modify: `app/globals.css`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Replace CSS variables in globals.css with Terre et Ciel palette**

Replace the entire `:root` and `.dark` blocks in `app/globals.css`. Keep the `@import`, `@theme inline`, and base layer sections. Replace only the CSS custom properties inside `:root` and `.dark`:

```css
:root {
  --background: oklch(0.985 0.002 75);
  --foreground: oklch(0.147 0.004 49.25);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.147 0.004 49.25);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.147 0.004 49.25);
  --primary: oklch(0.474 0.137 37.7);
  --primary-foreground: oklch(1 0 0);
  --secondary: oklch(0.97 0.001 75);
  --secondary-foreground: oklch(0.216 0.006 56.04);
  --muted: oklch(0.97 0.001 75);
  --muted-foreground: oklch(0.444 0.011 73.64);
  --accent: oklch(0.98 0.016 73.68);
  --accent-foreground: oklch(0.408 0.114 38.2);
  --destructive: oklch(0.444 0.177 26.9);
  --destructive-foreground: oklch(1 0 0);
  --success: oklch(0.448 0.119 151.33);
  --success-foreground: oklch(1 0 0);
  --warning: oklch(0.477 0.114 68.9);
  --warning-foreground: oklch(1 0 0);
  --info: oklch(0.424 0.161 265.87);
  --info-foreground: oklch(1 0 0);
  --border: oklch(0.922 0.004 67.87);
  --input: oklch(0.869 0.005 56.37);
  --ring: oklch(0.474 0.137 37.7);
  --radius: 0.625rem;
  --font-heading: var(--font-sans);
  --sidebar-background: oklch(0.216 0.006 56.04);
  --sidebar-foreground: oklch(0.922 0.004 67.87);
  --sidebar-primary: oklch(0.474 0.137 37.7);
  --sidebar-primary-foreground: oklch(1 0 0);
  --sidebar-accent: oklch(1 0 0 / 10%);
  --sidebar-accent-foreground: oklch(0.985 0.001 106.42);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.474 0.137 37.7);
  --sidebar-muted-foreground: oklch(1 0 0 / 50%);
  --chart-1: oklch(0.474 0.137 37.7);
  --chart-2: oklch(0.448 0.119 151.33);
  --chart-3: oklch(0.554 0.135 66.44);
  --chart-4: oklch(0.424 0.161 265.87);
  --chart-5: oklch(0.553 0.013 58.07);
}

.dark {
  --background: oklch(0.147 0.004 49.25);
  --foreground: oklch(0.985 0.001 106.42);
  --card: oklch(0.216 0.006 56.04);
  --card-foreground: oklch(0.985 0.001 106.42);
  --popover: oklch(0.216 0.006 56.04);
  --popover-foreground: oklch(0.985 0.001 106.42);
  --primary: oklch(0.548 0.164 38.1);
  --primary-foreground: oklch(1 0 0);
  --secondary: oklch(0.354 0.014 58.07);
  --secondary-foreground: oklch(0.985 0.001 106.42);
  --muted: oklch(0.354 0.014 58.07);
  --muted-foreground: oklch(0.709 0.01 56.26);
  --accent: oklch(0.258 0.067 33.88);
  --accent-foreground: oklch(0.792 0.08 60.82);
  --destructive: oklch(0.577 0.245 27.33);
  --destructive-foreground: oklch(1 0 0);
  --success: oklch(0.627 0.194 149.57);
  --success-foreground: oklch(0.166 0.058 152.09);
  --warning: oklch(0.681 0.162 75.83);
  --warning-foreground: oklch(0.244 0.065 57.59);
  --info: oklch(0.588 0.158 254.13);
  --info-foreground: oklch(0.282 0.091 267.94);
  --border: oklch(0.354 0.014 58.07);
  --input: oklch(0.444 0.011 73.64);
  --ring: oklch(0.548 0.164 38.1);
  --sidebar-background: oklch(0.107 0.005 56.25);
  --sidebar-foreground: oklch(0.922 0.004 67.87);
  --sidebar-primary: oklch(0.548 0.164 38.1);
  --sidebar-primary-foreground: oklch(1 0 0);
  --sidebar-accent: oklch(1 0 0 / 10%);
  --sidebar-accent-foreground: oklch(0.985 0.001 106.42);
  --sidebar-border: oklch(1 0 0 / 15%);
  --sidebar-ring: oklch(0.548 0.164 38.1);
  --sidebar-muted-foreground: oklch(1 0 0 / 50%);
  --chart-1: oklch(0.548 0.164 38.1);
  --chart-2: oklch(0.627 0.194 149.57);
  --chart-3: oklch(0.681 0.162 75.83);
  --chart-4: oklch(0.588 0.158 254.13);
  --chart-5: oklch(0.709 0.01 56.26);
}
```

Also add the new semantic tokens to the `@theme inline` block so Tailwind recognizes them:

```css
--color-success: var(--success);
--color-success-foreground: var(--success-foreground);
--color-warning: var(--warning);
--color-warning-foreground: var(--warning-foreground);
--color-info: var(--info);
--color-info-foreground: var(--info-foreground);
```

- [ ] **Step 2: Swap Geist for DM Sans in app/layout.tsx**

In `app/layout.tsx`, replace:

```typescript
import { Geist } from 'next/font/google'

const geist = Geist({
  variable: '--font-sans',
  subsets: ['latin'],
})
```

With:

```typescript
import { DM_Sans } from 'next/font/google'

const dmSans = DM_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
})
```

And update the className reference from `geist.variable` to `dmSans.variable`.

- [ ] **Step 3: Verify the app builds and renders**

Run: `npm run build` (or `next build`)
Expected: Build succeeds. Open the app in browser -- background should be warm stone (#FAFAF8), text dark stone, no visible regressions.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css app/layout.tsx
git commit -m "feat(ui): apply Terre et Ciel palette and DM Sans typography"
```

---

## Task 2: Install shadcn/ui components (replace Base UI)

**Files:**

- Modify: `components/ui/button.tsx`
- Modify: `components/ui/input.tsx`
- Modify: `components/ui/badge.tsx`
- Modify: `components/ui/separator.tsx`
- Modify: `components/ui/sheet.tsx`
- Modify: `components/ui/tooltip.tsx`
- Modify: `components/ui/sidebar.tsx`
- Modify: `package.json`

- [ ] **Step 1: Install shadcn/ui replacements for all 7 Base UI components**

Run each command. shadcn will overwrite the existing files:

```bash
npx shadcn@latest add button --overwrite
npx shadcn@latest add input --overwrite
npx shadcn@latest add badge --overwrite
npx shadcn@latest add separator --overwrite
npx shadcn@latest add sheet --overwrite
npx shadcn@latest add tooltip --overwrite
npx shadcn@latest add sidebar --overwrite
```

Each command will install the Radix-based shadcn/ui version and any required Radix dependencies.

- [ ] **Step 2: Verify button exports are compatible**

The old button exported `Button` and `buttonVariants`. Check that the new shadcn button also exports both. If `buttonVariants` is missing, add it -- several pages import `buttonVariants` directly (billets/page.tsx, vols/page.tsx, ballons/page.tsx, pilotes/page.tsx, billet detail, vol detail):

```typescript
// Ensure this is exported from the new button.tsx
export { Button, buttonVariants }
```

Also verify the variant names match: `default`, `outline`, `secondary`, `ghost`, `destructive`, `link`. And size names: `default`, `xs`, `sm`, `lg`, `icon`, `icon-xs`, `icon-sm`, `icon-lg`.

shadcn default button has sizes `default`, `sm`, `lg`, `icon`. Add the missing variants:

```typescript
// In the buttonVariants CVA, add under size:
xs: 'h-6 gap-1 rounded-md px-2 text-xs',
'icon-xs': 'size-6',
'icon-sm': 'size-8',
'icon-lg': 'size-12',
```

- [ ] **Step 3: Verify badge exports are compatible**

The old badge exported `Badge` and `badgeVariants`. Check the new shadcn badge does too. Add `success` and `warning` variants to the new badge CVA:

```typescript
const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80',
        outline: 'text-foreground',
        success: 'border-transparent bg-success text-success-foreground shadow hover:bg-success/80',
        warning: 'border-transparent bg-warning text-warning-foreground shadow hover:bg-warning/80',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)
```

Note: the old badge also had `ghost` and `link` variants. Check if anything uses them. If not, drop them.

- [ ] **Step 4: Verify sidebar imports still work**

The sidebar.tsx is the most complex component. After shadcn install, verify that `components/app-sidebar.tsx` still compiles. The key imports it uses:

```typescript
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
  SidebarRail,
} from '@/components/ui/sidebar'
```

Also verify `app/[locale]/(app)/layout.tsx` imports work:

```typescript
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
```

If any export names changed, update the import sites.

- [ ] **Step 5: Remove @base-ui/react dependency**

```bash
npm uninstall @base-ui/react
```

- [ ] **Step 6: Verify no remaining @base-ui imports**

```bash
grep -r "@base-ui" --include="*.tsx" --include="*.ts" .
```

Expected: No results. If any remain, update those files.

- [ ] **Step 7: Build and test**

```bash
npm run build
```

Expected: Build succeeds with no errors. All pages render correctly.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(ui): migrate all components from Base UI to shadcn/ui"
```

---

## Task 3: Add new shadcn/ui components

**Files:**

- Create: `components/ui/select.tsx`
- Create: `components/ui/dialog.tsx`
- Create: `components/ui/dropdown-menu.tsx`
- Create: `components/ui/tabs.tsx`
- Create: `components/ui/sonner.tsx`
- Modify: `app/layout.tsx` (add Toaster)
- Modify: `package.json`

- [ ] **Step 1: Install all 5 new components**

```bash
npx shadcn@latest add select
npx shadcn@latest add dialog
npx shadcn@latest add dropdown-menu
npx shadcn@latest add tabs
npx shadcn@latest add sonner
```

- [ ] **Step 2: Add Toaster to root layout**

In `app/layout.tsx`, add the Sonner Toaster so toasts render globally:

```typescript
import { Toaster } from '@/components/ui/sonner'

// Inside the body, after {children}:
<body className={cn('font-sans antialiased', dmSans.variable)}>
  {children}
  <Toaster />
</body>
```

- [ ] **Step 3: Build and verify**

```bash
npm run build
```

Expected: Build succeeds. New components are available for use.

- [ ] **Step 4: Commit**

```bash
git add components/ui/select.tsx components/ui/dialog.tsx components/ui/dropdown-menu.tsx components/ui/tabs.tsx components/ui/sonner.tsx app/layout.tsx package.json package-lock.json
git commit -m "feat(ui): add Select, Dialog, DropdownMenu, Tabs, and Sonner components"
```

---

## Task 4: Restyle feature components

**Files:**

- Modify: `components/alerts-banner.tsx`
- Modify: `components/week-grid.tsx`
- Modify: `components/expiry-badge.tsx`

- [ ] **Step 1: Replace hardcoded colors in alerts-banner.tsx**

Current severity styles use hardcoded Tailwind classes like `bg-red-50 text-red-800 border-red-200`. Replace with semantic token classes:

```typescript
const severityStyles: Record<AlertSeverity, string> = {
  EXPIRED: 'bg-destructive/10 text-destructive border-destructive/20',
  CRITICAL: 'bg-warning/10 text-warning border-warning/20',
  WARNING: 'bg-accent text-accent-foreground border-accent-foreground/20',
  OK: 'hidden',
}
```

These use the CSS variable tokens defined in globals.css, so they automatically adapt to dark mode.

- [ ] **Step 2: Replace hardcoded border colors in week-grid.tsx**

Current status-to-color mapping uses hardcoded values like `border-blue-400`, `border-green-400`, etc. Replace:

```typescript
const statutBorderColor: Record<string, string> = {
  PLANIFIE: 'border-l-primary',
  CONFIRME: 'border-l-success',
  EN_VOL: 'border-l-info',
  TERMINE: 'border-l-muted-foreground',
  ANNULE: 'border-l-destructive',
}
```

Note: `border-l-primary` etc. use Tailwind's automatic token resolution since we registered these as `--color-*` in the `@theme inline` block.

- [ ] **Step 3: Update expiry-badge.tsx to use Badge variants**

Replace the hardcoded severity-to-class mapping with Badge variants:

```typescript
const severityVariant: Record<string, 'success' | 'warning' | 'destructive' | 'outline'> = {
  OK: 'success',
  WARNING: 'warning',
  CRITICAL: 'destructive',
  EXPIRED: 'destructive',
}
```

Then use `<Badge variant={severityVariant[severity]}>{label}</Badge>` instead of hardcoded Tailwind classes.

- [ ] **Step 4: Build and verify**

```bash
npm run build
```

Expected: Build succeeds. Alerts, week grid, and expiry badges render with the new palette colors.

- [ ] **Step 5: Commit**

```bash
git add components/alerts-banner.tsx components/week-grid.tsx components/expiry-badge.tsx
git commit -m "feat(ui): align feature components with Terre et Ciel tokens"
```

---

## Task 5: Restyle app sidebar

**Files:**

- Modify: `components/app-sidebar.tsx`

- [ ] **Step 1: Update the sidebar logo and alert badge**

In `components/app-sidebar.tsx`, the alert badge currently uses `bg-red-500`. Replace with `bg-destructive`. Also add the Calpax logo text in sidebar-primary color:

In the `SidebarHeader`, replace the current content with:

```tsx
<SidebarHeader>
  <div className="flex items-center gap-2 px-2 py-1">
    <span className="text-lg font-bold text-sidebar-primary">Calpax</span>
  </div>
</SidebarHeader>
```

For the alert badge counter, replace `bg-red-500 text-white` with `bg-destructive text-destructive-foreground`.

- [ ] **Step 2: Build and verify sidebar renders correctly**

```bash
npm run build
```

Open app in browser. Sidebar should have stone-900 background, terracotta logo, and properly colored alert badge.

- [ ] **Step 3: Commit**

```bash
git add components/app-sidebar.tsx
git commit -m "feat(ui): restyle sidebar with Terre et Ciel branding"
```

---

## Task 6: Restyle listing pages

**Files:**

- Modify: `app/[locale]/(app)/billets/page.tsx`
- Modify: `app/[locale]/(app)/vols/page.tsx`
- Modify: `app/[locale]/(app)/ballons/page.tsx`
- Modify: `app/[locale]/(app)/pilotes/page.tsx`
- Modify: `app/[locale]/(app)/equipiers/page.tsx`
- Modify: `app/[locale]/(app)/vehicules/page.tsx`
- Modify: `app/[locale]/(app)/sites/page.tsx`

- [ ] **Step 1: Apply consistent listing page structure to billets/page.tsx**

Each listing page should follow the pattern:

```tsx
<div className="space-y-6">
  <div className="flex items-center justify-between">
    <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
    <Link href={createUrl} className={buttonVariants({ variant: 'default' })}>
      {createLabel}
    </Link>
  </div>
  <Card>
    <CardContent className="p-0">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
              {columnLabel}
            </TableHead>
            ...
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id} className="hover:bg-muted/50">
              ...
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
</div>
```

Key changes to billets/page.tsx:

- Wrap table in `<Card><CardContent className="p-0">` for elevation
- Add `text-xs uppercase tracking-wider text-muted-foreground` to table headers
- Add `hover:bg-muted/50` to table rows
- Map billet statut to correct Badge variants: EN_ATTENTE -> outline, PLANIFIE -> default, CONFIRME -> success, VOLE -> secondary, ANNULE/REMBOURSE/EXPIRE -> destructive
- Import Card and CardContent from `@/components/ui/card`

- [ ] **Step 2: Apply same pattern to ballons/page.tsx**

Same Card wrapper, uppercase headers, hover rows. No statut badge changes needed (uses ExpiryBadge which was already updated in Task 4).

- [ ] **Step 3: Apply same pattern to pilotes/page.tsx**

Same Card wrapper, uppercase headers, hover rows.

- [ ] **Step 4: Apply same pattern to vols/page.tsx**

The vols page uses WeekGrid rather than a table. Wrap the navigation controls and WeekGrid in a Card:

```tsx
<div className="space-y-6">
  <div className="flex items-center justify-between">
    <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
    <Link href={createUrl} className={buttonVariants({ variant: 'default' })}>
      {t('create')}
    </Link>
  </div>
  <Card>
    <CardContent className="p-4">
      {/* week navigation controls */}
      <WeekGrid ... />
    </CardContent>
  </Card>
</div>
```

- [ ] **Step 5: Apply same pattern to equipiers, vehicules, sites pages**

These are simpler listing pages. Apply the same Card + Table structure, uppercase headers, hover rows.

- [ ] **Step 6: Build and verify all listing pages**

```bash
npm run build
```

Navigate to each listing page in browser. Verify consistent styling.

- [ ] **Step 7: Commit**

```bash
git add app/[locale]/(app)/billets/page.tsx app/[locale]/(app)/vols/page.tsx app/[locale]/(app)/ballons/page.tsx app/[locale]/(app)/pilotes/page.tsx app/[locale]/(app)/equipiers/page.tsx app/[locale]/(app)/vehicules/page.tsx app/[locale]/(app)/sites/page.tsx
git commit -m "feat(ui): restyle all listing pages with Card wrappers and consistent headers"
```

---

## Task 7: Restyle detail pages

**Files:**

- Modify: `app/[locale]/(app)/billets/[id]/page.tsx`
- Modify: `app/[locale]/(app)/vols/[id]/page.tsx`
- Modify: `app/[locale]/(app)/ballons/[id]/page.tsx`
- Modify: `app/[locale]/(app)/pilotes/[id]/page.tsx`

- [ ] **Step 1: Restyle billets/[id]/page.tsx**

Apply detail page structure:

- Header with h1 + action buttons (Editer, Supprimer) aligned right
- Replace any hardcoded colors with Badge variants
- Ensure Card components use design tokens
- Add `text-xs uppercase tracking-wider text-muted-foreground` to all data labels

```tsx
<div className="space-y-6">
  <div className="flex items-center justify-between">
    <h1 className="text-3xl font-bold tracking-tight">Billet {billet.reference}</h1>
    <div className="flex gap-2">
      <Link href={editUrl} className={buttonVariants({ variant: 'outline' })}>
        Editer
      </Link>
    </div>
  </div>
  {/* Card sections for billet info, passagers, paiements */}
</div>
```

- [ ] **Step 2: Restyle vols/[id]/page.tsx**

Same header structure. Remove hardcoded `bg-green-600 text-white hover:bg-green-700` for the CONFIRME button -- replace with:

```tsx
className={buttonVariants({ variant: 'default' })}
```

Or use the success semantic color if it needs to stand out:

```tsx
className = 'bg-success text-success-foreground hover:bg-success/90'
```

Add Tabs component to organize sections (infos, passagers, meteo, documents):

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

;<Tabs defaultValue="infos">
  <TabsList>
    <TabsTrigger value="infos">Informations</TabsTrigger>
    <TabsTrigger value="passagers">Passagers</TabsTrigger>
    <TabsTrigger value="meteo">Meteo</TabsTrigger>
    <TabsTrigger value="documents">Documents</TabsTrigger>
  </TabsList>
  <TabsContent value="infos">
    <Card>...</Card>
  </TabsContent>
  <TabsContent value="passagers">
    <Card>...</Card>
  </TabsContent>
  {/* etc */}
</Tabs>
```

- [ ] **Step 3: Restyle ballons/[id]/page.tsx and pilotes/[id]/page.tsx**

Same header + Card section pattern. Ensure ExpiryBadge renders with updated variants (already handled in Task 4).

- [ ] **Step 4: Build and verify all detail pages**

```bash
npm run build
```

Navigate to each detail page. Verify header, Cards, and Tabs render correctly.

- [ ] **Step 5: Commit**

```bash
git add app/[locale]/(app)/billets/[id]/page.tsx app/[locale]/(app)/vols/[id]/page.tsx app/[locale]/(app)/ballons/[id]/page.tsx app/[locale]/(app)/pilotes/[id]/page.tsx
git commit -m "feat(ui): restyle detail pages with header, Cards, and Tabs"
```

---

## Task 8: Restyle form pages with Select and Toast

**Files:**

- Modify: `app/[locale]/(app)/billets/[id]/edit/billet-form.tsx`
- Modify: `app/[locale]/(app)/vols/create/vol-create-form.tsx`
- Modify: `app/[locale]/(app)/vols/[id]/edit/page.tsx`
- Modify: `app/[locale]/(app)/ballons/[id]/edit/page.tsx`
- Modify: `app/[locale]/(app)/pilotes/[id]/edit/page.tsx`
- Modify: `components/paiement-form.tsx`
- Modify: `components/passager-table-editor.tsx`

- [ ] **Step 1: Replace native <select> with shadcn Select in billet-form.tsx**

Find all `<select>` or native select elements and replace with:

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

;<Select value={field.value} onValueChange={field.onChange}>
  <SelectTrigger>
    <SelectValue placeholder="Selectionner..." />
  </SelectTrigger>
  <SelectContent>
    {options.map((opt) => (
      <SelectItem key={opt.value} value={opt.value}>
        {opt.label}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

This works with react-hook-form's `Controller` component since it uses `value`/`onValueChange` instead of `onChange` event.

- [ ] **Step 2: Add toast feedback to billet-form.tsx**

After successful save action, show a toast:

```tsx
import { toast } from 'sonner'

// After successful server action:
toast.success('Billet enregistre')

// On error:
toast.error('Erreur lors de la sauvegarde')
```

- [ ] **Step 3: Apply same Select + Toast pattern to vol-create-form.tsx**

Replace native selects for ballon, pilote, equipier, vehicule, site selection. Add toast after save.

- [ ] **Step 4: Apply same pattern to vol/edit, ballon/edit, pilote/edit pages**

Replace any native selects and add toast feedback.

- [ ] **Step 5: Update paiement-form.tsx**

Replace the native `<select>` for payment mode (especes/CB/virement/cheque) with shadcn Select. Add toast on payment recorded.

- [ ] **Step 6: Restyle passager-table-editor.tsx**

Ensure the inline editing table uses the themed Input and Button components. The table already imports from `@/components/ui` so it should pick up the new shadcn versions automatically.

- [ ] **Step 7: Apply consistent label styling across all forms**

All `<Label>` elements in forms should use:

```tsx
<Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
  {label}
</Label>
```

- [ ] **Step 8: Build and test all forms**

```bash
npm run build
```

Navigate to each edit/create page. Verify Selects render, form submission works, toasts appear.

- [ ] **Step 9: Commit**

```bash
git add app/[locale]/(app)/billets/[id]/edit/billet-form.tsx app/[locale]/(app)/vols/create/vol-create-form.tsx app/[locale]/(app)/vols/[id]/edit/page.tsx app/[locale]/(app)/ballons/[id]/edit/page.tsx app/[locale]/(app)/pilotes/[id]/edit/page.tsx components/paiement-form.tsx components/passager-table-editor.tsx
git commit -m "feat(ui): replace native selects with shadcn Select, add toast feedback"
```

---

## Task 9: Restyle remaining pages

**Files:**

- Modify: `app/[locale]/(app)/vols/[id]/organiser/page.tsx`
- Modify: `app/[locale]/(app)/vols/[id]/post-vol/page.tsx`
- Modify: `app/[locale]/(app)/ballons/[id]/journal/page.tsx`
- Modify: `app/[locale]/(app)/settings/page.tsx`
- Modify: `app/[locale]/(app)/audit/page.tsx`
- Modify: `app/[locale]/(app)/rgpd/page.tsx`

- [ ] **Step 1: Restyle vols/[id]/organiser/page.tsx**

Apply Card wrappers around passenger assignment sections. Ensure billet-assign-card.tsx renders with themed components.

- [ ] **Step 2: Restyle vols/[id]/post-vol/page.tsx**

Apply Card wrapper around the post-vol form. Ensure form inputs use themed components.

- [ ] **Step 3: Restyle ballons/[id]/journal/page.tsx**

Apply Card + Table pattern for journal entries.

- [ ] **Step 4: Restyle settings/page.tsx**

Apply Card sections for settings groups.

- [ ] **Step 5: Restyle audit/page.tsx**

Apply Card + Table pattern for audit log entries. Uppercase headers, hover rows.

- [ ] **Step 6: Restyle rgpd/page.tsx**

Apply Card sections for RGPD data management.

- [ ] **Step 7: Build and verify**

```bash
npm run build
```

Check all remaining pages render correctly.

- [ ] **Step 8: Commit**

```bash
git add app/[locale]/(app)/vols/[id]/organiser/page.tsx app/[locale]/(app)/vols/[id]/post-vol/page.tsx app/[locale]/(app)/ballons/[id]/journal/page.tsx app/[locale]/(app)/settings/page.tsx app/[locale]/(app)/audit/page.tsx app/[locale]/(app)/rgpd/page.tsx
git commit -m "feat(ui): restyle organiser, post-vol, journal, settings, audit, rgpd pages"
```

---

## Task 10: Dashboard redesign

**Files:**

- Modify: `app/[locale]/(app)/page.tsx`

- [ ] **Step 1: Redesign the dashboard with stats and upcoming flights**

Replace the current minimal dashboard (just username + sign-out) with:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// Fetch stats from DB (same requireAuth pattern as existing pages)
const billetsEnAttente = await prisma.billet.count({
  where: { exploitantId, statut: 'EN_ATTENTE' },
})
const volsCetteSemaine = await prisma.vol.count({
  where: {
    exploitantId,
    date: { gte: startOfWeek, lte: endOfWeek },
  },
})
const alertCount = alerts.length

const prochVols = await prisma.vol.findMany({
  where: {
    exploitantId,
    date: { gte: today },
    statut: { not: 'ANNULE' },
  },
  orderBy: { date: 'asc' },
  take: 5,
  include: { ballon: true, pilote: true, _count: { select: { passagers: true } } },
})
```

Layout:

```tsx
<div className="space-y-6">
  <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>

  {/* Stats row */}
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Billets en attente
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-primary">{billetsEnAttente}</div>
      </CardContent>
    </Card>
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Vols cette semaine
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{volsCetteSemaine}</div>
      </CardContent>
    </Card>
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Alertes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-destructive">{alertCount}</div>
      </CardContent>
    </Card>
  </div>

  {/* Prochains vols */}
  <Card>
    <CardHeader>
      <CardTitle>Prochains vols</CardTitle>
    </CardHeader>
    <CardContent className="p-0">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
              Date
            </TableHead>
            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
              Creneau
            </TableHead>
            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
              Ballon
            </TableHead>
            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
              Pilote
            </TableHead>
            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
              Passagers
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {prochVols.map((vol) => (
            <TableRow key={vol.id} className="hover:bg-muted/50">
              <TableCell>{formatDate(vol.date)}</TableCell>
              <TableCell>
                <Badge variant="outline">{vol.creneau}</Badge>
              </TableCell>
              <TableCell>{vol.ballon.nom}</TableCell>
              <TableCell>
                {vol.pilote?.prenom} {vol.pilote?.nom}
              </TableCell>
              <TableCell>{vol._count.passagers}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
</div>
```

Keep the sign-out functionality accessible (move to sidebar user menu or settings page).

- [ ] **Step 2: Build and verify dashboard**

```bash
npm run build
```

Navigate to dashboard. Verify stats cards, upcoming flights table, and alert count render correctly with data from DB.

- [ ] **Step 3: Commit**

```bash
git add app/[locale]/(app)/page.tsx
git commit -m "feat(ui): redesign dashboard with stats cards and upcoming flights"
```

---

## Task 11: Final cleanup and verification

**Files:**

- Modify: `package.json` (verify @base-ui removed)

- [ ] **Step 1: Grep for any remaining hardcoded colors**

```bash
grep -rn "bg-red-\|bg-green-\|bg-blue-\|bg-amber-\|bg-yellow-\|bg-orange-\|border-blue-\|border-green-\|border-amber-\|border-gray-" --include="*.tsx" app/ components/
```

Any matches should be replaced with design token equivalents. Ignore any in test files or PDF generation files (`lib/pdf/`).

- [ ] **Step 2: Grep for any remaining @base-ui imports**

```bash
grep -rn "@base-ui" --include="*.tsx" --include="*.ts" .
```

Expected: No results.

- [ ] **Step 3: Verify @base-ui/react is not in package.json**

```bash
grep "base-ui" package.json
```

Expected: No results.

- [ ] **Step 4: Full build**

```bash
npm run build
```

Expected: Clean build with no errors and no warnings related to missing modules.

- [ ] **Step 5: Run existing tests**

```bash
npm test
```

Expected: All existing tests pass. No test should break since we only changed styling, not functionality.

- [ ] **Step 6: Manual visual check**

Open the app and navigate through:

1. Dashboard -- stats cards, upcoming flights
2. Billets listing -- Card table, badges
3. Billet detail -- Cards, paiements
4. Vols listing -- WeekGrid with themed status borders
5. Vol detail -- Tabs, Cards
6. Ballons listing -- ExpiryBadge
7. Settings page
8. Toggle dark mode -- verify all pages look correct

- [ ] **Step 7: Commit any remaining fixes**

```bash
git add -A
git commit -m "chore(ui): final cleanup and hardcoded color removal"
```
