'use client'

import { Box, TextField, Typography } from '@mui/material'
import { IconMail, IconPlus, IconUsers } from '@tabler/icons-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { memo, useCallback, useMemo, useState } from 'react'

import { colors, pressIconSx, toneColors } from '@/lib/colors'
import { errorFieldSx, fieldSx } from '@/lib/form-styles'
import { queryKeys, staleTimes } from '@/lib/query-keys'
import { FlatTabs } from 'components/flat-tabs'
import { HeaderTitle } from 'components/header-title'
import { PageInfo, PageInfoNote, PageInfoSection } from 'components/page-info'
import { SwipeableRow } from 'components/receipts/swipeable-row'
import { TextBone } from 'components/skeleton/bones'
import { showToast } from 'components/toast-store'
import { useScrollFocusedInput } from 'hooks/useScrollFocusedInput'
import type { AllowedEmail } from 'utils/api'
import { addAllowedEmail, fetchAllowedEmails, removeAllowedEmail } from 'utils/api'
import { InitialsIcon } from 'utils/icons'

const KEY = queryKeys.allowedEmails.list()
const HAIRLINE = '1px solid rgba(0,0,0,0.12)'
const AVATAR = 32

type Sort = 'newest' | 'az'
const SORTS = [
    { value: 'newest', label: 'Newest' },
    { value: 'az', label: 'A–Z' },
] as const

/** "Sep 14" this year, "Jul 2025" otherwise. */
function shortDate(iso: string) {
    const d = new Date(iso)
    return d.getFullYear() === new Date().getFullYear()
        ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

const displayName = (p: AllowedEmail) => p.userName || p.email

/** Newest: waiting invites first (newest invite first), then people by
 *  when they joined, most recent first. A–Z: by name, or email for people
 *  who haven't joined. */
function sortPeople(list: AllowedEmail[], sort: Sort) {
    const sorted = [...list]
    if (sort === 'az') {
        sorted.sort((a, b) => displayName(a).localeCompare(displayName(b), undefined, { sensitivity: 'base' }))
    } else {
        const key = (p: AllowedEmail) => new Date(p.joinedAt ?? p.createdAt).getTime()
        sorted.sort((a, b) => Number(a.hasAccount) - Number(b.hasAccount) || key(b) - key(a))
    }
    return sorted
}

const PersonRow = memo(function PersonRow({
    person,
    isSelf,
    onRemove,
}: {
    person: AllowedEmail
    isSelf: boolean
    onRemove: (p: AllowedEmail) => void
}) {
    const joined = person.hasAccount
    return (
        <SwipeableRow
            canEdit={false}
            canDelete={!isSelf}
            onEdit={() => {}}
            onDelete={() => onRemove(person)}
            deleteLabel="Remove"
            backgroundColor={colors.secondaryYellow}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minHeight: 56, paddingX: 0.25, paddingY: 0.75 }}>
                {joined ? (
                    <InitialsIcon
                        name={person.userName ?? person.email}
                        initials={person.userInitials}
                        iconColor={person.userIconColor}
                        sx={{ width: AVATAR, height: AVATAR, fontSize: 12, flexShrink: 0 }}
                    />
                ) : (
                    // Waiting: a dashed ring with a mail glyph — nobody to show yet
                    <Box
                        sx={{
                            width: AVATAR,
                            height: AVATAR,
                            flexShrink: 0,
                            borderRadius: '50%',
                            border: `1px dashed ${colors.primaryBrown}`,
                            display: 'grid',
                            placeItems: 'center',
                            color: colors.primaryBrown,
                        }}>
                        <IconMail size={15} />
                    </Box>
                )}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography noWrap sx={{ fontSize: 14, fontWeight: 600, color: colors.primaryBlack }}>
                        {joined ? displayName(person) : person.email}
                        {isSelf && (
                            <Box component="span" sx={{ fontWeight: 400, color: 'text.secondary' }}> (you)</Box>
                        )}
                    </Typography>
                    <Typography
                        noWrap
                        sx={{
                            fontSize: 11.5,
                            color: joined ? 'text.secondary' : toneColors.pending,
                            fontWeight: joined ? 400 : 600,
                        }}>
                        {joined ? person.email : `Invited ${shortDate(person.createdAt)} · hasn't signed in`}
                    </Typography>
                </Box>
                {joined && person.joinedAt && (
                    <Typography sx={{ fontSize: 12, color: 'text.secondary', flexShrink: 0 }}>
                        {shortDate(person.joinedAt)}
                    </Typography>
                )}
            </Box>
        </SwipeableRow>
    )
})

/** Settings → People: the sign-in allowlist (admin only). */
export default function PeoplePage() {
    const focusScroll = useScrollFocusedInput()
    const queryClient = useQueryClient()
    const { data: session } = useSession()
    const myEmail = session?.user?.email?.toLowerCase() ?? null

    const { data: people, isPending } = useQuery({
        queryKey: KEY,
        queryFn: fetchAllowedEmails,
        staleTime: staleTimes.medium,
    })
    const [sort, setSort] = useState<Sort>('newest')
    const sorted = useMemo(() => sortPeople(people ?? [], sort), [people, sort])
    const waiting = people?.filter((p) => !p.hasAccount).length ?? 0

    const [newEmail, setNewEmail] = useState('')
    const [error, setError] = useState<string | null>(null)

    const addMutation = useMutation({
        mutationFn: addAllowedEmail,
        onSuccess: (entry) => {
            queryClient.setQueryData<AllowedEmail[]>(KEY, (old) => [entry, ...(old ?? [])])
            setNewEmail('')
        },
        onError: (err) => setError(err instanceof Error ? err.message : "Couldn't add that email."),
    })

    const handleAdd = () => {
        const email = newEmail.trim().toLowerCase()
        if (!email || addMutation.isPending) return
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError('Enter a valid email address.')
            return
        }
        setError(null)
        addMutation.mutate(email)
    }

    // The swipe's Remove tap is the confirmation: drop the row now, put it
    // back if the request fails
    const handleRemove = useCallback(
        async (person: AllowedEmail) => {
            const previous = queryClient.getQueryData<AllowedEmail[]>(KEY)
            queryClient.setQueryData<AllowedEmail[]>(KEY, (old) =>
                (old ?? []).filter((p) => String(p.id) !== String(person.id))
            )
            try {
                await removeAllowedEmail(person.id)
            } catch (err) {
                queryClient.setQueryData(KEY, previous)
                showToast(err instanceof Error ? err.message : `Couldn't remove ${person.email}.`)
            }
        },
        [queryClient]
    )

    const canAdd = newEmail.trim().length > 0 && !addMutation.isPending

    return (
        <Box
            {...focusScroll}
            sx={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                maxWidth: 450,
                paddingX: 2,
                paddingTop: 2,
                paddingBottom: 4,
                gap: 1.5,
            }}>
            <HeaderTitle
                icon={<IconUsers size={18} stroke={2} />}
                title="People"
                right={
                    <PageInfo title="How People works">
                        <PageInfoSection title="Who can sign in">
                            Only emails on this list can sign in to Gustavo with Google. Add
                            someone&apos;s Google email and their account is created the first time
                            they sign in.
                        </PageInfoSection>
                        <PageInfoSection title="Waiting">
                            Amber rows are invites nobody has used yet. Send them the app link so they
                            can sign in.
                        </PageInfoSection>
                        <PageInfoSection title="Removing someone">
                            Swipe a row left and tap Remove. They&apos;re signed out and can&apos;t sign
                            back in. You can&apos;t remove yourself.
                        </PageInfoSection>
                        <PageInfoNote>Only admins can see this page.</PageInfoNote>
                    </PageInfo>
                }
            />

            <Typography sx={{ fontSize: 12.5, color: 'text.secondary', paddingX: 0.25 }}>
                Anyone on this list can sign in with Google.
            </Typography>

            <Box>
                <TextField
                    value={newEmail}
                    onChange={(e) => {
                        setNewEmail(e.target.value)
                        setError(null)
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAdd()
                    }}
                    placeholder="Add a Google email"
                    type="email"
                    autoComplete="off"
                    size="small"
                    fullWidth
                    slotProps={{
                        htmlInput: { maxLength: 254, enterKeyHint: 'done' },
                        input: {
                            // Borderless + inside the field — never a box in a box
                            endAdornment: (
                                <Box
                                    component="button"
                                    type="button"
                                    aria-label="Add email"
                                    onClick={handleAdd}
                                    disabled={!canAdd}
                                    sx={{
                                        display: 'flex',
                                        border: 'none',
                                        background: 'none',
                                        padding: 0.5,
                                        marginRight: -0.5,
                                        cursor: canAdd ? 'pointer' : 'default',
                                        opacity: canAdd ? 1 : 0.3,
                                        color: colors.primaryBlack,
                                        ...(canAdd && pressIconSx),
                                    }}>
                                    <IconPlus size={18} stroke={2.5} />
                                </Box>
                            ),
                        },
                    }}
                    sx={error ? errorFieldSx : fieldSx}
                />
                {error && (
                    <Typography sx={{ fontSize: 12, fontWeight: 600, color: colors.primaryRed, marginTop: 0.5, paddingX: 0.25 }}>
                        {error}
                    </Typography>
                )}
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 30, marginX: -1 }}>
                <FlatTabs value={sort} options={SORTS} onChange={setSort} ariaLabel="Sort people" />
                {people && (
                    <Typography sx={{ fontSize: 12, color: 'text.secondary', paddingRight: 1 }}>
                        {people.length} {people.length === 1 ? 'person' : 'people'}
                        {waiting > 0 && ` · ${waiting} waiting`}
                    </Typography>
                )}
            </Box>

            <Box sx={{ '& > * + *': { borderTop: HAIRLINE }, marginTop: -0.5 }}>
                {isPending
                    ? [0, 1, 2, 3].map((i) => (
                          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minHeight: 56, paddingX: 0.25 }}>
                              <Box sx={{ width: AVATAR, height: AVATAR, borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.08)' }} />
                              <Box sx={{ flex: 1 }}>
                                  <TextBone fontSize={14} width="55%" />
                                  <TextBone fontSize={11.5} width="40%" />
                              </Box>
                          </Box>
                      ))
                    : sorted.map((p) => (
                          <PersonRow
                              key={p.id}
                              person={p}
                              isSelf={myEmail !== null && p.email.toLowerCase() === myEmail}
                              onRemove={handleRemove}
                          />
                      ))}
            </Box>
        </Box>
    )
}
