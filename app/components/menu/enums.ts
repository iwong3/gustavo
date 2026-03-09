// Shared menu enums — kept in a separate file to avoid circular imports
// with utils/icons.tsx (which imports these enums AND is imported by menu files)

export enum MenuItem {
    FilterLocation,
    FilterPaidBy,
    FilterSpendType,
    FilterSplitBetween,
    Sort,
    Tools,
    ToolsDebtPerson1,
    ToolsDebtPerson2,
}

export enum SortItem {
    SortCost,
    SortDate,
    SortItemName,
}

export enum ToolsMenuItem {
    Receipts = 'Receipts',
    DebtCalculator = 'DebtCalculator',
    Links = 'Links',
}
