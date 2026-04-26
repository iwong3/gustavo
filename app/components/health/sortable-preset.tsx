'use client'

import { colors } from '@/lib/colors'
import { Box } from '@mui/material'
import { IconGripVertical } from '@tabler/icons-react'
import {
    DndContext,
    closestCenter,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core'
import {
    SortableContext,
    useSortable,
    horizontalListSortingStrategy,
    verticalListSortingStrategy,
    arrayMove,
} from '@dnd-kit/sortable'

// Re-export arrayMove for convenience
export { arrayMove }

function toCssTransform(
    transform: { x: number; y: number; scaleX: number; scaleY: number } | null
): string | undefined {
    if (!transform) return undefined
    return `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0) scaleX(${transform.scaleX}) scaleY(${transform.scaleY})`
}

export function useDndSensors() {
    return useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
    )
}

export function handleDragEnd(
    event: DragEndEvent,
    items: { id: number }[],
    reorder: (from: number, to: number) => void
) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((i) => i.id === Number(active.id))
    const newIndex = items.findIndex((i) => i.id === Number(over.id))
    if (oldIndex !== -1 && newIndex !== -1) reorder(oldIndex, newIndex)
}

// Sortable chip for horizontal preset rows. No `touchAction: none` here —
// the row is horizontally scrollable, so we need the browser to own touch
// gestures until the TouchSensor's 200ms hold threshold activates a drag.
// `touch-action: manipulation` disables double-tap zoom while still allowing
// pan, which is what we want on a mobile list.
export function SortablePresetChip({ id, children }: { id: number; children: React.ReactNode }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
    return (
        <Box
            ref={setNodeRef}
            {...attributes}
            {...listeners}
            sx={{
                transform: toCssTransform(transform),
                transition,
                opacity: isDragging ? 0.5 : 1,
                zIndex: isDragging ? 10 : 'auto',
                touchAction: 'manipulation',
            }}>
            {children}
        </Box>
    )
}

// Sortable row for vertical preset list in drawer
// Drag handle is rendered inside the card via renderHandle prop
export function SortablePresetRow({ id, children }: { id: number; children: React.ReactNode }) {
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id })
    return (
        <Box
            ref={setNodeRef}
            sx={{
                transform: toCssTransform(transform),
                transition,
                opacity: isDragging ? 0.5 : 1,
                zIndex: isDragging ? 10 : 'auto',
            }}>
            {children}
            {/* Hidden activator ref — actual handle rendered via SortableDragHandle */}
            <Box
                ref={setActivatorNodeRef}
                {...attributes}
                {...listeners}
                sx={{ display: 'none' }}
            />
        </Box>
    )
}

/** Drag handle to place inside a SortablePresetRow's card content */
export function SortableDragHandle({ id }: { id: number }) {
    const { attributes, listeners, setActivatorNodeRef } = useSortable({ id })
    return (
        <Box
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            sx={{
                'display': 'flex',
                'alignItems': 'center',
                'cursor': 'grab',
                'touchAction': 'none',
                'color': colors.primaryBrown,
                'flexShrink': 0,
                'py': 0.5,
                '&:active': { cursor: 'grabbing' },
            }}>
            <IconGripVertical size={16} stroke={1.5} />
        </Box>
    )
}

// Horizontal sortable container
export function HorizontalSortableList({
    items,
    onReorder,
    children,
}: {
    items: { id: number }[]
    onReorder: (from: number, to: number) => void
    children: React.ReactNode
}) {
    const sensors = useDndSensors()
    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, items, onReorder)}>
            <SortableContext items={items.map((i) => i.id)} strategy={horizontalListSortingStrategy}>
                {children}
            </SortableContext>
        </DndContext>
    )
}

// Vertical sortable container
export function VerticalSortableList({
    items,
    onReorder,
    children,
}: {
    items: { id: number }[]
    onReorder: (from: number, to: number) => void
    children: React.ReactNode
}) {
    const sensors = useDndSensors()
    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, items, onReorder)}>
            <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                {children}
            </SortableContext>
        </DndContext>
    )
}
