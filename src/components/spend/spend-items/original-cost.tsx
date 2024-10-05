import { Box } from '@mui/material'

import { FormattedMoney } from 'helpers/currency'
import { Spend } from 'helpers/spend'

interface IOriginalCostProps {
    spend: Spend
}

export const OriginalCost = ({ spend }: IOriginalCostProps) => {
    return <Box>{FormattedMoney(spend.currency).format(spend.originalCost)}</Box>
}
