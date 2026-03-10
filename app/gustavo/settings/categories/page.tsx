'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    IconButton,
    TextField,
    Typography,
} from '@mui/material'
import {
    IconArrowDown,
    IconArrowUp,
    IconCheck,
    IconLock,
    IconPencil,
    IconPlus,
    IconTrash,
    IconX,
} from '@tabler/icons-react'

import { colors, cardSx, hardShadow } from '@/lib/colors'
import {
    fieldSx,
    errorFieldSx,
    secondaryButtonSx,
    destructiveButtonSx,
    dialogPaperSx,
} from '@/lib/form-styles'
import { fetchExpenseCategoriesWithMeta } from 'utils/api'
import type { ExpenseCategoryWithMeta } from '@/lib/types'

type SortField = 'alpha' | 'count'
type SortDir = 'asc' | 'desc'

const iconButtonSx = {
    'width': 30,
    'height': 30,
    'border': `1px solid ${colors.primaryBlack}`,
    'boxShadow': `1px 1px 0px ${colors.primaryBlack}`,
    '&:active': {
        boxShadow: 'none',
        transform: 'translate(1px, 1px)',
    },
    'transition': 'transform 0.1s, box-shadow 0.1s',
} as const

export default function CategoriesPage() {
    const [categories, setCategories] = useState<ExpenseCategoryWithMeta[]>([])
    const [loading, setLoading] = useState(true)
    const [newName, setNewName] = useState('')
    const [editingId, setEditingId] = useState<number | null>(null)
    const [editName, setEditName] = useState('')
    const [deleteTarget, setDeleteTarget] = useState<ExpenseCategoryWithMeta | null>(null)
    const [sortField, setSortField] = useState<SortField>('alpha')
    const [sortDir, setSortDir] = useState<SortDir>('asc')
    const [addError, setAddError] = useState('')
    const [editError, setEditError] = useState('')
    const editRef = useRef<HTMLInputElement>(null)
    const sortContainerRef = useRef<HTMLDivElement>(null)
    const alphaRef = useRef<HTMLDivElement>(null)
    const countRef = useRef<HTMLDivElement>(null)
    const [barStyle, setBarStyle] = useState<{ left: number; width: number } | null>(null)

    const loadCategories = useCallback(async () => {
        try {
            const data = await fetchExpenseCategoriesWithMeta()
            setCategories(data)
        } catch (err) {
            console.error('Failed to fetch categories:', err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadCategories()
    }, [loadCategories])

    useEffect(() => {
        if (editingId !== null && editRef.current) {
            editRef.current.focus()
            editRef.current.select()
        }
    }, [editingId])

    // Measure active sort tab position for sliding bar
    useEffect(() => {
        const container = sortContainerRef.current
        const activeRef = sortField === 'alpha' ? alphaRef.current : countRef.current
        if (!container || !activeRef) return
        const containerRect = container.getBoundingClientRect()
        const activeRect = activeRef.getBoundingClientRect()
        setBarStyle({
            left: activeRect.left - containerRect.left,
            width: activeRect.width,
        })
    }, [sortField, sortDir, categories.length])

    const sortedCategories = useMemo(() => {
        // Locked (slug) categories always float to top
        const locked = categories.filter((c) => c.slug)
        const editable = categories.filter((c) => !c.slug)
        const dir = sortDir === 'asc' ? 1 : -1
        if (sortField === 'alpha') {
            locked.sort((a, b) => dir * a.name.localeCompare(b.name))
            editable.sort((a, b) => dir * a.name.localeCompare(b.name))
        } else {
            locked.sort((a, b) => dir * (a.usageCount - b.usageCount))
            editable.sort((a, b) => dir * (a.usageCount - b.usageCount))
        }
        return [...locked, ...editable]
    }, [categories, sortField, sortDir])

    const toggleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
        } else {
            setSortField(field)
            setSortDir(field === 'alpha' ? 'asc' : 'desc')
        }
    }

    const isDuplicate = (name: string, excludeId?: number) =>
        categories.some(
            (c) => c.id !== excludeId && c.name.toLowerCase() === name.toLowerCase()
        )

    const handleAdd = async () => {
        const trimmed = newName.trim()
        if (!trimmed) return
        if (isDuplicate(trimmed)) {
            setAddError(`"${trimmed}" already exists`)
            return
        }
        setAddError('')
        try {
            await fetch('/api/expense-categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: trimmed }),
            })
            setNewName('')
            await loadCategories()
        } catch (err) {
            console.error('Failed to add category:', err)
        }
    }

    const handleRename = async (id: number) => {
        const trimmed = editName.trim()
        if (!trimmed) {
            setEditingId(null)
            setEditError('')
            return
        }
        const original = categories.find((c) => c.id === id)
        if (original && original.name === trimmed) {
            setEditingId(null)
            setEditError('')
            return
        }
        if (isDuplicate(trimmed, id)) {
            setEditError(`"${trimmed}" already exists`)
            return
        }
        setEditError('')
        try {
            await fetch(`/api/expense-categories/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: trimmed }),
            })
            setEditingId(null)
            await loadCategories()
        } catch (err) {
            console.error('Failed to rename category:', err)
        }
    }

    const handleDelete = async () => {
        if (!deleteTarget) return
        try {
            await fetch(`/api/expense-categories/${deleteTarget.id}`, {
                method: 'DELETE',
            })
            setDeleteTarget(null)
            await loadCategories()
        } catch (err) {
            console.error('Failed to delete category:', err)
        }
    }

    const startEdit = (cat: ExpenseCategoryWithMeta) => {
        setEditingId(cat.id)
        setEditName(cat.name)
        setEditError('')
    }

    const cancelEdit = () => {
        setEditingId(null)
        setEditName('')
        setEditError('')
    }

    // Fixed column widths so everything aligns across rows
    const countColWidth = 36
    const actionsColWidth = 72 // fits 2 circle buttons (30px each + 4px gap + padding)

    // Heat gradient for count sub-card — pastel: cold (light blue) → warm (light amber) → hot (light coral)
    const maxCount = useMemo(
        () => Math.max(1, ...categories.map((c) => c.usageCount)),
        [categories]
    )
    const countColor = (count: number) => {
        const t = Math.min(count / maxCount, 1)
        let r: number, g: number, b: number
        if (t < 0.5) {
            // pale blue (#c4dae8) → pale amber (#fae0a6)
            const s = t / 0.5
            r = Math.round(196 + s * (250 - 196))
            g = Math.round(218 + s * (224 - 218))
            b = Math.round(232 + s * (166 - 232))
        } else {
            // pale amber (#fae0a6) → soft coral (#f0a890)
            const s = (t - 0.5) / 0.5
            r = Math.round(250 + s * (240 - 250))
            g = Math.round(224 + s * (168 - 224))
            b = Math.round(166 + s * (144 - 166))
        }
        return `rgb(${r}, ${g}, ${b})`
    }

    // Error text left offset = countColWidth + gap (1.5 * 8px = 12px) + card paddingX (1.5 * 8px = 12px)
    const errorLeftOffset = `${countColWidth + 24}px`

    return (
        <Box sx={{ width: '100%', paddingX: '16px', paddingTop: 3, paddingBottom: 10 }}>
            <Typography
                sx={{
                    fontSize: 22,
                    fontWeight: 700,
                    marginBottom: 2.5,
                    color: colors.primaryBlack,
                }}>
                Manage Categories
            </Typography>

            {/* Add category */}
            <Box sx={{ marginBottom: 0.5 }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                    size="small"
                    placeholder="New category name"
                    value={newName}
                    onChange={(e) => { setNewName(e.target.value); setAddError('') }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAdd()
                    }}
                    slotProps={{ htmlInput: { maxLength: 100 } }}
                    sx={{ flex: 1, ...(addError ? errorFieldSx : fieldSx) }}
                />
                <IconButton
                    onClick={handleAdd}
                    disabled={!newName.trim()}
                    sx={{
                        ...hardShadow,
                        'borderRadius': '4px',
                        'width': 40,
                        'height': 40,
                        'backgroundColor': colors.primaryYellow,
                        'color': colors.primaryBlack,
                        '&:hover': { backgroundColor: colors.primaryYellow },
                        '&:active': {
                            boxShadow: 'none',
                            transform: 'translate(2px, 2px)',
                        },
                        '&.Mui-disabled': {
                            backgroundColor: `${colors.primaryYellow}60`,
                            color: `${colors.primaryBlack}40`,
                            border: `1px solid ${colors.primaryBlack}40`,
                            boxShadow: `2px 2px 0px ${colors.primaryBlack}40`,
                        },
                        'transition': 'transform 0.1s, box-shadow 0.1s',
                    }}>
                    <IconPlus size={20} />
                </IconButton>
              </Box>
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: colors.primaryRed, marginTop: 0.5, marginLeft: '14px', height: 18, visibility: addError ? 'visible' : 'hidden' }}>
                  {addError || '\u00A0'}
              </Typography>
            </Box>

            {/* Sort */}
            {categories.length > 0 && (
                <Box
                    ref={sortContainerRef}
                    sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1.5, marginBottom: 1.5, position: 'relative' }}>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Sort:</Typography>
                    <Box
                        ref={alphaRef}
                        onClick={() => toggleSort('alpha')}
                        sx={{
                            'display': 'flex',
                            'alignItems': 'center',
                            'gap': 0.25,
                            'cursor': 'pointer',
                            'paddingBottom': '2px',
                            '&:hover': { '& .sort-label': { color: colors.primaryBlack } },
                        }}>
                        <Typography
                            className="sort-label"
                            sx={{
                                fontSize: 12,
                                fontWeight: sortField === 'alpha' ? 700 : 400,
                                color: sortField === 'alpha' ? colors.primaryBlack : 'text.secondary',
                                transition: 'font-weight 0.2s, color 0.2s',
                            }}>
                            A–Z
                        </Typography>
                        {sortField === 'alpha' && (
                            sortDir === 'asc'
                                ? <IconArrowDown size={12} color={colors.primaryBlack} />
                                : <IconArrowUp size={12} color={colors.primaryBlack} />
                        )}
                    </Box>
                    <Box
                        ref={countRef}
                        onClick={() => toggleSort('count')}
                        sx={{
                            'display': 'flex',
                            'alignItems': 'center',
                            'gap': 0.25,
                            'cursor': 'pointer',
                            'paddingBottom': '2px',
                            '&:hover': { '& .sort-label': { color: colors.primaryBlack } },
                        }}>
                        <Typography
                            className="sort-label"
                            sx={{
                                fontSize: 12,
                                fontWeight: sortField === 'count' ? 700 : 400,
                                color: sortField === 'count' ? colors.primaryBlack : 'text.secondary',
                                transition: 'font-weight 0.2s, color 0.2s',
                            }}>
                            Most used
                        </Typography>
                        {sortField === 'count' && (
                            sortDir === 'desc'
                                ? <IconArrowDown size={12} color={colors.primaryBlack} />
                                : <IconArrowUp size={12} color={colors.primaryBlack} />
                        )}
                    </Box>
                    {/* Sliding yellow bar */}
                    {barStyle && (
                        <Box
                            sx={{
                                position: 'absolute',
                                bottom: 0,
                                left: `${barStyle.left}px`,
                                width: `${barStyle.width}px`,
                                height: '2px',
                                backgroundColor: colors.primaryYellow,
                                transition: 'left 0.25s ease, width 0.25s ease',
                            }}
                        />
                    )}
                </Box>
            )}

            {loading ? (
                <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>Loading...</Typography>
            ) : categories.length === 0 ? (
                <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
                    No categories yet.
                </Typography>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {sortedCategories.map((cat) => {
                        const isEditing = editingId === cat.id
                        return (
                            <Box
                                key={cat.id}
                                sx={{
                                    ...cardSx,
                                    paddingX: 1.5,
                                    paddingY: 1,
                                    ...(isEditing && {
                                        borderColor: colors.primaryYellow,
                                        boxShadow: `2px 2px 0px ${colors.primaryYellow}`,
                                    }),
                                }}>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1.5,
                                        minHeight: 30,
                                    }}>
                                    {/* Col 1: Expense count sub-card — fixed width */}
                                    <Box
                                        sx={{
                                            width: countColWidth,
                                            flexShrink: 0,
                                            paddingY: 0.25,
                                            backgroundColor: countColor(cat.usageCount),
                                            border: `1px solid ${colors.primaryBlack}`,
                                            boxShadow: `1px 1px 0px ${colors.primaryBlack}`,
                                            borderRadius: '4px',
                                            textAlign: 'center',
                                        }}>
                                        <Typography
                                            sx={{
                                                fontSize: 12,
                                                fontWeight: 700,
                                                color: colors.primaryBlack,
                                                lineHeight: 1.4,
                                            }}>
                                            {cat.usageCount}
                                        </Typography>
                                    </Box>

                                    {/* Col 2: Category name — fills remaining space */}
                                    <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                                        {isEditing ? (
                                            <TextField
                                                size="small"
                                                value={editName}
                                                onChange={(e) => { setEditName(e.target.value); setEditError('') }}
                                                inputRef={editRef}
                                                fullWidth
                                                slotProps={{ htmlInput: { maxLength: 100 } }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleRename(cat.id)
                                                    if (e.key === 'Escape') cancelEdit()
                                                }}
                                                onBlur={() => handleRename(cat.id)}
                                                sx={{
                                                    '& .MuiOutlinedInput-root': {
                                                        'backgroundColor': editError ? `${colors.primaryRed}10` : colors.secondaryYellow,
                                                        'height': 24,
                                                        'fontSize': 15,
                                                        'fontWeight': 500,
                                                        '& fieldset': { border: 'none' },
                                                        '& input': { padding: '0 4px' },
                                                    },
                                                }}
                                            />
                                        ) : (
                                            <Typography
                                                sx={{
                                                    fontSize: 15,
                                                    fontWeight: 500,
                                                    color: colors.primaryBlack,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                }}>
                                                {cat.name}
                                            </Typography>
                                        )}
                                    </Box>

                                    {/* Col 3: Action buttons — fixed width */}
                                    <Box
                                        sx={{
                                            width: actionsColWidth,
                                            flexShrink: 0,
                                            display: 'flex',
                                            justifyContent: 'flex-end',
                                            gap: 0.5,
                                        }}>
                                        {isEditing ? (
                                            <>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleRename(cat.id)}
                                                    sx={{
                                                        ...iconButtonSx,
                                                        'borderRadius': '50%',
                                                        'backgroundColor': colors.primaryGreen,
                                                        'color': colors.primaryWhite,
                                                        '&:hover': { backgroundColor: colors.primaryGreen },
                                                    }}>
                                                    <IconCheck size={14} />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onClick={cancelEdit}
                                                    sx={{
                                                        ...iconButtonSx,
                                                        'borderRadius': '50%',
                                                        'backgroundColor': colors.primaryWhite,
                                                        'color': colors.primaryBlack,
                                                        '&:hover': { backgroundColor: colors.secondaryYellow },
                                                    }}>
                                                    <IconX size={14} />
                                                </IconButton>
                                            </>
                                        ) : cat.slug ? (
                                            <Box
                                                sx={{
                                                    ...iconButtonSx,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    borderRadius: '50%',
                                                    backgroundColor: colors.primaryWhite,
                                                    color: colors.primaryBlack,
                                                    opacity: 0.5,
                                                }}>
                                                <IconLock size={14} />
                                            </Box>
                                        ) : cat.canEdit ? (
                                            <>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => startEdit(cat)}
                                                    sx={{
                                                        ...iconButtonSx,
                                                        'borderRadius': '50%',
                                                        'backgroundColor': colors.primaryWhite,
                                                        'color': colors.primaryBlack,
                                                        '&:hover': { backgroundColor: colors.secondaryYellow },
                                                    }}>
                                                    <IconPencil size={14} />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => setDeleteTarget(cat)}
                                                    sx={{
                                                        ...iconButtonSx,
                                                        'borderRadius': '50%',
                                                        'backgroundColor': colors.primaryWhite,
                                                        'color': colors.primaryRed,
                                                        '&:hover': { backgroundColor: `${colors.primaryRed}10` },
                                                    }}>
                                                    <IconTrash size={14} />
                                                </IconButton>
                                            </>
                                        ) : null}
                                    </Box>
                                </Box>
                                {isEditing && (
                                    <Typography sx={{ fontSize: 12, fontWeight: 600, color: colors.primaryRed, marginTop: 0.5, marginLeft: errorLeftOffset, height: 18, visibility: editError ? 'visible' : 'hidden' }}>
                                        {editError || '\u00A0'}
                                    </Typography>
                                )}
                            </Box>
                        )
                    })}
                </Box>
            )}

            {/* Delete confirmation dialog */}
            <Dialog
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                PaperProps={{ sx: dialogPaperSx }}>
                <DialogTitle
                    sx={{
                        fontWeight: 700,
                        fontSize: 18,
                        color: colors.primaryBlack,
                    }}>
                    Delete category
                </DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ color: colors.primaryBlack, fontSize: 14 }}>
                        {deleteTarget && deleteTarget.usageCount > 0
                            ? `${deleteTarget.usageCount} expense${deleteTarget.usageCount !== 1 ? 's' : ''} use this category. Delete anyway?`
                            : `Delete "${deleteTarget?.name}"?`}
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ paddingX: 3, paddingBottom: 2, gap: 1 }}>
                    <Button onClick={() => setDeleteTarget(null)} sx={secondaryButtonSx}>
                        Cancel
                    </Button>
                    <Button onClick={handleDelete} sx={destructiveButtonSx}>
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    )
}
