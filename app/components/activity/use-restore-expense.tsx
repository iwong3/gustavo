'use client'

import type { ActivityEntry } from '@/lib/types'
import { ConfirmDeleteDialog } from 'components/confirm-delete-dialog'
import { showToast } from 'components/toast-store'
import { useRefresh } from 'providers/refresh-provider'
import { useCallback, useState } from 'react'
import { restoreExpense } from 'utils/api'

/**
 * Restore a deleted expense from its activity entry: `restore(entry)` asks
 * first (render `dialog`), then restores and refreshes the trip (expenses,
 * balances and the feed all sit under its key).
 */
export function useRestoreExpense(tripId: number) {
    const { onRefresh } = useRefresh()
    const [pending, setPending] = useState<ActivityEntry | null>(null)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Stable, so memoized lists don't re-render on every parent render
    const restore = useCallback((entry: ActivityEntry) => {
        setError(null)
        setPending(entry)
    }, [])

    const confirm = async () => {
        if (!pending) return
        setBusy(true)
        setError(null)
        try {
            await restoreExpense(tripId, pending.recordId)
        } catch (err) {
            setBusy(false)
            setError(err instanceof Error ? err.message : 'Failed to restore expense')
            return
        }
        setBusy(false)
        setPending(null)
        showToast(`Restored ${pending.subject.name}`, 'success')
        onRefresh()
    }

    const dialog = (
        <ConfirmDeleteDialog
            open={pending !== null}
            tone="constructive"
            title="Restore expense?"
            confirmLabel="Restore"
            busyLabel="Restoring..."
            busy={busy}
            error={error}
            onClose={() => setPending(null)}
            onConfirm={confirm}>
            Bring back <b>{pending?.subject.name}</b>? It returns to the
            expenses and balances, split the same way as before.
        </ConfirmDeleteDialog>
    )

    return { restore, restoringId: busy ? pending?.id ?? null : null, dialog }
}
