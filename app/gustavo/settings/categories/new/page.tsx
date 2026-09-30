'use client'

import { Box } from '@mui/material'
import { useQuery } from '@tanstack/react-query'

import { queryKeys, staleTimes } from '@/lib/query-keys'
import { CategoryForm } from 'components/settings/category-form'
import { FormSkeleton } from 'components/skeleton/form-skeleton'
import { useExitTo } from 'hooks/use-exit-to'
import { fetchExpenseCategoriesWithMeta } from 'utils/api'

const LIST_URL = '/gustavo/settings/categories'

/** New category (Categories → +). */
export default function NewCategoryPage() {
    const exitTo = useExitTo()
    const { data: categories, isPending } = useQuery({
        queryKey: queryKeys.expenseCategories.listWithMeta(),
        queryFn: fetchExpenseCategoriesWithMeta,
        staleTime: staleTimes.medium,
    })

    // Needs the others for its default colour and duplicate-name check
    if (isPending) return <FormSkeleton fields={['field', 'field', 'field']} />

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', maxWidth: 450 }}>
            <CategoryForm
                categories={categories ?? []}
                onCancel={() => exitTo(LIST_URL)}
                onSuccess={() => exitTo(LIST_URL)}
                onDeleted={() => exitTo(LIST_URL)}
            />
        </Box>
    )
}
