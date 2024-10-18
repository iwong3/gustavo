import { Box, SxProps, Theme } from '@mui/material'
import {
    Bed,
    ForkKnife,
    FunnelSimple,
    HandCoins,
    MapPinArea,
    Tote,
    Train,
    UserCircle,
} from '@phosphor-icons/react'
import {
    IconArrowsSplit2,
    IconCalendarDown,
    IconCalendarEvent,
    IconCalendarUp,
    IconCaretDown,
    IconCaretUp,
    IconCategory,
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
    IconMapQuestion,
    IconNotes,
    IconPhoto,
    IconReceipt,
    IconSearch,
    IconSettings,
    IconShoppingBag,
    IconSortAscendingLetters,
    IconSortAZ,
    IconSortDescendingLetters,
    IconSortZA,
    IconTag,
    IconTextSize,
    IconTool,
    IconUser,
    IconX,
} from '@tabler/icons-react'

import { MenuItem, MenuItemData } from 'components/menu/menu'
import { SortItem } from 'components/menu/sort/sort-menu'
import { ToolsMenuItem } from 'components/menu/tools/tools-menu'
import { getLocationAbbr, Location } from 'helpers/location'
import { getPersonInitials, Person } from 'helpers/person'
import { Spend, SpendType } from 'helpers/spend'

export const defaultIconSize = 20

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
    fill = 'white',
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
        case 'IconCategory':
            return <IconCategory {...props} />
        case 'IconChartBar':
            return <IconChartBar {...props} />
        case 'IconChartBarOff':
            return <IconChartBarOff {...props} />
        case 'IconClock':
            return <IconClock {...props} />
        case 'IconCurrencyDollar':
            return <IconCurrencyDollar {...props} fill="none" />
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
            return <IconListLetters {...props} fill="none" />
        case 'IconMap2':
            return <IconMap2 {...props} />
        case 'IconMapQuestion':
            return <IconMapQuestion {...props} fill="none" />
        case 'IconNotes':
            return <IconNotes {...props} />
        case 'IconPhoto':
            return <IconPhoto {...props} />
        case 'IconReceipt':
            return <IconReceipt {...props} />
        case 'IconSearch':
            return <IconSearch {...props} />
        case 'IconSettings':
            return <IconSettings {...props} />
        case 'IconShoppingBag':
            return <IconShoppingBag {...props} />
        case 'IconSortAZ':
            return <IconSortAZ {...props} fill="none" />
        case 'IconSortZA':
            return <IconSortZA {...props} fill="none" />
        case 'IconSortAscendingLetters':
            return <IconSortAscendingLetters {...props} />
        case 'IconSortDescendingLetters':
            return <IconSortDescendingLetters {...props} />
        case 'IconTag':
            return <IconTag {...props} />
        case 'IconTextSize':
            return <IconTextSize {...props} />
        case 'IconTool':
            return <IconTool {...props} />
        case 'IconUser':
            return <IconUser {...props} />
        case 'IconX':
            return <IconX {...props} />
        default:
            return null
    }
}

export const getMenuItemIcon = (item: MenuItem, size: number = defaultIconSize) => {
    switch (item) {
        case MenuItem.FilterLocation:
            return getTablerIcon({ name: 'IconMap2', size, fill: 'white' })
        case MenuItem.FilterPaidBy:
            return getTablerIcon({ name: 'IconReceipt', size, fill: 'white' })
        case MenuItem.FilterSpendType:
            return getTablerIcon({ name: 'IconTag', size, fill: 'white' })
        case MenuItem.FilterSplitBetween:
            return getTablerIcon({ name: 'IconUser', size, fill: 'white' })
        case MenuItem.Sort:
            return <FunnelSimple size={size} />
        case MenuItem.Tools:
            return getTablerIcon({ name: 'IconTool', fill: 'white' })
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

export const getToolsMenuItemIcon = (item: ToolsMenuItem, size: number = 18) => {
    switch (item) {
        case ToolsMenuItem.Receipts:
            return getTablerIcon({ name: 'IconLayoutList', size, fill: 'white' })
        case ToolsMenuItem.DebtCalculator:
            return <HandCoins size={size} weight="fill" />
        case ToolsMenuItem.TotalSpend:
            return getTablerIcon({ name: 'IconChartBar', size, fill: 'white' })
        case ToolsMenuItem.TotalSpendByPerson:
            return getTablerIcon({ name: 'IconUser', size, fill: 'white' })
        case ToolsMenuItem.TotalSpendByType:
            return getTablerIcon({ name: 'IconTag', size, fill: 'white' })
        case ToolsMenuItem.TotalSpendByLocation:
            return getTablerIcon({ name: 'IconMap2', size, fill: 'white' })
        case ToolsMenuItem.TotalSpendByDate:
            return getTablerIcon({ name: 'IconCalendarEvent', size, fill: 'white' })
        default:
            return null
    }
}

export const getSortMenuItemIcon = (item: SortItem, size: number = defaultIconSize) => {
    switch (item) {
        case SortItem.SortCost:
            return getTablerIcon({ name: 'IconCurrencyDollar', size })
        case SortItem.SortDate:
            return getTablerIcon({ name: 'IconCalendarEvent', size })
        case SortItem.SortItemName:
            return getTablerIcon({ name: 'IconSortAZ', size })
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

export const getInitialsIconColors = (person: Person): IconColors => {
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
    size?: number
}

export const SpendTypeIcon = ({ spend, size = 32 }: ISpendTypeIconProps) => {
    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                width: size,
                height: size,
                borderRadius: '100%',
                backgroundColor: getColorForSpendType(spend.type),
            }}>
            {getIconFromSpendType(spend.type, size)}
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
            return getTablerIcon({ name: 'IconCategory', size })
    }
}

export const getColorForSpendType = (type: SpendType | undefined) => {
    switch (type) {
        case SpendType.Attraction:
            return '#ff9b85'
        case SpendType.Transit:
            return '#aed9e0'
        case SpendType.Food:
            return '#ffd97d'
        case SpendType.Lodging:
            return '#dac4f7'
        case SpendType.Shopping:
            return '#90be6d'
        case SpendType.Other:
        default:
            return 'lightgray'
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
        fontSize: 10,
        fontFamily: 'Spectral',
        color: 'black',
        backgroundColor: getLocationColors(location),
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

export const getLocationColors = (location: Location): string => {
    switch (location) {
        case Location.Hakone:
            return '#f3722c'
        case Location.Kyoto:
            return '#739e82'
        case Location.Osaka:
            return '#FBBC04'
        case Location.Tokyo:
            return '#dac4f7'
        case Location.Other:
        default:
            return '#a7bed3'
    }
}
