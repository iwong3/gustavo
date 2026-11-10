/**
 * App column width. On phones the screen is narrower than this, so nothing
 * changes; on wider screens (iPhone Duo inner display, tablets, desktop) the
 * content and the fixed chrome's contents center in a column this wide while
 * the backgrounds stay full-bleed.
 */
export const APP_MAX_WIDTH = 520

/**
 * Horizontal padding that centers a full-width element's content in the
 * APP_MAX_WIDTH column, plus `inset` px of edge padding inside the column.
 * Use as `paddingX`/`paddingInline` on viewport-wide `position: fixed` boxes
 * (#main-scroll, header, bottom bars): percentage padding resolves against
 * the containing block's width, which for a fixed element is the viewport.
 * Padding (not a max-width wrapper) keeps children as direct children of the
 * scroller, so their `height/minHeight: 100%` and `position: sticky` still
 * resolve against #main-scroll, and the scrollbar stays at the screen edge.
 */
export function columnPaddingX(inset = 0): string {
    return `max(${inset}px, calc((100% - ${APP_MAX_WIDTH}px) / 2 + ${inset}px))`
}
