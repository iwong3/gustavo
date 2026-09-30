'use client'

import { Box, Typography } from '@mui/material'
import { IconChevronRight, IconLogout, IconPencil, IconSettings } from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useState, type ReactNode } from 'react'

import { colors, pressIconSx, pressRowSx, toneColors } from '@/lib/colors'
import { queryKeys, staleTimes } from '@/lib/query-keys'
import type { UserPreferences } from '@/lib/types'
import { ConfirmDeleteDialog } from 'components/confirm-delete-dialog'
import { HeaderTitle } from 'components/header-title'
import { SlidingToggle } from 'components/sliding-toggle'
import { Circle, TextBone } from 'components/skeleton/bones'
import { useSignOut } from 'hooks/use-sign-out'
import { useUserPreferences } from 'hooks/useUserPreferences'
import { fetchAllowedEmails, fetchExpenseCategoriesWithMeta } from 'utils/api'
import { InitialsIcon } from 'utils/icons'

const ROW_MIN_HEIGHT = 50
const HAIRLINE = '1px solid rgba(0,0,0,0.12)'

/** Section label over a black rule: the rows below sit straight on the page,
 *  so the rule is what groups them (no card — a box around rows that hold
 *  boxed toggles read as boxes in boxes). */
function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
    return (
        <Box>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    gap: 1,
                    paddingX: 0.25,
                    paddingBottom: 0.625,
                    borderBottom: `1.5px solid ${colors.primaryBlack}`,
                }}>
                <Typography
                    sx={{
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        color: colors.primaryBrown,
                    }}>
                    {title}
                </Typography>
                {hint && (
                    <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>{hint}</Typography>
                )}
            </Box>
            <Box sx={{ '& > * + *': { borderTop: HAIRLINE } }}>{children}</Box>
        </Box>
    )
}

const rowSx = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 1.5,
    minHeight: ROW_MIN_HEIGHT,
    paddingX: 0.25,
    paddingY: 1,
} as const

const rowLabelSx = { fontSize: 14, fontWeight: 600, color: colors.primaryBlack } as const

/** A setting with its control on the right (a mini toggle). */
function ControlRow({ label, children }: { label: string; children: ReactNode }) {
    return (
        <Box sx={rowSx}>
            <Typography sx={rowLabelSx}>{label}</Typography>
            <Box sx={{ flexShrink: 0 }}>{children}</Box>
        </Box>
    )
}

/** A row into a settings sub-page: label, current value, chevron. */
function LinkRow({ href, label, value }: { href: string; label: string; value?: ReactNode }) {
    return (
        <Box
            component={Link}
            href={href}
            sx={{
                ...rowSx,
                ...pressRowSx,
                textDecoration: 'none',
                color: colors.primaryBlack,
            }}>
            <Typography sx={rowLabelSx}>{label}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                {value !== undefined && (
                    <Typography component="span" sx={{ fontSize: 13, color: 'text.secondary' }}>
                        {value}
                    </Typography>
                )}
                <IconChevronRight size={18} color={colors.primaryBlack} />
            </Box>
        </Box>
    )
}

/** The rows' toggles: compact (30px, 1px border) so they fit beside a label. */
function MiniToggle({
    value,
    options,
    onChange,
    loading,
}: {
    value: string
    options: { value: string; label: string }[]
    onChange: (value: string) => void
    loading: boolean
}) {
    return (
        <SlidingToggle
            loading={loading}
            value={value}
            options={options}
            onChange={onChange}
            fontSize={12}
            borderWidth={1}
            paddingY={0.625}
        />
    )
}

export default function SettingsPage() {
    const { data: session } = useSession()
    // Cached + persisted: the last-known values show instantly, even on a
    // cold open, and a fresh copy loads in the background
    const { prefs, update: updatePrefs } = useUserPreferences()
    const [logoutOpen, setLogoutOpen] = useState(false)
    const signOutAndClear = useSignOut()

    // Row values — the same queries the sub-pages read, so they open warm
    const { data: categories } = useQuery({
        queryKey: queryKeys.expenseCategories.listWithMeta(),
        queryFn: fetchExpenseCategoriesWithMeta,
        staleTime: staleTimes.medium,
    })
    const isAdmin = prefs?.isAdmin ?? false
    const { data: allowed } = useQuery({
        queryKey: queryKeys.allowedEmails.list(),
        queryFn: fetchAllowedEmails,
        staleTime: staleTimes.medium,
        enabled: isAdmin,
    })
    const waiting = allowed?.filter((a) => !a.hasAccount).length ?? 0

    const handlePrefChange = (field: keyof UserPreferences, value: string) =>
        updatePrefs({ [field]: value } as Partial<UserPreferences>)

    // Render straight away — the session fills the name/email in when ready
    const name = session?.user?.name ?? null
    const email = session?.user?.email ?? null

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                maxWidth: 450,
                minHeight: '100%',
                paddingX: 2,
                paddingTop: 2,
                gap: 2.5,
            }}>
            <HeaderTitle icon={<IconSettings size={18} stroke={2} />} title="Settings" />

            {/* Profile: icon (tap → Your icon page) + name + email */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.25 }}>
                <Box
                    component={Link}
                    href="/gustavo/settings/profile"
                    aria-label="Edit your icon"
                    sx={{ position: 'relative', display: 'block', ...pressIconSx }}>
                    {/* Custom initials/colour live in prefs: placeholder until they
                        load, rather than name-derived initials that then swap */}
                    {prefs ? (
                        <InitialsIcon
                            name={name ?? ''}
                            initials={prefs.initials}
                            iconColor={prefs.iconColor}
                            sx={{
                                width: 80,
                                height: 80,
                                fontSize: 32,
                                border: `2px solid ${colors.primaryBlack}`,
                                boxShadow: `3px 3px 0px ${colors.primaryBlack}`,
                            }}
                        />
                    ) : (
                        <Circle size={80} />
                    )}
                    <Box
                        sx={{
                            position: 'absolute',
                            bottom: -2,
                            right: -2,
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            backgroundColor: colors.primaryWhite,
                            border: `1px solid ${colors.primaryBlack}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: colors.primaryBlack,
                        }}>
                        <IconPencil size={14} />
                    </Box>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                    {name !== null ? (
                        <Typography sx={{ fontSize: 20, fontWeight: 700 }}>{name}</Typography>
                    ) : (
                        <TextBone fontSize={20} width={140} sx={{ marginX: 'auto' }} />
                    )}
                    {email !== null ? (
                        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{email}</Typography>
                    ) : (
                        <TextBone fontSize={13} width={180} sx={{ marginX: 'auto' }} />
                    )}
                </Box>
            </Box>

            <Section title="Trips" hint="defaults for new trips">
                <ControlRow label="Visibility">
                    <MiniToggle
                        loading={!prefs}
                        value={prefs?.defaultTripVisibility ?? ''}
                        options={[
                            { value: 'participants', label: 'Participants' },
                            { value: 'all_users', label: 'All users' },
                        ]}
                        onChange={(val) => handlePrefChange('defaultTripVisibility', val)}
                    />
                </ControlRow>
                {/* Viewer / Editor only — the API rejects any other role */}
                <ControlRow label="New people join as">
                    <MiniToggle
                        loading={!prefs}
                        value={prefs?.defaultParticipantRole ?? ''}
                        options={[
                            { value: 'viewer', label: 'Viewer' },
                            { value: 'editor', label: 'Editor' },
                        ]}
                        onChange={(val) => handlePrefChange('defaultParticipantRole', val)}
                    />
                </ControlRow>
                <LinkRow
                    href="/gustavo/settings/categories"
                    label="Expense categories"
                    value={categories ? categories.length : ''}
                />
            </Section>

            <Section title="Health">
                <ControlRow label="A–Z index side">
                    <MiniToggle
                        loading={!prefs}
                        value={prefs?.alphabetIndexSide ?? 'right'}
                        options={[
                            { value: 'left', label: 'Left' },
                            { value: 'right', label: 'Right' },
                        ]}
                        onChange={(val) => handlePrefChange('alphabetIndexSide', val)}
                    />
                </ControlRow>
            </Section>

            {isAdmin && (
                <Section title="Admin">
                    <LinkRow
                        href="/gustavo/settings/invite"
                        label="People"
                        value={
                            allowed ? (
                                <>
                                    {allowed.length}
                                    {waiting > 0 && (
                                        <>
                                            {' · '}
                                            <Box component="span" sx={{ color: toneColors.pending, fontWeight: 700 }}>
                                                {waiting} waiting
                                            </Box>
                                        </>
                                    )}
                                </>
                            ) : (
                                ''
                            )
                        }
                    />
                </Section>
            )}

            <Box
                component="button"
                type="button"
                onClick={() => setLogoutOpen(true)}
                sx={{
                    ...pressRowSx,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0.75,
                    minHeight: ROW_MIN_HEIGHT,
                    border: 'none',
                    borderTop: HAIRLINE,
                    background: 'none',
                    font: 'inherit',
                    fontSize: 14,
                    fontWeight: 700,
                    color: colors.primaryRed,
                    cursor: 'pointer',
                }}>
                <IconLogout size={18} />
                Log out
            </Box>
            <ConfirmDeleteDialog
                open={logoutOpen}
                title="Log out?"
                confirmLabel="Log out"
                onClose={() => setLogoutOpen(false)}
                onConfirm={signOutAndClear}>
                You&apos;ll need to sign in with Google again.
            </ConfirmDeleteDialog>

            {/* Component gallery — dev only (the route 404s in production) */}
            {process.env.NODE_ENV === 'development' && (
                <Link
                    href="/dev/gallery"
                    style={{ alignSelf: 'center', fontSize: 13, color: colors.primaryBrown }}>
                    Component gallery (dev)
                </Link>
            )}

            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: 'auto',
                    paddingX: 0.25,
                    paddingBottom: 2,
                    fontFamily: 'monospace',
                    fontSize: 11,
                    color: 'text.disabled',
                }}>
                <span>
                    Built{' '}
                    {process.env.NEXT_PUBLIC_BUILD_TIME
                        ? new Date(process.env.NEXT_PUBLIC_BUILD_TIME).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                          })
                        : 'dev'}
                </span>
                <span>{process.env.NEXT_PUBLIC_COMMIT_HASH ?? '?'}</span>
            </Box>
        </Box>
    )
}
