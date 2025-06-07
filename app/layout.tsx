import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
    title: 'Gustavo - Track Spending and Split Costs',
    description: 'Track spending and split costs',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    )
}
