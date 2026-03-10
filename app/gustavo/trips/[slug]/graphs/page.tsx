'use client'

import { colors, hardShadow } from '@/lib/colors'
import { Box, Typography } from '@mui/material'

import { DimensionChart } from 'components/insights/dimension-chart'
import { StatsCards } from 'components/insights/stats-cards'
import { TimelineChart } from 'components/insights/timeline-chart'
import { useDashboardData } from 'hooks/useDashboardData'
import { getTablerIcon } from 'utils/icons'

export default function InsightsPage() {
    const {
        activeDimension,
        setActiveDimension,
        selectedKey,
        handleBarClick,
        clearSelection,
        chartData,
        stats,
        timelineData,
        timelineCategories,
        personMetric,
        setPersonMetric,
    } = useDashboardData()

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: '100%',
                maxWidth: 450,
                paddingX: 2,
                paddingY: 2,
                gap: 3,
            }}>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, alignSelf: 'flex-start', paddingX: 1.5, paddingY: 0.75, background: 'linear-gradient(135deg, #f0b490 0%, #cdbfdb 100%)', ...hardShadow, borderRadius: '4px' }}>
                {getTablerIcon({ name: 'IconChartBar', size: 20, stroke: 2, color: colors.primaryBlack, fill: colors.primaryWhite })}
                <Typography sx={{ fontSize: 15, fontWeight: 700, color: colors.primaryBlack, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Insights
                </Typography>
            </Box>
            {/* Cross-filter indicator */}
            {selectedKey && stats.filterLabel && (
                <Box
                    onClick={clearSelection}
                    sx={{
                        'display': 'flex',
                        'alignItems': 'center',
                        'gap': 1,
                        'paddingX': 1.5,
                        'paddingY': 0.5,
                        'backgroundColor': colors.primaryYellow,
                        ...hardShadow,
                        'borderRadius': '20px',
                        'cursor': 'pointer',
                        'alignSelf': 'flex-start',
                        '&:active': {
                            boxShadow: 'none',
                            transform: 'translate(2px, 2px)',
                        },
                        'transition': 'transform 0.1s, box-shadow 0.1s',
                    }}>
                    <Typography
                        sx={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: colors.primaryBlack,
                        }}>
                        Filtered: {stats.filterLabel}
                    </Typography>
                    <Typography
                        sx={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: colors.primaryBlack,
                            lineHeight: 1,
                        }}>
                        &times;
                    </Typography>
                </Box>
            )}

            {/* Stats cards */}
            <StatsCards stats={stats} />

            {/* Primary dimension chart with toggle */}
            <DimensionChart
                dimension={activeDimension}
                onDimensionChange={setActiveDimension}
                data={chartData}
                selectedKey={selectedKey}
                onBarClick={(index) => handleBarClick(index, chartData)}
                personMetric={personMetric}
                onPersonMetricChange={setPersonMetric}
            />

            {/* Timeline stacked bar chart */}
            <TimelineChart
                data={timelineData}
                categories={timelineCategories}
            />
        </Box>
    )
}
