// Transient bottom toasts — e.g. "Couldn't delete" after a failed swipe
// delete, or "Marked paid · Undo". Rendered once by <ToastHost> in the app
// layout; call showToast() from anywhere, including non-React code (the
// query client's global mutation error handler).
//
// Leaf module (no component imports).

import { create } from 'zustand'

export type ToastTone = 'error' | 'info' | 'success'

/** One tap-able action on the toast, e.g. Undo. */
export type ToastAction = { label: string; onClick: () => void }

type Toast = { id: number; message: string; tone: ToastTone; action?: ToastAction }

type ToastStore = {
    toast: Toast | null
    show: (message: string, tone?: ToastTone, action?: ToastAction) => void
    dismiss: () => void
}

let nextId = 1

export const useToastStore = create<ToastStore>((set) => ({
    toast: null,
    // One at a time — a new toast replaces the current one
    show: (message, tone = 'error', action) =>
        set({ toast: { id: nextId++, message, tone, action } }),
    dismiss: () => set({ toast: null }),
}))

export const showToast = (message: string, tone?: ToastTone, action?: ToastAction) =>
    useToastStore.getState().show(message, tone, action)
