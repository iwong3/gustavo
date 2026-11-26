'use client'

import { Component, type ReactNode } from 'react'

/**
 * Contains a render crash to one list row. Expense data comes from many
 * hands (Google Places JSON, old imports, the API) and a single row that
 * throws while rendering would otherwise unmount the whole page into Next's
 * "Application error" screen — one bad expense blanking a trip's list. The
 * fallback keeps the rest of the list usable; the error still reaches the
 * console for debugging.
 */
export class RowErrorBoundary extends Component<
    { fallback: ReactNode; children: ReactNode },
    { failed: boolean }
> {
    state = { failed: false }

    static getDerivedStateFromError() {
        return { failed: true }
    }

    componentDidCatch(error: unknown) {
        console.error('List row failed to render:', error)
    }

    render() {
        return this.state.failed ? this.props.fallback : this.props.children
    }
}
