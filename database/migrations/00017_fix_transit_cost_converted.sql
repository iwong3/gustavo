-- Fix "Dec 12 Transit" expense in Japan 2025 trip
-- Was entered as USD instead of JPY, so cost_converted_usd was set to 1560.00
-- instead of the correct ~$10.02
UPDATE expenses
SET cost_converted_usd = 10.02,
    exchange_rate = 155.69,
    updated_at = NOW()
WHERE name = 'Dec 12 Transit'
  AND cost_original = 1560
  AND currency = 'JPY'
  AND trip_id = (SELECT id FROM trips WHERE slug = 'japan-2025')
  AND deleted_at IS NULL;
