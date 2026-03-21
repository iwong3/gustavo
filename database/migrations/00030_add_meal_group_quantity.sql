-- Add quantity column to meal_groups to track how many times a meal was logged
ALTER TABLE meal_groups ADD COLUMN quantity INT NOT NULL DEFAULT 1;
