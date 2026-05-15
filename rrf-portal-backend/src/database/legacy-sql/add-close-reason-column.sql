-- Migration: Add close_reason column to rrfs table
-- Stores classification key for RRF closure reason
-- Values: RESOURCE_HIRED_EXTERNAL | SOURCED_INTERNALLY | CLOSED_BY_BUSINESS

ALTER TABLE rrfs ADD COLUMN IF NOT EXISTS close_reason VARCHAR(50);
