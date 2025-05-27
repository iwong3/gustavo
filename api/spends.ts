// API endpoints for spends - matches current Google Sheets structure
import { NextApiRequest, NextApiResponse } from 'next'
import { query } from './database'

// Types matching your current interfaces
export interface DbSpend {
    id: number
    trip: string
    name: string
    date: string
    original_cost: number
    currency: string
    converted_cost: number
    paid_by: string
    location_id?: number
    spend_type?: string
    notes?: string
    reported_by?: string
    reported_at?: string
    receipt_image_url?: string
    has_error: boolean
    split_between: string[] // Will be populated from join
}

// GET /api/spends?trip=Japan2024
export const getSpends = async (trip: string): Promise<DbSpend[]> => {
    const result = await query(
        `
    SELECT 
      s.*,
      l.name as location_name,
      ARRAY_AGG(ss.person) as split_between
    FROM spends s
    LEFT JOIN locations l ON s.location_id = l.id
    LEFT JOIN spend_splits ss ON s.id = ss.spend_id
    WHERE s.trip = $1
    GROUP BY s.id, l.name
    ORDER BY s.date DESC, s.created_at DESC
  `,
        [trip]
    )

    return result.rows.map((row) => ({
        ...row,
        split_between: row.split_between.filter((p: string) => p !== null),
    }))
}

// POST /api/spends
export const createSpend = async (
    spend: Omit<DbSpend, 'id'>
): Promise<DbSpend> => {
    const client = await query('BEGIN')

    try {
        // Insert the spend
        const spendResult = await query(
            `
      INSERT INTO spends (
        trip, name, date, original_cost, currency, converted_cost,
        paid_by, location_id, spend_type, notes, reported_by, 
        reported_at, receipt_image_url, has_error
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `,
            [
                spend.trip,
                spend.name,
                spend.date,
                spend.original_cost,
                spend.currency,
                spend.converted_cost,
                spend.paid_by,
                spend.location_id,
                spend.spend_type,
                spend.notes,
                spend.reported_by,
                spend.reported_at,
                spend.receipt_image_url,
                spend.has_error,
            ]
        )

        const newSpend = spendResult.rows[0]

        // Insert split_between relationships
        if (spend.split_between && spend.split_between.length > 0) {
            for (const person of spend.split_between) {
                await query(
                    `
          INSERT INTO spend_splits (spend_id, person)
          VALUES ($1, $2)
        `,
                    [newSpend.id, person]
                )
            }
        }

        await query('COMMIT')

        // Return the complete spend with split_between
        return {
            ...newSpend,
            split_between: spend.split_between,
        }
    } catch (error) {
        await query('ROLLBACK')
        throw error
    }
}

// API handler for Vercel
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    try {
        if (req.method === 'GET') {
            const { trip } = req.query
            if (!trip || typeof trip !== 'string') {
                return res
                    .status(400)
                    .json({ error: 'Trip parameter is required' })
            }

            const spends = await getSpends(trip)
            return res.status(200).json(spends)
        }

        if (req.method === 'POST') {
            const spend = req.body
            const newSpend = await createSpend(spend)
            return res.status(201).json(newSpend)
        }

        res.setHeader('Allow', ['GET', 'POST'])
        res.status(405).end(`Method ${req.method} Not Allowed`)
    } catch (error) {
        console.error('API Error:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
}
