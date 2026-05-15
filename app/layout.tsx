import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'DocuMind — SettleSettle Integration Test',
  description: 'AI Document tools powered by SettleSettle credits',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className={`${inter.className} bg-gray-50 text-gray-900 min-h-full flex flex-col`}>
        {children}
      </body>
    </html>
  )
}
