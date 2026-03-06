'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    IconButton,
    List,
    ListItem,
    TextField,
    Typography,
} from '@mui/material'
import { IconCheck, IconPlus, IconTrash, IconX } from '@tabler/icons-react'

type CategoryWithCount = {
    id: number
    name: string
    usageCount: number
}

export default function CategoriesPage() {
    const [categories, setCategories] = useState<CategoryWithCount[]>([])
    const [loading, setLoading] = useState(true)
    const [newName, setNewName] = useState('')
    const [editingId, setEditingId] = useState<number | null>(null)
    const [editName, setEditName] = useState('')
    const [deleteTarget, setDeleteTarget] = useState<CategoryWithCount | null>(null)
    const editRef = useRef<HTMLInputElement>(null)

    const fetchCategories = useCallback(async () => {
        try {
            const res = await fetch('/api/expense-categories?includeCount=true')
            if (!res.ok) throw new Error('Failed to fetch')
            const data: CategoryWithCount[] = await res.json()
            setCategories(data)
        } catch (err) {
            console.error('Failed to fetch categories:', err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchCategories()
    }, [fetchCategories])

    useEffect(() => {
        if (editingId !== null && editRef.current) {
            editRef.current.focus()
            editRef.current.select()
        }
    }, [editingId])

    const handleAdd = async () => {
        const trimmed = newName.trim()
        if (!trimmed) return
        try {
            await fetch('/api/expense-categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: trimmed }),
            })
            setNewName('')
            await fetchCategories()
        } catch (err) {
            console.error('Failed to add category:', err)
        }
    }

    const handleRename = async (id: number) => {
        const trimmed = editName.trim()
        if (!trimmed) {
            setEditingId(null)
            return
        }
        const original = categories.find((c) => c.id === id)
        if (original && original.name === trimmed) {
            setEditingId(null)
            return
        }
        try {
            await fetch(`/api/expense-categories/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: trimmed }),
            })
            setEditingId(null)
            await fetchCategories()
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
            await fetchCategories()
        } catch (err) {
            console.error('Failed to delete category:', err)
        }
    }

    const startEdit = (cat: CategoryWithCount) => {
        setEditingId(cat.id)
        setEditName(cat.name)
    }

    const cancelEdit = () => {
        setEditingId(null)
        setEditName('')
    }

    return (
        <Box sx={{ paddingX: 2, paddingTop: 3, paddingBottom: 10, maxWidth: 500, margin: '0 auto' }}>
            <Typography sx={{ fontSize: 20, fontWeight: 600, marginBottom: 2 }}>
                Manage Categories
            </Typography>

            {/* Add category */}
            <Box sx={{ display: 'flex', gap: 1, marginBottom: 2 }}>
                <TextField
                    size="small"
                    placeholder="New category name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAdd()
                    }}
                    sx={{
                        flex: 1,
                        '& .MuiInputBase-root': { backgroundColor: '#FFFFEF' },
                    }}
                />
                <IconButton
                    onClick={handleAdd}
                    disabled={!newName.trim()}
                    sx={{ color: '#FBBC04' }}>
                    <IconPlus size={20} />
                </IconButton>
            </Box>

            {loading ? (
                <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>Loading...</Typography>
            ) : categories.length === 0 ? (
                <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
                    No categories yet.
                </Typography>
            ) : (
                <List disablePadding>
                    {categories.map((cat) => (
                        <ListItem
                            key={cat.id}
                            disablePadding
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                paddingY: 0.75,
                                borderBottom: '1px solid rgba(0,0,0,0.08)',
                            }}>
                            {editingId === cat.id ? (
                                <>
                                    <TextField
                                        size="small"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        inputRef={editRef}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleRename(cat.id)
                                            if (e.key === 'Escape') cancelEdit()
                                        }}
                                        onBlur={() => handleRename(cat.id)}
                                        sx={{
                                            flex: 1,
                                            '& .MuiInputBase-root': {
                                                backgroundColor: '#FFFFEF',
                                            },
                                        }}
                                    />
                                    <IconButton
                                        size="small"
                                        onClick={() => handleRename(cat.id)}
                                        sx={{ color: 'green' }}>
                                        <IconCheck size={18} />
                                    </IconButton>
                                    <IconButton
                                        size="small"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={cancelEdit}
                                        sx={{ color: 'text.secondary' }}>
                                        <IconX size={18} />
                                    </IconButton>
                                </>
                            ) : (
                                <>
                                    <Typography
                                        onClick={() => startEdit(cat)}
                                        sx={{
                                            flex: 1,
                                            fontSize: 15,
                                            cursor: 'pointer',
                                            '&:hover': { color: '#FBBC04' },
                                        }}>
                                        {cat.name}
                                    </Typography>
                                    <Chip
                                        label={`${cat.usageCount} expense${cat.usageCount !== 1 ? 's' : ''}`}
                                        size="small"
                                        sx={{
                                            fontSize: 12,
                                            height: 22,
                                            backgroundColor: 'rgba(0,0,0,0.06)',
                                        }}
                                    />
                                    <IconButton
                                        size="small"
                                        onClick={() => setDeleteTarget(cat)}
                                        sx={{ color: '#C1121F' }}>
                                        <IconTrash size={18} />
                                    </IconButton>
                                </>
                            )}
                        </ListItem>
                    ))}
                </List>
            )}

            {/* Delete confirmation dialog */}
            <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
                <DialogTitle>Delete category</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {deleteTarget && deleteTarget.usageCount > 0
                            ? `${deleteTarget.usageCount} expense${deleteTarget.usageCount !== 1 ? 's' : ''} use this category. Delete anyway?`
                            : `Delete "${deleteTarget?.name}"?`}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
                    <Button onClick={handleDelete} color="error">
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    )
}
