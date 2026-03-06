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
    IconCirclesRelation,
    IconClock,
    IconCurrencyDollar,
    IconDots,
    IconExclamationCircle,
    IconExternalLink,
    IconHandFingerLeft,
    IconHandFingerRight,
    IconLayoutList,
    IconLayoutNavbarCollapse,
    IconLink,
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
    IconToolsKitchen2,
    IconUser,
    IconX,
} from '@tabler/icons-react'

import type { MenuItemData } from 'components/menu/menu'

import { MenuItem, SortItem, ToolsMenuItem } from 'components/menu/enums'
import { defaultBackgroundColor } from 'utils/colors'

import type { Expense } from '@/lib/types'

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
    fill = defaultBackgroundColor,
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
        case 'IconCirclesRelation':
            return <IconCirclesRelation {...props} />
        case 'IconClock':
            return <IconClock {...props} />
        case 'IconCurrencyDollar':
            return <IconCurrencyDollar {...props} fill="none" />
        case 'IconDots':
            return <IconDots {...props} />
        case 'IconExclamationCircle':
            return <IconExclamationCircle {...props} />
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
        case 'IconLink':
            return <IconLink {...props} />
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
        case 'IconToolsKitchen2':
            return <IconToolsKitchen2 {...props} />
        case 'IconUser':
            return <IconUser {...props} />
        case 'IconX':
            return <IconX {...props} />
        default:
            return null
    }
}

export const getMenuItemIcon = (
    item: MenuItem,
    size: number = defaultIconSize
) => {
    switch (item) {
        case MenuItem.FilterLocation:
            return getTablerIcon({
                name: 'IconMap2',
                size,
                fill: defaultBackgroundColor,
            })
        case MenuItem.FilterPaidBy:
            return getTablerIcon({
                name: 'IconReceipt',
                size,
                fill: defaultBackgroundColor,
            })
        case MenuItem.FilterSpendType:
            return getTablerIcon({
                name: 'IconTag',
                size,
                fill: defaultBackgroundColor,
            })
        case MenuItem.FilterSplitBetween:
            return getTablerIcon({
                name: 'IconUser',
                size,
                fill: defaultBackgroundColor,
            })
        case MenuItem.Sort:
            return <FunnelSimple size={size} />
        case MenuItem.Tools:
            return getTablerIcon({
                name: 'IconTool',
                fill: defaultBackgroundColor,
            })
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
    return defaultBackgroundColor
}

export const getToolsMenuItemIcon = (
    item: ToolsMenuItem,
    size: number = 18
) => {
    switch (item) {
        case ToolsMenuItem.Receipts:
            return getTablerIcon({
                name: 'IconLayoutList',
                size,
            })
        case ToolsMenuItem.DebtCalculator:
            return <HandCoins size={size} weight="fill" />
        case ToolsMenuItem.TotalSpend:
            return getTablerIcon({
                name: 'IconChartBar',
                size,
            })
        case ToolsMenuItem.TotalSpendByPerson:
            return getTablerIcon({
                name: 'IconUser',
                size,
            })
        case ToolsMenuItem.TotalSpendByType:
            return getTablerIcon({
                name: 'IconTag',
                size,
            })
        case ToolsMenuItem.TotalSpendByLocation:
            return getTablerIcon({
                name: 'IconMap2',
                size,
            })
        case ToolsMenuItem.TotalSpendByDate:
            return getTablerIcon({
                name: 'IconCalendarEvent',
                size,
            })
        case ToolsMenuItem.Links:
            return getTablerIcon({
                name: 'IconExternalLink',
                size,
            })
        default:
            return null
    }
}

export const getSortMenuItemIcon = (
    item: SortItem,
    size: number = defaultIconSize
) => {
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

// --- Person initials icon (string-based) ---

interface IInitialsIconProps {
    name: string  // first name
    initials?: string | null  // from DB, fallback to derived
    sx?: SxProps<Theme>
}

function deriveInitials(name: string): string {
    // If the name has spaces, use first letter of first two words
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
}

export const InitialsIcon = ({ name, initials, sx }: IInitialsIconProps) => {
    const colors = getInitialsIconColors(name)
    const displayInitials = initials || deriveInitials(name)
    const defaultSx = {
        width: defaultIconSize,
        height: defaultIconSize,
        color: colors.color,
        backgroundColor: colors.bgColor,
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
            {displayInitials}
        </Box>
    )
}

type IconColors = {
    color: string
    bgColor: string
}

// Color by first name — deterministic for known users, hashed for unknown
const personColorMap: Record<string, string> = {
    'Aibek': '#c8553d',
    'Angela': '#64b5f6',
    'Dennis': '#fca311',
    'Ivan': '#ffc857',
    'Jenny': '#c8b6ff',
    'Joanna': '#90a955',
    'Lisa': '#e5989b',
    'Michelle': '#b8c0ff',
    'Suming': '#ffc09f',
}

export const getInitialsIconColors = (name: string): IconColors => {
    const bgColor = personColorMap[name] ?? '#FBBC04'
    return { color: 'black', bgColor }
}

// --- Spend type / category icons (string-based) ---

interface ICategoryIconProps {
    expense: Expense
    size?: number
}

export const CategoryIcon = ({ expense, size = 32 }: ICategoryIconProps) => {
    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                width: size,
                height: size,
                borderRadius: '100%',
                backgroundColor: getColorForCategory(expense.categoryName),
            }}>
            {getIconFromCategory(expense.categoryName, size)}
        </Box>
    )
}

export const getIconFromCategory = (
    category: string | null | undefined,
    size: number = defaultIconSize
) => {
    switch (category) {
        case 'Attraction':
            return <MapPinArea size={size} />
        case 'Transit':
            return <Train size={size} />
        case 'Food':
            return <ForkKnife size={size} />
        case 'Lodging':
            return <Bed size={size} />
        case 'Shopping':
            return <Tote size={size} />
        case 'Other':
        default:
            return getTablerIcon({ name: 'IconCategory', size })
    }
}

export const getColorForCategory = (category: string | null | undefined) => {
    switch (category) {
        case 'Attraction':
            return '#ff9b85'
        case 'Transit':
            return '#aed9e0'
        case 'Food':
            return '#ffd97d'
        case 'Lodging':
            return '#dac4f7'
        case 'Shopping':
            return '#90be6d'
        case 'Other':
        default:
            return 'lightgray'
    }
}

// --- Location icon (string-based) ---

interface ILocationIconProps {
    location: string
    sx?: SxProps<Theme>
}

function getLocationAbbr(location: string): string {
    return location.slice(0, 2).toUpperCase()
}

export const LocationIcon = ({ location, sx }: ILocationIconProps) => {
    const defaultSx = {
        width: defaultIconSize,
        height: defaultIconSize,
        fontSize: 10,
        fontFamily: 'Spectral',
        color: 'black',
        backgroundColor: getLocationColor(location),
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

const locationColorMap: Record<string, string> = {
    'Hakone': '#f3722c',
    'Kyoto': '#739e82',
    'Osaka': '#FBBC04',
    'Tokyo': '#dac4f7',
    'Vancouver': '#90be6d',
}

export const getLocationColor = (location: string): string => {
    return locationColorMap[location] ?? '#a7bed3'
}
