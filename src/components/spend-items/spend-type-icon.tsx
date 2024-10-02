import Box from '@mui/material/Box'
import { BowlFood, Train, Gift, Bed, MapPin, ListBullets } from '@phosphor-icons/react'

import { Spend, SpendType } from 'helpers/spend'

interface ISpendTypeIconProps {
    spend: Spend
}

export const SpendTypeIcon = ({ spend }: ISpendTypeIconProps) => {
    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                height: '100%',
                marginLeft: 2,
            }}>
            <Box
                sx={{
                    display: 'flex',
                    borderRadius: '20%',
                    border: '1px solid gray',
                    p: 0.25,
                }}>
                {getIconFromSpendType(spend.type, 32)}
            </Box>
        </Box>
    )
}

const getIconFromSpendType = (type: SpendType | undefined, size: number) => {
    switch (type) {
        case SpendType.Attraction:
            return <MapPin size={size} />
        case SpendType.Commute:
            return <Train size={size} />
        case SpendType.Food:
            return <BowlFood size={size} />
        case SpendType.Lodging:
            return <Bed size={size} />
        case SpendType.Souvenir:
            return <Gift size={size} />
        case SpendType.Other:
        default:
            return <ListBullets size={size} />
    }
}
