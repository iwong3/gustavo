import Box from '@mui/material/Box'
import { Bed, ForkKnife, Gift, ListBullets, MapPinArea, Train } from '@phosphor-icons/react'

import { Spend, SpendType } from 'helpers/spend'

interface ISpendTypeIconProps {
    spend: Spend
}

export const SpendTypeIcon = ({ spend }: ISpendTypeIconProps) => {
    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                width: '100%',
                height: '100%',
            }}>
            {getIconFromSpendType(spend.type, 32)}
        </Box>
    )
}

export const getIconFromSpendType = (type: SpendType | undefined, size: number) => {
    switch (type) {
        case SpendType.Attraction:
            return <MapPinArea size={size} />
        case SpendType.Commute:
            return <Train size={size} />
        case SpendType.Food:
            return <ForkKnife size={size} />
        case SpendType.Lodging:
            return <Bed size={size} />
        case SpendType.Souvenir:
            return <Gift size={size} />
        case SpendType.Other:
        default:
            return <ListBullets size={size} />
    }
}
