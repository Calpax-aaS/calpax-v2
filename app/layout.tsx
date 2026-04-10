import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Calpax",
  description: "Gestion et planification de vols en montgolfière commerciaux",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
