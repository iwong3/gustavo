import Box from '@mui/material/Box'
import { getPersonInitials, Person } from 'helpers/person'

interface IInitialsIconProps {
    person: Person
    size?: number
    colorOverride?: string
    bgColorOverride?: string
}

export const InitialsIcon = ({
    person,
    size = 24,
    colorOverride,
    bgColorOverride,
}: IInitialsIconProps) => {
    const personColors = getInitialsIconColors(person)
    const color = colorOverride ?? personColors.color
    const bgColor = bgColorOverride ?? personColors.bgColor

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                width: size,
                height: size,
                borderRadius: '100%',
                color: color,
                backgroundColor: bgColor,
                fontWeight: 'bold',
                transition: 'background-color 0.1s',
            }}>
            {getPersonInitials(person)}
        </Box>
    )
}

type IconColors = {
    color: string
    bgColor: string
}

const getInitialsIconColors = (person: Person): IconColors => {
    switch (person) {
        case Person.Aibek:
            return {
                color: 'black',
                bgColor: '#c8553d',
            }
        case Person.Angela:
            return {
                color: 'black',
                bgColor: '#64b5f6',
            }
        case Person.Ivan:
            return {
                color: 'black',
                bgColor: '#ffc857',
            }
        case Person.Jenny:
            return {
                color: 'black',
                bgColor: '#c8b6ff',
            }
        case Person.Joanna:
            return {
                color: 'black',
                bgColor: '#90a955',
            }
        case Person.Lisa:
            return {
                color: 'black',
                bgColor: '#e5989b',
            }
        case Person.Michelle:
            return {
                color: 'black',
                bgColor: '#b8c0ff',
            }
        case Person.Suming:
            return {
                color: 'black',
                bgColor: '#ffc09f',
            }
        default:
            return {
                color: 'black',
                bgColor: '#FBBC04',
            }
    }
}
