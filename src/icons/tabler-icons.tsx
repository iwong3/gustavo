import {
    IconCalendarDown,
    IconCalendarEvent,
    IconCalendarUp,
    IconChartBar,
    IconChartBarOff,
    IconCurrencyDollar,
    IconDots,
    IconLayoutList,
    IconListLetters,
    IconSettings,
    IconShoppingBag,
    IconSortAscendingLetters,
    IconSortAZ,
    IconSortDescendingLetters,
    IconSortZA,
} from '@tabler/icons-react'

type TablerIconProps = {
    name: string
    size?: number
    stroke?: number
    color?: string
    fill?: string
}

export const getTablerIcon = ({
    name,
    size = 24,
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
        case 'IconCalendarEvent':
            return <IconCalendarEvent {...props} />
        case 'IconCalendarDown':
            return <IconCalendarDown {...props} />
        case 'IconCalendarUp':
            return <IconCalendarUp {...props} />
        case 'IconChartBar':
            return <IconChartBar {...props} />
        case 'IconChartBarOff':
            return <IconChartBarOff {...props} />
        case 'IconCurrencyDollar':
            return <IconCurrencyDollar {...props} />
        case 'IconDots':
            return <IconDots {...props} />
        case 'IconLayoutList':
            return <IconLayoutList {...props} />
        case 'IconListLetters':
            return <IconListLetters {...props} />
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
        default:
            return null
    }
}
