import type { Metadata } from 'next'
import { Archivo, DM_Sans, Geist_Mono } from 'next/font/google'
import { cn } from '@/lib/utils'
import { Toaster } from '@/components/ui/sonner'

export const metadata: Metadata = {
  title: 'Calpax',
  description: 'Gestion de vols en montgolfiere',
}

// DM Sans = body UI (doux, lisible)
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-sans', display: 'swap' })
// Archivo = display (titres, wordmark, hero)
const archivo = Archivo({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})
// Geist Mono = data tabulaire (immats, heures, masses)
const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

/**
 * Root layout: thin shell required by Next.js App Router.
 * html/lang and body are set in the [locale] layout which wraps every route.
 * This file exists only to satisfy the App Router requirement; it forwards
 * children directly without wrapping in duplicate html/body tags.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className={cn('font-sans', dmSans.variable, archivo.variable, geistMono.variable)}>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
