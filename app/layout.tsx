import { DM_Sans } from 'next/font/google'
import { cn } from '@/lib/utils'
import { Toaster } from '@/components/ui/sonner'

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-sans' })

/**
 * Root layout: thin shell required by Next.js App Router.
 * html/lang and body are set in the [locale] layout which wraps every route.
 * This file exists only to satisfy the App Router requirement; it forwards
 * children directly without wrapping in duplicate html/body tags.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className={cn('font-sans', dmSans.variable)}>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
