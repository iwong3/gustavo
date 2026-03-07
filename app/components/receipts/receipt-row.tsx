import { Box, IconButton, Tooltip } from '@mui/material'
import Grid from '@mui/material/Grid'
import { IconEdit, IconTrash } from '@tabler/icons-react'
import { colors } from '@/lib/colors'
import dayjs from 'dayjs'
import { useEffect, useState } from 'react'
import AnimateHeight from 'react-animate-height'
import { useShallow } from 'zustand/react/shallow'

import DeleteExpenseDialog from 'components/delete-expense-dialog'
import ExpenseFormDialog from 'components/expense-form-dialog'
import { useCollapseAllStore } from 'components/menu/items/collapse-all'
import { useSettingsCostStore } from 'components/menu/settings/settings-cost'
import { SplitBetweenInitials } from 'components/receipts/receipt-items/split-between-initials'
import { CostDisplay, FormattedMoney } from 'utils/currency'
import { getTablerIcon, CategoryIcon, InitialsIcon } from 'utils/icons'
import { deleteExpense } from 'utils/api'
import { useTripData } from 'providers/trip-data-provider'
import { getUcUrlFromOpenUrl } from 'utils/image'

import type { Expense } from '@/lib/types'

const ErrorConvertingToUSDRow = 'Could not convert to USD'

interface IReceiptsRowProps {
    expense: Expense
    onRefresh?: () => void
}

export const ReceiptsRow = ({ expense, onRefresh }: IReceiptsRowProps) => {
    const { trip } = useTripData()
    const participants = trip.participants

    const [expanded, setExpanded] = useState(false)
    const [receiptImageExpanded, setReceiptImageExpanded] = useState(false)
    const [editDialogOpen, setEditDialogOpen] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

    const { value } = useCollapseAllStore(useShallow((state) => state))

    useEffect(() => {
        setExpanded(false)
    }, [value])

    const { costDisplay } = useSettingsCostStore(useShallow((state) => state))

    const splitCount = expense.isEveryone
        ? participants.length
        : expense.splitBetween.length
    const splitCost = expense.costConvertedUsd / splitCount
    const splitCostOriginal = expense.costOriginal / splitCount

    return (
        <Box>
            <Grid
                container
                onClick={() => setExpanded(!expanded)}
                sx={{
                    paddingY: 2,
                }}>
                <Grid
                    size={2}
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}>
                    <CategoryIcon expense={expense} />
                </Grid>
                <Grid size={7}>
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            height: '100%',
                            fontSize: '14px',
                        }}>
                        {/* Spend Row Top */}
                        <Box
                            sx={{
                                display: 'flex',
                                fontWeight: 'bold',
                            }}>
                            {expense.name}
                        </Box>
                        {/* Spend Row Bottom */}
                        <Box
                            sx={{
                                display: 'flex',
                            }}>
                            {dayjs(expense.date).format('M/D')}
                            {expense.locationName && ' \u2022 ' + expense.locationName}
                        </Box>
                    </Box>
                </Grid>
                <Grid size={3}>
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'flex-end',
                            marginRight: 2,
                            fontSize: '14px',
                        }}>
                        <Box
                            sx={{
                                display: 'flex',
                                fontWeight: 'bold',
                                color: expense.conversionError ? colors.primaryRed : colors.primaryBlack,
                            }}>
                            {costDisplay === CostDisplay.Original
                                ? FormattedMoney(expense.currency, 0).format(
                                      expense.costOriginal
                                  )
                                : FormattedMoney('USD', 0).format(
                                      expense.costConvertedUsd
                                  )}
                        </Box>
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                fontSize: '12px',
                            }}>
                            <InitialsIcon
                                name={expense.paidBy.firstName}
                                initials={expense.paidBy.initials}
                                sx={{ width: 24, height: 24 }}
                            />
                        </Box>
                    </Box>
                </Grid>
            </Grid>

            {/* Expanded row */}
            <AnimateHeight duration={100} height={expanded ? 'auto' : 0}>
                <Grid
                    container
                    sx={{
                        borderTop: expense.conversionError
                            ? `1px solid ${colors.primaryRed}`
                            : `1px solid ${colors.primaryBlack}`,
                    }}>
                    <Grid size={12}>
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                marginTop: 1,
                                marginX: 2,
                                fontSize: 14,
                            }}>
                            {/* Split Between */}
                            <Box
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    width: '100%',
                                    marginY: 1,
                                }}>
                                <SplitBetweenInitials expense={expense} />
                            </Box>
                            {/* Split Cost */}
                            <Box
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    width: '100%',
                                }}>
                                <Box>
                                    {FormattedMoney(expense.currency).format(
                                        expense.costOriginal
                                    )}
                                </Box>
                                <Box sx={{ marginX: 1 }}>
                                    {getTablerIcon({
                                        name: 'IconArrowsSplit2',
                                        size: 12,
                                    })}
                                </Box>
                                {expense.conversionError ? (
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                        }}>
                                        {FormattedMoney(expense.currency).format(
                                            splitCostOriginal
                                        )}
                                        <Tooltip
                                            title={ErrorConvertingToUSDRow}
                                            enterTouchDelay={0}
                                            slotProps={{
                                                popper: {
                                                    modifiers: [
                                                        {
                                                            name: 'offset',
                                                            options: {
                                                                offset: [
                                                                    0, -12,
                                                                ],
                                                            },
                                                        },
                                                    ],
                                                },
                                                tooltip: {
                                                    sx: {
                                                        padding: 1,
                                                        border: `1px solid ${colors.primaryRed}`,
                                                        fontSize: 12,
                                                        color: colors.primaryBlack,
                                                        fontStyle: 'italic',
                                                        fontWeight: 600,
                                                        backgroundColor: colors.primaryYellow,
                                                        boxShadow: `2px 2px 0px ${colors.primaryBlack}`,
                                                    },
                                                },
                                            }}>
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    marginLeft: 0.5,
                                                }}>
                                                {getTablerIcon({
                                                    name: 'IconExclamationCircle',
                                                    size: 20,
                                                    fill: colors.primaryRed,
                                                })}
                                            </Box>
                                        </Tooltip>
                                    </Box>
                                ) : (
                                    FormattedMoney().format(splitCost)
                                )}
                            </Box>
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    width: '100%',
                                    marginTop: 2,
                                    marginBottom: 1,
                                }}>
                                {/* Receipt Image */}
                                {expense.receiptImageUrl && (
                                    <Box
                                        sx={{
                                            marginBottom: 1,
                                        }}>
                                        <Box
                                            onClick={() =>
                                                setReceiptImageExpanded(
                                                    !receiptImageExpanded
                                                )
                                            }
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                fontSize: 12,
                                                fontStyle: 'italic',
                                            }}>
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    justifyContent: 'center',
                                                    alignItems: 'center',
                                                    marginRight: 1,
                                                }}>
                                                {getTablerIcon({
                                                    name: 'IconPhoto',
                                                    size: 14,
                                                })}
                                            </Box>
                                            {!receiptImageExpanded
                                                ? 'View Image'
                                                : 'Hide Image'}
                                        </Box>
                                        {receiptImageExpanded && (
                                            <AnimateHeight
                                                duration={100}
                                                height={
                                                    receiptImageExpanded
                                                        ? 'auto'
                                                        : 0
                                                }>
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        justifyContent:
                                                            'center',
                                                        alignItems: 'center',
                                                        marginTop: 1,
                                                    }}>
                                                    <img
                                                        src={getUcUrlFromOpenUrl(
                                                            expense.receiptImageUrl
                                                        )}
                                                        alt="Receipt"
                                                        style={{
                                                            maxWidth: '100%',
                                                            maxHeight: '200px',
                                                        }}
                                                    />
                                                </Box>
                                            </AnimateHeight>
                                        )}
                                    </Box>
                                )}
                                {/* Notes */}
                                {expense.notes && (
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            fontSize: 12,
                                            marginBottom: 1,
                                        }}>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                marginRight: 1,
                                            }}>
                                            {getTablerIcon({
                                                name: 'IconNotes',
                                                size: 14,
                                            })}
                                        </Box>
                                        {expense.notes}
                                    </Box>
                                )}
                                {/* Reported by */}
                                {expense.reportedBy && (
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            fontSize: 12,
                                            fontStyle: 'italic',
                                        }}>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                marginRight: 1,
                                            }}>
                                            {getTablerIcon({
                                                name: 'IconClock',
                                                size: 14,
                                            })}
                                        </Box>
                                        Submitted by {expense.reportedBy.firstName} at{' '}
                                        {dayjs(expense.reportedAt).format(
                                            'M/D h:mm A'
                                        )}
                                    </Box>
                                )}
                                <Box
                                    sx={{
                                        display: 'flex',
                                        justifyContent: 'flex-end',
                                        gap: 0.5,
                                        marginTop: 1,
                                    }}>
                                    <IconButton
                                        size="small"
                                        onClick={() => setEditDialogOpen(true)}>
                                        <IconEdit size={18} />
                                    </IconButton>
                                    <IconButton
                                        size="small"
                                        onClick={() => setDeleteDialogOpen(true)}>
                                        <IconTrash size={18} color={colors.primaryRed} />
                                    </IconButton>
                                </Box>
                            </Box>
                        </Box>
                    </Grid>
                </Grid>
            </AnimateHeight>

            <ExpenseFormDialog
                open={editDialogOpen}
                onClose={() => setEditDialogOpen(false)}
                onSuccess={() => onRefresh?.()}
                mode="edit"
                expense={expense}
            />

            <DeleteExpenseDialog
                open={deleteDialogOpen}
                expense={expense}
                onClose={() => setDeleteDialogOpen(false)}
                onConfirm={async () => {
                    await deleteExpense(trip.id, expense.id)
                    setDeleteDialogOpen(false)
                    onRefresh?.()
                }}
            />
        </Box>
    )
}
