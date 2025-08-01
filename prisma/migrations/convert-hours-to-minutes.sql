-- Migration: Convert hours to minutes in TimeEntry table
-- This migration converts the existing 'hours' field (Float) to 'minutes' field (Int)
-- Formula: minutes = ROUND(hours * 60)

BEGIN TRANSACTION;

-- Step 1: Add new minutes column
ALTER TABLE TimeEntry ADD COLUMN minutes INTEGER;

-- Step 2: Convert existing hours data to minutes
-- ROUND to avoid floating point precision issues
UPDATE TimeEntry SET minutes = ROUND(hours * 60.0);

-- Step 3: Set NOT NULL constraint on minutes column
-- First ensure all records have minutes values
UPDATE TimeEntry SET minutes = 0 WHERE minutes IS NULL;

-- Step 4: In SQLite, we need to recreate the table to remove the hours column
-- and add NOT NULL constraint to minutes

-- Create new table structure
CREATE TABLE TimeEntry_new (
  id TEXT PRIMARY KEY NOT NULL,
  description TEXT,
  minutes INTEGER NOT NULL,
  date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  noCharge BOOLEAN NOT NULL DEFAULT 0,
  billingRateId TEXT,
  billingRateName TEXT,
  billingRateValue REAL,
  isApproved BOOLEAN NOT NULL DEFAULT 0,
  approvedBy TEXT,
  approvedAt DATETIME,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ticketId TEXT,
  accountId TEXT,
  userId TEXT NOT NULL,
  FOREIGN KEY (ticketId) REFERENCES Ticket(id),
  FOREIGN KEY (accountId) REFERENCES Account(id), 
  FOREIGN KEY (userId) REFERENCES User(id),
  FOREIGN KEY (billingRateId) REFERENCES BillingRate(id),
  FOREIGN KEY (approvedBy) REFERENCES User(id)
);

-- Copy all data to new table
INSERT INTO TimeEntry_new (
  id, description, minutes, date, noCharge, billingRateId, billingRateName, 
  billingRateValue, isApproved, approvedBy, approvedAt, createdAt, updatedAt, 
  ticketId, accountId, userId
)
SELECT 
  id, description, minutes, date, noCharge, billingRateId, billingRateName,
  billingRateValue, isApproved, approvedBy, approvedAt, createdAt, updatedAt,
  ticketId, accountId, userId
FROM TimeEntry;

-- Drop old table and rename new one
DROP TABLE TimeEntry;
ALTER TABLE TimeEntry_new RENAME TO TimeEntry;

-- Recreate indexes if any existed
-- (Prisma will handle this when regenerating the client)

COMMIT;

-- Verification query (run separately to check migration)
-- SELECT 
--   id, 
--   minutes, 
--   ROUND(minutes / 60.0, 2) as converted_hours,
--   date
-- FROM TimeEntry 
-- LIMIT 10;