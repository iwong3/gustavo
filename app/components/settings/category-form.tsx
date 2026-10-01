'use client'

import { Box, Button, TextField, Typography } from '@mui/material'
import { IconCheck, IconTrash } from '@tabler/icons-react'
import { useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'

import {
    CATEGORY_COLORS,
    CATEGORY_ICON_GROUPS,
    DEFAULT_CATEGORY_ICON,
    getCategoryLook,
    type CategoryIconName,
} from '@/lib/category-icons'
import { colors, pressIconSx, toneColors } from '@/lib/colors'
import { errorFieldSx, errorLabelSx, fieldSx, labelSx } from '@/lib/form-styles'
import { queryKeys } from '@/lib/query-keys'
import type { ExpenseCategoryWithMeta } from '@/lib/types'
import { ConfirmDeleteDialog } from 'components/confirm-delete-dialog'
import { FormPage } from 'components/form-page'
import { CategoryTile, shareLabel } from 'components/settings/category-tile'
import { CategoryGlyph } from 'utils/category-icons'
import { ConflictError } from 'utils/api'
import { getContrastText } from 'utils/icons'
import { deleteErrorMessage } from 'utils/delete-error'

const groupLabelSx = { fontSize: 11.5, fontWeight: 600, color: 'text.secondary', marginBottom: 0.75 } as const
// Icons 7 across (~42px circles on a phone); colors 6 across
const iconGridSx = { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 } as const
const colorGridSx = { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 1.25 } as const

async function saveCategory(
    category: ExpenseCategoryWithMeta | undefined,
    body: { name: string; icon: string; color: string }
) {
    const res = await fetch(
        category ? `/api/expense-categories/${category.id}` : '/api/expense-categories',
        {
            method: category ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(category ? { ...body, expectedUpdatedAt: category.updatedAt } : body),
        }
    )
    if (res.ok) return
    const data = await res.json().catch(() => ({}))
    if (res.status === 409 && data.error === 'conflict') throw new ConflictError(data.message)
    throw new Error(data.error || 'Failed to save')
}

async function deleteCategory(category: ExpenseCategoryWithMeta) {
    const res = await fetch(
        `/api/expense-categories/${category.id}?expectedUpdatedAt=${encodeURIComponent(category.updatedAt)}`,
        { method: 'DELETE' }
    )
    if (res.status === 409) throw new ConflictError('conflict')
    if (!res.ok) throw new Error('Failed to delete')
}

/**
 * New / Edit category: name, icon (the curated Phosphor list, grouped —
 * today's looks first) and color, over a live tile preview. Edit adds a
 * danger-zone Delete. Saving refreshes the category list before leaving,
 * and marks trips stale so expense rows pick up the new look.
 */
export function CategoryForm({
    category,
    categories,
    onCancel,
    onSuccess,
    onDeleted,
}: {
    /** Omitted = New category. */
    category?: ExpenseCategoryWithMeta
    /** Every category — for "used by another" dots and duplicate names. */
    categories: ExpenseCategoryWithMeta[]
    onCancel: () => void
    onSuccess: () => void
    onDeleted: () => void
}) {
    const queryClient = useQueryClient()
    const others = useMemo(
        () => categories.filter((c) => String(c.id) !== String(category?.id)),
        [categories, category?.id]
    )
    const start = category ? getCategoryLook(category.name, category.icon, category.color) : null
    const [name, setName] = useState(category?.name ?? '')
    const [icon, setIcon] = useState<CategoryIconName>(start?.icon ?? DEFAULT_CATEGORY_ICON)
    // A new category starts on the first color nobody uses yet
    const [color, setColor] = useState<string>(
        () =>
            start?.color ??
            CATEGORY_COLORS.find((c) => !others.some((o) => o.color?.toLowerCase() === c)) ??
            CATEGORY_COLORS[0]
    )
    const [attempted, setAttempted] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | undefined>()
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [deleteError, setDeleteError] = useState<string | null>(null)

    const takenIcons = useMemo(
        () => new Set(others.map((o) => getCategoryLook(o.name, o.icon, o.color).icon)),
        [others]
    )
    const trimmed = name.trim()
    const duplicate = others.some((o) => o.name.toLowerCase() === trimmed.toLowerCase())
    const nameInvalid = attempted && (!trimmed || duplicate)

    const refreshAfterChange = async () => {
        // Expense rows carry their category's look — let trips refetch
        queryClient.invalidateQueries({ queryKey: queryKeys.trips.all })
        queryClient.invalidateQueries({ queryKey: queryKeys.expenseCategories.list() })
        // The list is behind this page (off-screen lists don't refetch on
        // invalidate) — wait for it so it shows the change on arrival
        await queryClient.refetchQueries({ queryKey: queryKeys.expenseCategories.listWithMeta() })
    }

    const handleSubmit = async () => {
        setAttempted(true)
        if (!trimmed) return setError('Give it a name.')
        if (duplicate) return setError(`"${trimmed}" already exists.`)
        setSaving(true)
        setError(undefined)
        try {
            await saveCategory(category, { name: trimmed, icon, color })
            await refreshAfterChange()
            onSuccess()
        } catch (err) {
            setSaving(false)
            if (err instanceof ConflictError) {
                queryClient.invalidateQueries({ queryKey: queryKeys.expenseCategories.all })
                setError('Someone else changed this category. Go back and try again.')
            } else {
                setError(err instanceof Error && err.message !== 'Failed to save' ? `${err.message}.` : "Couldn't save. Try again.")
            }
        }
    }

    const handleDelete = async () => {
        if (!category) return
        setDeleting(true)
        setDeleteError(null)
        try {
            await deleteCategory(category)
            await refreshAfterChange()
            onDeleted()
        } catch (err) {
            setDeleting(false)
            setDeleteError(deleteErrorMessage(err, 'category'))
        }
    }

    const total = categories.reduce((t, c) => t + c.usageCount, 0)
    const count = category?.usageCount ?? 0

    return (
        <FormPage
            title={category ? 'Edit category' : 'New category'}
            error={error}
            onCancel={onCancel}
            onSubmit={handleSubmit}
            busy={saving || deleting}
            submitLabel={saving ? 'Saving...' : category ? 'Save' : 'Add'}>
            {/* Live preview */}
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <Box sx={{ width: 168 }}>
                    <CategoryTile
                        name={trimmed}
                        icon={icon}
                        color={color}
                        count={count}
                        caption={category ? shareLabel(count, total) : 'Not used yet'}
                    />
                </Box>
            </Box>

            <Box>
                <Typography sx={nameInvalid ? errorLabelSx : labelSx}>Name *</Typography>
                <TextField
                    value={name}
                    onChange={(e) => {
                        setName(e.target.value)
                        setError(undefined)
                    }}
                    placeholder="e.g. Groceries"
                    size="small"
                    fullWidth
                    autoComplete="off"
                    slotProps={{ htmlInput: { maxLength: 100 } }}
                    sx={nameInvalid ? errorFieldSx : fieldSx}
                />
            </Box>

            <Box>
                <Typography sx={labelSx}>Icon</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, paddingTop: 0.5 }}>
                    {CATEGORY_ICON_GROUPS.map((g) => (
                        <Box key={g.title}>
                            <Typography sx={groupLabelSx}>
                                {g.title}
                                {g.title === 'In use now' && (
                                    <Box component="span" sx={{ fontWeight: 400 }}>
                                        {' · dot = used by another category'}
                                    </Box>
                                )}
                            </Typography>
                            <Box sx={iconGridSx}>
                                {g.icons.map((name) => {
                                    const on = name === icon
                                    return (
                                        <Box
                                            key={name}
                                            component="button"
                                            type="button"
                                            aria-label={name}
                                            aria-pressed={on}
                                            onClick={() => setIcon(name)}
                                            sx={{
                                                position: 'relative',
                                                aspectRatio: '1',
                                                borderRadius: '50%',
                                                // Bordered + hard shadow like the color swatches, so the
                                                // white circles read on the cream page; chosen = yellow
                                                border: `1px solid ${colors.primaryBlack}`,
                                                boxShadow: `1.5px 1.5px 0 ${colors.primaryBlack}`,
                                                backgroundColor: on ? colors.primaryYellow : colors.primaryWhite,
                                                color: colors.primaryBlack,
                                                display: 'grid',
                                                placeItems: 'center',
                                                padding: 0,
                                                cursor: 'pointer',
                                                ...pressIconSx,
                                            }}>
                                            <CategoryGlyph icon={name} size={20} />
                                            {!on && takenIcons.has(name) && (
                                                <Box
                                                    aria-hidden
                                                    sx={{
                                                        position: 'absolute',
                                                        top: '14%',
                                                        right: '14%',
                                                        width: 6,
                                                        height: 6,
                                                        borderRadius: '50%',
                                                        backgroundColor: colors.primaryBrown,
                                                    }}
                                                />
                                            )}
                                        </Box>
                                    )
                                })}
                            </Box>
                        </Box>
                    ))}
                </Box>
            </Box>

            <Box>
                <Typography sx={labelSx}>Color</Typography>
                <Box sx={{ ...colorGridSx, paddingTop: 0.5 }}>
                    {CATEGORY_COLORS.map((c) => {
                        const on = c === color.toLowerCase()
                        return (
                            <Box
                                key={c}
                                component="button"
                                type="button"
                                aria-label={`Color ${c}`}
                                aria-pressed={on}
                                onClick={() => setColor(c)}
                                sx={{
                                    aspectRatio: '1',
                                    borderRadius: '50%',
                                    border: `1px solid ${colors.primaryBlack}`,
                                    boxShadow: `1.5px 1.5px 0 ${colors.primaryBlack}`,
                                    backgroundColor: c,
                                    padding: 0,
                                    cursor: 'pointer',
                                    display: 'grid',
                                    placeItems: 'center',
                                    ...pressIconSx,
                                }}>
                                {/* A check inside, not a ring around: an
                                    offset outline reads lopsided against the
                                    swatch's hard shadow */}
                                {on && <IconCheck size={20} stroke={3} color={getContrastText(c)} />}
                            </Box>
                        )
                    })}
                </Box>
            </Box>

            {category && (
                <Box sx={{ marginTop: 1 }}>
                    <Typography
                        sx={{
                            fontSize: 11,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            color: colors.primaryBrown,
                            paddingBottom: 0.625,
                            borderBottom: `1.5px solid ${colors.primaryBlack}`,
                            marginBottom: 1.5,
                        }}>
                        Danger zone
                    </Typography>
                    <Button
                        fullWidth
                        startIcon={<IconTrash size={18} />}
                        onClick={() => setDeleteOpen(true)}
                        sx={{
                            height: 42,
                            textTransform: 'none',
                            fontWeight: 700,
                            fontSize: 14,
                            color: colors.primaryRed,
                            backgroundColor: colors.primaryWhite,
                            border: `1px solid ${colors.primaryRed}`,
                            boxShadow: `2px 2px 0 ${colors.primaryRed}`,
                            borderRadius: '4px',
                            '&:hover': { backgroundColor: toneColors.negativeBg },
                            '&:active': { boxShadow: 'none', transform: 'translate(2px, 2px)' },
                        }}>
                        Delete category
                    </Button>
                    <ConfirmDeleteDialog
                        open={deleteOpen}
                        title={`Delete "${category.name}"?`}
                        onClose={() => {
                            setDeleteOpen(false)
                            setDeleteError(null)
                        }}
                        onConfirm={handleDelete}
                        busy={deleting}
                        error={deleteError}>
                        {count > 0
                            ? `${count} expense${count === 1 ? ' uses' : 's use'} it and will keep it — it just won't be offered for new expenses.`
                            : "No expenses use it. It won't be offered for new expenses."}
                    </ConfirmDeleteDialog>
                </Box>
            )}
        </FormPage>
    )
}
