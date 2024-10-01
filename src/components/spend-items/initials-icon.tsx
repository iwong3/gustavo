import Box from '@mui/material/Box'
import { getInitials, Person, Spend } from 'helpers/spend'

interface IInitialsIconProps {
    person: Person
    size?: number
    bgColorOverride?: string
}

export const InitialsIcon = ({ person, size = 24, bgColorOverride }: IInitialsIconProps) => {
    const bgColor = bgColorOverride ?? getInitialsIconColor(person)

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                width: size,
                height: size,
                marginLeft: 1,
                color: 'black',
                backgroundColor: bgColor,
                borderRadius: '100%',
            }}>
            {getInitials(person)}
        </Box>
    )
}

const getInitialsIconColor = (person: Person) => {
    switch (person) {
        case Person.Aibek:
            return '#FBBC04'
        case Person.Angela:
            return '#FBBC04'
        case Person.Ivan:
            return '#FBBC04'
        case Person.Jenny:
            return '#FBBC04'
        case Person.Joanna:
            return '#FBBC04'
        case Person.Lisa:
            return '#FBBC04'
        case Person.Michelle:
            return '#FBBC04'
        case Person.MichellesMom:
            return '#FBBC04'
        default:
            return 'gray'
    }
}
