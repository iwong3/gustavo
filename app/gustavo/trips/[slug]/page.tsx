import { redirect } from 'next/navigation'

// Trips open straight into the Expenses tool. This redirect keeps old hub
// links and bookmarks working.
export default async function TripHubRedirect({
    params,
}: {
    params: Promise<{ slug: string }>
}) {
    const { slug } = await params
    redirect(`/gustavo/trips/${slug}/expenses`)
}
