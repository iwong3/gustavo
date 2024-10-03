import Box from '@mui/material/Box'
import { SortDate } from 'components/menu/sort/sort-date'

export const SortMenu = () => {
    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'space-evenly',
                alignItems: 'center',
                width: '100%',
            }}>
            <SortDate />
        </Box>
    )
}
