import { redirect } from 'next/navigation'

// The trip details page is gone — everything it showed is on the trip's
// boarding pass in the Trips list, and its Edit / Delete moved to Edit Trip
// (tap the trip name in the header). This keeps old links and restored
// sessions working.
export default async function TripDetailsRedirect({
    params,
}: {
    params: Promise<{ slug: string }>
}) {
    const { slug } = await params
    redirect(`/gustavo/trips/${slug}/expenses`)
}
