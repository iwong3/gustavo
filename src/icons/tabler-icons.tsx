import {
    IconCalendarDown,
    IconCalendarEvent,
    IconCalendarUp,
    IconCurrencyDollar,
    IconListLetters,
    IconSettings,
    IconSortAscendingLetters,
    IconSortAZ,
    IconSortDescendingLetters,
    IconSortZA,
} from '@tabler/icons-react'

export const getTablerIcon = (iconName: string, size: number = 24, stroke: number = 1.5) => {
    switch (iconName) {
        case 'IconCalendarEvent':
            return <IconCalendarEvent size={size} stroke={stroke} />
        case 'IconCalendarDown':
            return <IconCalendarDown size={size} stroke={stroke} />
        case 'IconCalendarUp':
            return <IconCalendarUp size={size} stroke={stroke} />
        case 'IconCurrencyDollar':
            return <IconCurrencyDollar size={size} stroke={stroke} />
        case 'IconListLetters':
            return <IconListLetters size={size} stroke={stroke} />
        case 'IconSettings':
            return <IconSettings size={size} stroke={stroke} />
        case 'IconSortAZ':
            return <IconSortAZ size={size} stroke={stroke} />
        case 'IconSortZA':
            return <IconSortZA size={size} stroke={stroke} />
        case 'IconSortAscendingLetters':
            return <IconSortAscendingLetters size={size} stroke={stroke} />
        case 'IconSortDescendingLetters':
            return <IconSortDescendingLetters size={size} stroke={stroke} />
        default:
            return null
    }
}
