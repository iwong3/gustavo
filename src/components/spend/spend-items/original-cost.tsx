import { FormattedMoney, Spend } from 'helpers/spend'
import { Box } from '@mui/material'

interface IOriginalCostProps {
    spend: Spend
}

export const OriginalCost = ({ spend }: IOriginalCostProps) => {
    return <Box>{FormattedMoney(spend.currency).format(spend.cost)}</Box>
}
