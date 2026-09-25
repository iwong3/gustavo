'use client'

import { ConfirmDeleteDialog } from 'components/confirm-delete-dialog'

import type { Expense } from '@/lib/types'

type Props = {
    open: boolean
    expense: Expense | null
    onClose: () => void
    onConfirm: () => void
    /** True while the delete request is in flight. */
    busy?: boolean
    /** Why the last attempt failed — shown inline. */
    error?: string | null
}

export default function DeleteExpenseDialog({
    open,
    expense,
    onClose,
    onConfirm,
    busy,
    error,
}: Props) {
    return (
        <ConfirmDeleteDialog
            open={open}
            title="Delete expense?"
            onClose={onClose}
            onConfirm={onConfirm}
            busy={busy}
            error={error}>
            Are you sure you want to delete <strong>{expense?.name}</strong>?
        </ConfirmDeleteDialog>
    )
}
