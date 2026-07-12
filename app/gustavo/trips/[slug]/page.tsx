import { redirect } from 'next/navigation'

// Trips now open straight into the Expenses tool; the old hub content lives
// at /details (reachable via the header tool switcher). This redirect keeps
// old links and bookmarks working.
export default async function TripHubRedirect({
    params,
}: {
    params: Promise<{ slug: string }>
}) {
    const { slug } = await params
    redirect(`/gustavo/trips/${slug}/expenses`)
}
