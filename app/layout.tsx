import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Book Recommender Bot',
  description: 'Get personalized book recommendations from your Kindle library',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900">{children}</body>
    </html>
  )
}

