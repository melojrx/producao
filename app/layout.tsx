import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Sistema de Controle de Produção',
  description: 'Monitoramento de produção para confecção com QR Code e metas em tempo real',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body suppressHydrationWarning className="flex min-h-full flex-col">
        {children}
      </body>
    </html>
  )
}
