-- Migration: Prevent overlapping bookings for the same property
-- File: supabase/migrations/20260801200000_booking_overlap_constraint.sql

-- Enable btree_gist extension required for multi-column exclusion constraints with range types
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Add exclusion constraint to bookings table
-- Prevents overlapping daterange(data_inicio, data_fim) for the same property_id
-- Only applies to active bookings (ignores 'cancelada', 'recusada', 'concluida')
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'no_overlapping_bookings'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT no_overlapping_bookings
      EXCLUDE USING gist (
        property_id WITH =,
        daterange(data_inicio, data_fim, '[)') WITH &&
      )
      WHERE (status NOT IN ('cancelada', 'recusada', 'concluida'));
  END IF;
END $$;
