# Billing System Documentation

## Overview

The billing system in Service Vault manages hourly rates, account-specific overrides, and invoice generation. It follows a two-tier rate structure with global defaults and per-account customizations.

## Core Components

### 1. Billing Rate Management

#### BillingRate Model
```prisma
model BillingRate {
  id          String  @id @default(cuid())
  name        String  @unique
  rate        Float
  description String?
  isDefault   Boolean @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  timeEntries      TimeEntry[]
  accountRates     AccountBillingRate[]
}
```

**Purpose**: System-wide default billing rates that serve as the foundation for all billing calculations.

**Key Features**:
- Global rate definitions (e.g., "Senior Developer", "Junior Developer", "Project Manager")
- Default rate designation (`isDefault`) for automatic selection
- Base rates that can be overridden per account

#### AccountBillingRate Model
```prisma
model AccountBillingRate {
  id            String  @id @default(cuid())
  accountId     String
  billingRateId String
  rate          Float   // Override rate for this account
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  account     Account     @relation(fields: [accountId], references: [id])
  billingRate BillingRate @relation(fields: [billingRateId], references: [id])

  @@unique([accountId, billingRateId])
}
```

**Purpose**: Account-specific rate overrides that allow customized billing for different clients.

**Key Features**:
- One override per account per billing rate type
- Completely replaces the default rate when present
- Maintains audit trail with creation/update timestamps

### 2. Rate Resolution Logic

#### Current Implementation
When a time entry is created, the system:

1. **User Selection**: User selects from available `BillingRate` records
2. **Rate Lookup**: System retrieves the selected `BillingRate.rate` value
3. **Snapshotting**: Rate value is stored in `TimeEntry.billingRateValue`

#### Missing Logic (To Be Implemented)
The system should check for account-specific overrides:

```typescript
async function resolveEffectiveRate(accountId: string, billingRateId: string): Promise<number> {
  // 1. Check for account-specific override
  const accountRate = await prisma.accountBillingRate.findUnique({
    where: {
      accountId_billingRateId: { accountId, billingRateId }
    }
  });
  
  if (accountRate) {
    return accountRate.rate; // Use override
  }
  
  // 2. Fall back to default rate
  const defaultRate = await prisma.billingRate.findUnique({
    where: { id: billingRateId }
  });
  
  return defaultRate?.rate || 0;
}
```

### 3. Time Entry Rate Snapshotting

#### TimeEntry Billing Fields
```prisma
model TimeEntry {
  // ... other fields
  billingRateId    String?   // Reference to billing rate used
  billingRateName  String?   // Snapshot of rate name at time of entry
  billingRateValue Float?    // Snapshot of rate value at time of entry
  // ... other fields
}
```

**Purpose**: Maintain billing integrity by preserving point-in-time rate information.

**Key Benefits**:
- **Audit Trail**: Historical record of what rate was applied when
- **Invoice Stability**: Invoices remain accurate even if rates change
- **Dispute Resolution**: Clear evidence of agreed-upon rates at time of work

#### Rate Assignment Flow

1. **Time Entry Creation**:
   ```typescript
   // Get effective rate (with override logic)
   const effectiveRate = await resolveEffectiveRate(accountId, billingRateId);
   const billingRate = await prisma.billingRate.findUnique({
     where: { id: billingRateId }
   });

   // Create time entry with snapshots
   await prisma.timeEntry.create({
     data: {
       // ... other fields
       billingRateId: billingRateId,
       billingRateName: billingRate.name,
       billingRateValue: effectiveRate, // Use resolved rate
     }
   });
   ```

2. **Rate Updates**: Changing system rates doesn't affect existing time entries
3. **Invoice Generation**: Uses `billingRateValue` from time entries, not live rates

### 4. Invoice Generation Process

#### Data Flow
```
TimeEntry.billingRateValue × (TimeEntry.minutes ÷ 60) = Line Item Amount
```

#### Invoice Calculation Logic
```typescript
// From /src/app/api/invoices/generate/route.ts
const timeTotal = timeEntries.reduce((sum, entry) => {
  return sum + ((entry.minutes / 60) * (entry.billingRateValue || 0));
}, 0);
```

#### Key Features
- **Snapshot-Based**: Uses historical rate values, not current rates
- **Filtering**: Only approved, non-no-charge time entries
- **Multi-Account**: Supports subsidiary account aggregation
- **Audit Trail**: Maintains link between invoice items and time entries

### 5. API Endpoints

#### Billing Rate Management
- `GET /api/billing/rates` - List all system billing rates
- `POST /api/billing/rates` - Create new billing rate
- `PUT /api/billing/rates/[id]` - Update billing rate
- `DELETE /api/billing/rates/[id]` - Delete billing rate

#### Account Rate Overrides
- `GET /api/billing/customer-rates?customerId=[id]` - List account overrides
- `POST /api/billing/customer-rates` - Create account override
- `PUT /api/billing/customer-rates/[id]` - Update account override
- `DELETE /api/billing/customer-rates/[id]` - Delete account override

#### Invoice Generation
- `POST /api/invoices/generate` - Generate invoice from time entries
- `POST /api/invoices/preview` - Preview invoice before generation

### 6. Business Rules

#### Rate Selection Priority
1. **Account Override**: If `AccountBillingRate` exists for account + rate combination
2. **Default Rate**: Fall back to `BillingRate.rate` value
3. **Zero Rate**: If no rate found (edge case protection)

#### Time Entry Billing Rules
- Only approved time entries are billable (`isApproved = true`)
- No-charge entries are excluded (`noCharge = false`)
- Rate snapshots are immutable once created
- Time calculations use minutes converted to decimal hours

#### Invoice Generation Rules
- Only unbilled time entries by default
- Date range filtering supported
- Manual selection override available
- Includes both time entries and ticket addons
- Creates invoice items with individual line items

### 7. Known Issues & Future Improvements

#### Current Limitations
1. **Missing Override Logic**: Time entry creation doesn't check account overrides
2. **API Inconsistencies**: Some endpoints reference non-existent tables
3. **Manual Rate Selection**: No automatic rate suggestion based on user role
4. **Limited Reporting**: No rate effectiveness or profitability analysis

#### Planned Enhancements
1. **Automatic Override Resolution**: Implement `resolveEffectiveRate()` function
2. **Role-Based Rate Defaults**: Auto-suggest rates based on user permissions
3. **Rate History Tracking**: Version control for rate changes
4. **Profitability Analytics**: Compare actual rates vs costs
5. **Bulk Rate Updates**: Mass update capabilities for rate adjustments

### 8. Integration Points

#### Account Management
- Account hierarchy affects rate inheritance
- Account settings control billing visibility
- Account-specific overrides managed through account detail pages

#### Time Tracking
- Timer system integrates with rate selection
- Time entry approval workflow affects billability
- Rate information displayed in time entry forms

#### User Management
- User roles may influence default rate selection
- Permission system controls rate management access
- User assignments determine billing responsibility

### 9. Data Integrity Considerations

#### Rate Consistency
- Foreign key constraints ensure data integrity
- Unique constraints prevent duplicate overrides
- Cascade deletes handled appropriately

#### Audit Requirements
- All rate changes tracked with timestamps
- Time entry snapshots provide historical accuracy
- Invoice generation maintains traceability

#### Performance Optimization
- Indexed foreign keys for fast lookups
- Rate resolution caching opportunities
- Bulk operations for invoice generation

## Conclusion

The billing system provides a flexible foundation for rate management with room for enhancement. The key strength is the snapshot-based approach that maintains historical accuracy, while the main opportunity is implementing proper account override resolution in the time entry creation flow.