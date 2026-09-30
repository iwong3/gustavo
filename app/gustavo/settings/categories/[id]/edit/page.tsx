'use client'

import { Box } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'

import { queryKeys, staleTimes } from '@/lib/query-keys'
import { GoneState } from 'components/gone-state'
import { CategoryForm } from 'components/settings/category-form'
import { FormSkeleton } from 'components/skeleton/form-skeleton'
import { useExitTo } from 'hooks/use-exit-to'
import { fetchExpenseCategoriesWithMeta } from 'utils/api'

const LIST_URL = '/gustavo/settings/categories'

/** Edit category — name, icon, colour, delete (Categories → tap a tile). */
export default function EditCategoryPage() {
    const exitTo = useExitTo()
    const { id } = useParams<{ id: string }>()
    const { data: categories, isPending } = useQuery({
        queryKey: queryKeys.expenseCategories.listWithMeta(),
        queryFn: fetchExpenseCategoriesWithMeta,
        staleTime: staleTimes.medium,
    })

    if (isPending) return <FormSkeleton fields={['field', 'field', 'field']} />

    const category = categories?.find((c) => String(c.id) === id)
    if (!category)
        return (
            <GoneState
                title="This category is gone"
                detail="It may have been deleted."
                action={{ label: 'Back to categories', onClick: () => exitTo(LIST_URL) }}
            />
        )
    if (!category.canEdit)
        return (
            <GoneState
                title="You can't edit this category"
                detail={
                    category.slug
                        ? "Built-in categories can't be changed."
                        : 'Only the person who added it (or an admin) can edit it.'
                }
                action={{ label: 'Back to categories', onClick: () => exitTo(LIST_URL) }}
            />
        )

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', maxWidth: 450 }}>
            <CategoryForm
                key={category.id}
                category={category}
                categories={categories ?? []}
                onCancel={() => exitTo(LIST_URL)}
                onSuccess={() => exitTo(LIST_URL)}
                onDeleted={() => exitTo(LIST_URL)}
            />
        </Box>
    )
}
