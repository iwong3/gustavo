import { Box } from '@mui/material'

import { useSettingsIconLabelsStore } from 'components/menu/settings/settings-icon-labels'
import { SpendRow } from 'components/spend/spend-row'
import { Spend } from 'helpers/spend'

interface ISpendTableProps {
    spendData: Spend[]
}

export const SpendTable = ({ spendData }: ISpendTableProps) => {
    const { showIconLabels } = useSettingsIconLabelsStore()

    return (
        <Box
            sx={{
                marginBottom: showIconLabels ? 20 : 16, // could make this dynamic based on if filter menu is open or not
            }}>
            {spendData.map((row, index) => (
                <Box
                    key={'row-' + index}
                    sx={{
                        margin: 1,
                        border: '1px solid #FBBC04',
                        borderRadius: 4,
                        backgroundColor: 'white',
                    }}>
                    <SpendRow spend={row} />
                </Box>
            ))}
        </Box>
    )
}
