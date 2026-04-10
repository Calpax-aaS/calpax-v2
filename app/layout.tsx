/**
 * Root layout: thin shell required by Next.js App Router.
 * html/lang and body are set in the [locale] layout which wraps every route.
 * This file exists only to satisfy the App Router requirement; it forwards
 * children directly without wrapping in duplicate html/body tags.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>{children}</body>
    </html>
  )
}
