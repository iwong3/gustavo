// Transient bottom toasts — e.g. "Couldn't delete" after a failed swipe
// delete. Rendered once by <ToastHost> in the app layout; call showToast()
// from anywhere, including non-React code (the query client's global
// mutation error handler).
//
// Leaf module (no component imports).

import { create } from 'zustand'

export type ToastTone = 'error' | 'info'

type Toast = { id: number; message: string; tone: ToastTone }

type ToastStore = {
    toast: Toast | null
    show: (message: string, tone?: ToastTone) => void
    dismiss: () => void
}

let nextId = 1

export const useToastStore = create<ToastStore>((set) => ({
    toast: null,
    // One at a time — a new toast replaces the current one
    show: (message, tone = 'error') =>
        set({ toast: { id: nextId++, message, tone } }),
    dismiss: () => set({ toast: null }),
}))

export const showToast = (message: string, tone?: ToastTone) =>
    useToastStore.getState().show(message, tone)
