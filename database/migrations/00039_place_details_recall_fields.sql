-- Add place fields that help recall what a place was, for the expense
-- details/row redesign.
--
-- All three come from the SAME Google Place Details call we already make when a
-- place is picked in the expense form (field mask gains userRatingCount +
-- priceRange; addressComponents was already fetched but thrown away after the
-- city was derived).
--
--   user_rating_count   "4.6★ (2,431)" — a rating is only meaningful with its N
--   price_range         actual money ("¥1,000–2,000") vs the vague ¥¥ price_level
--   address_components  raw array, so the area display ("Shibuya, Tokyo") can be
--                       re-derived in app code. The fine/coarse rule is
--                       per-country (in JP the ward is the `locality` and the
--                       prefecture is administrative_area_level_1; in the US the
--                       ward-equivalent is `sublocality` and admin_1 is the
--                       state), so storing raw keeps every future rule fix a
--                       code change instead of a re-fetch of every place.

ALTER TABLE place_details
    ADD COLUMN user_rating_count  INTEGER,   -- e.g. 2431
    ADD COLUMN price_range        JSONB,     -- raw Google priceRange {startPrice,endPrice}
    ADD COLUMN address_components JSONB;     -- raw Google addressComponents array

COMMENT ON COLUMN place_details.user_rating_count IS 'Google userRatingCount — number of ratings behind `rating`.';
COMMENT ON COLUMN place_details.price_range IS 'Raw Google priceRange: {startPrice:{currencyCode,units}, endPrice:{...}}. Formatted in lib/place-display.ts.';
COMMENT ON COLUMN place_details.address_components IS 'Raw Google addressComponents array. Area display derived in lib/place-display.ts (rule is per-country).';
