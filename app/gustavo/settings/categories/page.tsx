'use client'

import { Box, Typography } from '@mui/material'
import { IconTag } from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { pressShadowSx } from '@/lib/colors'
import { queryKeys, staleTimes } from '@/lib/query-keys'
import type { ExpenseCategoryWithMeta } from '@/lib/types'
import { FlatTabs } from 'components/flat-tabs'
import { HeaderTitle } from 'components/header-title'
import { PageInfo, PageInfoNote, PageInfoSection } from 'components/page-info'
import { CategoryTile, shareLabel, TILE_MIN_HEIGHT } from 'components/settings/category-tile'
import { Bone } from 'components/skeleton/bones'
import { showToast } from 'components/toast-store'
import { useRegisterFab } from 'providers/fab-provider'
import { fetchExpenseCategoriesWithMeta } from 'utils/api'

const LIST_URL = '/gustavo/settings/categories'
const NEW_URL = `${LIST_URL}/new`

type Sort = 'used' | 'az'
const SORTS = [
    { value: 'used', label: 'Most used' },
    { value: 'az', label: 'A–Z' },
] as const

/** Built-in (system) categories always last; the rest by usage or name. */
function sortCategories(list: ExpenseCategoryWithMeta[], sort: Sort) {
    return [...list].sort(
        (a, b) =>
            Number(!!a.slug) - Number(!!b.slug) ||
            (sort === 'used' ? b.usageCount - a.usageCount : 0) ||
            a.name.localeCompare(b.name)
    )
}

const gridSx = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25 } as const

/** Settings → Categories: every expense category as a tinted tile. Tap one
 *  to edit its name / icon / color; the + adds one. */
export default function CategoriesPage() {
    const router = useRouter()
    const { data: categories, isPending } = useQuery({
        queryKey: queryKeys.expenseCategories.listWithMeta(),
        queryFn: fetchExpenseCategoriesWithMeta,
        staleTime: staleTimes.medium,
    })
    const [sort, setSort] = useState<Sort>('used')
    const sorted = useMemo(() => sortCategories(categories ?? [], sort), [categories, sort])
    const total = useMemo(() => (categories ?? []).reduce((t, c) => t + c.usageCount, 0), [categories])

    // The + opens the New category page, warmed so it opens instantly
    const openNew = useCallback(() => router.push(NEW_URL), [router])
    useRegisterFab(openNew)
    useEffect(() => router.prefetch(NEW_URL), [router])

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                maxWidth: 450,
                paddingX: 2,
                paddingTop: 2,
                // Clear the FAB over the last row of tiles
                paddingBottom: 12,
                gap: 1.25,
            }}>
            <HeaderTitle
                icon={<IconTag size={18} stroke={2} />}
                title="Categories"
                right={
                    <PageInfo title="How categories work">
                        <PageInfoSection title="Shared by every trip">
                            These are the categories you pick from when adding an expense, on every
                            trip. The number on a tile is how many expenses use it.
                        </PageInfoSection>
                        <PageInfoSection title="Editing">
                            Tap a tile to rename it or change its icon and color — expenses and
                            filters everywhere follow. The + adds a new one.
                        </PageInfoSection>
                        <PageInfoSection title="Built in">
                            Categories with a lock are set automatically (currency swaps) and
                            can&apos;t be changed.
                        </PageInfoSection>
                        <PageInfoNote>
                            You can edit categories you created; admins can edit any.
                        </PageInfoNote>
                    </PageInfo>
                }
            />

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 30, marginX: -1 }}>
                <FlatTabs value={sort} options={SORTS} onChange={setSort} ariaLabel="Sort categories" />
                {categories && (
                    <Typography sx={{ fontSize: 12, color: 'text.secondary', paddingRight: 1 }}>
                        {total} expenses
                    </Typography>
                )}
            </Box>

            <Box sx={gridSx}>
                {isPending
                    ? Array.from({ length: 6 }, (_, i) => (
                          <Bone key={i} height={TILE_MIN_HEIGHT} radius="6px" />
                      ))
                    : sorted.map((c) => {
                          const tile = (
                              <CategoryTile
                                  name={c.name}
                                  icon={c.icon}
                                  color={c.color}
                                  count={c.usageCount}
                                  caption={c.slug ? 'Built in' : shareLabel(c.usageCount, total)}
                                  builtIn={!!c.slug}
                              />
                          )
                          if (c.canEdit)
                              return (
                                  <Box
                                      key={c.id}
                                      component={Link}
                                      href={`${LIST_URL}/${c.id}/edit`}
                                      sx={{ display: 'block', textDecoration: 'none', borderRadius: '6px', ...pressShadowSx }}>
                                      {tile}
                                  </Box>
                              )
                          // Not yours (or built in): say why instead of a dead tap
                          return (
                              <Box
                                  key={c.id}
                                  role="button"
                                  onClick={() =>
                                      showToast(
                                          c.slug
                                              ? "Built-in categories can't be changed."
                                              : 'Only the person who added it (or an admin) can edit it.',
                                          'info'
                                      )
                                  }
                                  sx={{ cursor: 'pointer' }}>
                                  {tile}
                              </Box>
                          )
                      })}
            </Box>
        </Box>
    )
}
