import { Box } from '@mui/material'
import { useShallow } from 'zustand/react/shallow'

import { useSettingsIconLabelsStore } from 'components/menu/settings/settings-icon-labels'
import { SpendRow } from 'components/spend/spend-row'
import { useGustavoStore } from 'views/gustavo'

export const SpendTable = () => {
    const { filteredSpendData } = useGustavoStore(useShallow((state) => state))
    const { showIconLabels } = useSettingsIconLabelsStore(useShallow((state) => state))

    return (
        <Box
            sx={{
                marginBottom: showIconLabels ? 20 : 16, // could make this dynamic based on if filter menu is open or not
            }}>
            {filteredSpendData.map((row, index) => (
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
