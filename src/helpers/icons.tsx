import { Box, SxProps, Theme } from '@mui/material'
import {
    MapPinArea,
    Train,
    ForkKnife,
    Bed,
    Tote,
    FunnelSimple,
    Receipt,
    Tag,
    UserCircle,
    HandCoins,
} from '@phosphor-icons/react'
import {
    IconArrowsSplit2,
    IconCalendarDown,
    IconCalendarEvent,
    IconCalendarUp,
    IconCaretDown,
    IconCaretUp,
    IconChartBar,
    IconChartBarOff,
    IconClock,
    IconCurrencyDollar,
    IconDots,
    IconExternalLink,
    IconHandFingerLeft,
    IconHandFingerRight,
    IconLayoutList,
    IconLayoutNavbarCollapse,
    IconListLetters,
    IconMap2,
    IconNotes,
    IconSettings,
    IconShoppingBag,
    IconSortAscendingLetters,
    IconSortAZ,
    IconSortDescendingLetters,
    IconSortZA,
    IconTextSize,
    IconTool,
    IconX,
} from '@tabler/icons-react'

import { MenuItem, MenuItemData } from 'components/menu/menu'
import { ToolsMenuItem } from 'components/menu/tools/tools-menu'
import { getLocationAbbr, Location } from 'helpers/location'
import { Person, getPersonInitials } from 'helpers/person'
import { Spend, SpendType } from 'helpers/spend'

export const defaultIconSize = 24

type TablerIconProps = {
    name: string
    size?: number
    stroke?: number
    color?: string
    fill?: string
}

export const getTablerIcon = ({
    name,
    size = defaultIconSize,
    stroke = 1.5,
    color = 'black',
    fill = 'none',
}: TablerIconProps) => {
    const props = {
        size,
        stroke,
        color,
        fill,
    }
    switch (name) {
        case 'IconArrowsSplit2':
            return <IconArrowsSplit2 {...props} />
        case 'IconCalendarEvent':
            return <IconCalendarEvent {...props} />
        case 'IconCalendarDown':
            return <IconCalendarDown {...props} />
        case 'IconCalendarUp':
            return <IconCalendarUp {...props} />
        case 'IconCaretUp':
            return <IconCaretUp {...props} />
        case 'IconCaretDown':
            return <IconCaretDown {...props} />
        case 'IconChartBar':
            return <IconChartBar {...props} />
        case 'IconChartBarOff':
            return <IconChartBarOff {...props} />
        case 'IconClock':
            return <IconClock {...props} />
        case 'IconCurrencyDollar':
            return <IconCurrencyDollar {...props} />
        case 'IconDots':
            return <IconDots {...props} />
        case 'IconExternalLink':
            return <IconExternalLink {...props} />
        case 'IconHandFingerLeft':
            return <IconHandFingerLeft {...props} />
        case 'IconHandFingerRight':
            return <IconHandFingerRight {...props} />
        case 'IconLayoutList':
            return <IconLayoutList {...props} />
        case 'IconLayoutNavbarCollapse':
            return <IconLayoutNavbarCollapse {...props} />
        case 'IconListLetters':
            return <IconListLetters {...props} />
        case 'IconMap2':
            return <IconMap2 {...props} />
        case 'IconNotes':
            return <IconNotes {...props} />
        case 'IconSettings':
            return <IconSettings {...props} />
        case 'IconShoppingBag':
            return <IconShoppingBag {...props} />
        case 'IconSortAZ':
            return <IconSortAZ {...props} />
        case 'IconSortZA':
            return <IconSortZA {...props} />
        case 'IconSortAscendingLetters':
            return <IconSortAscendingLetters {...props} />
        case 'IconSortDescendingLetters':
            return <IconSortDescendingLetters {...props} />
        case 'IconTextSize':
            return <IconTextSize {...props} />
        case 'IconTool':
            return <IconTool {...props} />
        case 'IconX':
            return <IconX {...props} />
        default:
            return null
    }
}

export const getMenuItemIcon = (item: MenuItem, size: number = defaultIconSize) => {
    switch (item) {
        case MenuItem.FilterLocation:
            return getTablerIcon({ name: 'IconMap2', size })
        case MenuItem.FilterPaidBy:
            return <Receipt size={size} />
        case MenuItem.FilterSpendType:
            return <Tag size={size} />
        case MenuItem.FilterSplitBetween:
            return <UserCircle size={size} />
        case MenuItem.Sort:
            return <FunnelSimple size={size} />
        case MenuItem.Tools:
            return getTablerIcon({ name: 'IconTool' })
        case MenuItem.ToolsDebtPerson1:
            return <UserCircle size={size} />
        case MenuItem.ToolsDebtPerson2:
            return <UserCircle size={size} />
        default:
            return null
    }
}

export const getMenuItemBackgroundColor = (item: MenuItemData) => {
    if (item.state.isActive()) {
        return '#FBBC04'
    }
    return 'white'
}

export const getToolsMenuItemIcon = (item: ToolsMenuItem) => {
    switch (item) {
        case ToolsMenuItem.Receipts:
            return getTablerIcon({ name: 'IconLayoutList', size: 18, fill: 'white' })
        case ToolsMenuItem.DebtCalculator:
            return <HandCoins size={18} weight="fill" />
        case ToolsMenuItem.TotalSpend:
            return getTablerIcon({ name: 'IconChartBar', size: 18, fill: 'white' })
        default:
            return null
    }
}

interface IInitialsIconProps {
    person: Person
    sx?: SxProps<Theme>
}

export const InitialsIcon = ({ person, sx }: IInitialsIconProps) => {
    const personColors = getInitialsIconColors(person)
    const defaultSx = {
        width: defaultIconSize,
        height: defaultIconSize,
        color: personColors.color,
        backgroundColor: personColors.bgColor,
    }

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                borderRadius: '100%',
                fontWeight: 'bold',
                transition: 'background-color 0.1s',
                ...defaultSx,
                ...sx,
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

export const getIconFromSpendType = (
    type: SpendType | undefined,
    size: number = defaultIconSize
) => {
    switch (type) {
        case SpendType.Attraction:
            return <MapPinArea size={size} />
        case SpendType.Transit:
            return <Train size={size} />
        case SpendType.Food:
            return <ForkKnife size={size} />
        case SpendType.Lodging:
            return <Bed size={size} />
        case SpendType.Shopping:
            return <Tote size={size} />
        case SpendType.Other:
        default:
            return getTablerIcon({ name: 'IconDots', size })
    }
}

interface ILocationIconProps {
    location: Location
    sx?: SxProps<Theme>
}

export const LocationIcon = ({ location, sx }: ILocationIconProps) => {
    const defaultSx = {
        width: defaultIconSize,
        height: defaultIconSize,
        fontSize: 12,
        color: 'black',
        backgroundColor: 'lightgray',
    }

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                borderRadius: '100%',
                fontWeight: 'bold',
                textAlign: 'center',
                textTransform: 'uppercase',
                transition: 'background-color 0.1s',
                ...defaultSx,
                ...sx,
            }}>
            {getLocationAbbr(location)}
        </Box>
    )
}
