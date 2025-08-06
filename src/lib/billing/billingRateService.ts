/**
 * Billing Rate Service
 * 
 * Handles billing rate logic with account-specific overrides.
 * Provides utilities for determining effective billing rates
 * and managing rate snapshots for time entries.
 */

import { prisma } from '@/lib/prisma';

export interface EffectiveBillingRate {
  id: string;
  name: string;
  rate: number;
  isAccountOverride: boolean;
  accountOverrideId?: string;
  inheritedFromAccountId?: string; // ID of parent account if rate is inherited
}

export interface BillingRateSnapshot {
  billingRateId: string;
  billingRateName: string;
  billingRateValue: number;
}

/**
 * Get effective billing rate for an account and billing rate combination
 * Returns account override if available, parent override if available, otherwise system default
 * Implements inheritance hierarchy: Account Override > Parent Override > System Default
 */
export async function getEffectiveBillingRate(
  accountId: string, 
  billingRateId: string
): Promise<EffectiveBillingRate | null> {
  try {
    // Get system billing rate
    const billingRate = await prisma.billingRate.findUnique({
      where: { id: billingRateId }
    });

    if (!billingRate) {
      return null;
    }

    // Get account with parent hierarchy
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        parentId: true,
        parent: {
          select: {
            id: true,
            parentId: true,
            parent: {
              select: {
                id: true,
                parentId: true,
                parent: {
                  select: {
                    id: true,
                    parentId: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!account) {
      return null;
    }

    // Build hierarchy chain (child to root)
    const hierarchyChain = [accountId];
    let currentAccount = account;
    while (currentAccount?.parentId) {
      hierarchyChain.push(currentAccount.parentId);
      currentAccount = currentAccount.parent;
    }

    // Look for billing rate overrides in order of precedence
    // Start with the most specific (current account) and work up the hierarchy
    for (const chainAccountId of hierarchyChain) {
      const accountOverride = await prisma.accountBillingRate.findUnique({
        where: {
          accountId_billingRateId: {
            accountId: chainAccountId,
            billingRateId: billingRateId
          }
        }
      });

      if (accountOverride) {
        return {
          id: billingRate.id,
          name: billingRate.name,
          rate: accountOverride.rate,
          isAccountOverride: true,
          accountOverrideId: accountOverride.id,
          inheritedFromAccountId: chainAccountId !== accountId ? chainAccountId : undefined
        };
      }
    }

    // No overrides found, return system default
    return {
      id: billingRate.id,
      name: billingRate.name,
      rate: billingRate.rate,
      isAccountOverride: false
    };
  } catch (error) {
    console.error('Error getting effective billing rate:', error);
    return null;
  }
}

/**
 * Get all effective billing rates for an account
 * Returns array of rates with account overrides applied
 */
export async function getAccountBillingRates(accountId: string): Promise<EffectiveBillingRate[]> {
  try {
    const billingRates = await prisma.billingRate.findMany({
      orderBy: { name: 'asc' },
      include: {
        accountRates: {
          where: { accountId },
          select: {
            id: true,
            rate: true
          }
        }
      }
    });

    return billingRates.map(rate => {
      const accountOverride = rate.accountRates[0];
      
      return {
        id: rate.id,
        name: rate.name,
        rate: accountOverride?.rate ?? rate.rate,
        isAccountOverride: !!accountOverride,
        accountOverrideId: accountOverride?.id
      };
    });
  } catch (error) {
    console.error('Error getting account billing rates:', error);
    return [];
  }
}

/**
 * Create billing rate snapshot for time entry
 * Captures current effective rate to preserve historical accuracy
 */
export async function createBillingRateSnapshot(
  accountId: string,
  billingRateId: string
): Promise<BillingRateSnapshot | null> {
  try {
    const effectiveRate = await getEffectiveBillingRate(accountId, billingRateId);
    
    if (!effectiveRate) {
      return null;
    }

    return {
      billingRateId: effectiveRate.id,
      billingRateName: effectiveRate.name,
      billingRateValue: effectiveRate.rate
    };
  } catch (error) {
    console.error('Error creating billing rate snapshot:', error);
    return null;
  }
}

/**
 * Get default billing rate for an account
 * Returns the default rate with any account override applied
 */
export async function getDefaultBillingRate(accountId: string): Promise<EffectiveBillingRate | null> {
  try {
    const defaultRate = await prisma.billingRate.findFirst({
      where: { isDefault: true },
      include: {
        accountRates: {
          where: { accountId },
          select: {
            id: true,
            rate: true
          }
        }
      }
    });

    if (!defaultRate) {
      return null;
    }

    const accountOverride = defaultRate.accountRates[0];

    return {
      id: defaultRate.id,
      name: defaultRate.name,
      rate: accountOverride?.rate ?? defaultRate.rate,
      isAccountOverride: !!accountOverride,
      accountOverrideId: accountOverride?.id
    };
  } catch (error) {
    console.error('Error getting default billing rate:', error);
    return null;
  }
}

/**
 * Validate billing rate for account access
 * Ensures user has permission to use billing rate for the account
 */
export async function validateBillingRateAccess(
  billingRateId: string,
  accountId: string
): Promise<boolean> {
  try {
    // Check if billing rate exists
    const billingRate = await prisma.billingRate.findUnique({
      where: { id: billingRateId }
    });

    if (!billingRate) {
      return false;
    }

    // Check if account exists
    const account = await prisma.account.findUnique({
      where: { id: accountId }
    });

    return !!account;
  } catch (error) {
    console.error('Error validating billing rate access:', error);
    return false;
  }
}

/**
 * Calculate billable amount for time entry
 * Uses effective billing rate and time in minutes
 */
export function calculateBillableAmount(ratePerHour: number, minutes: number): number {
  const hours = minutes / 60;
  return Math.round((ratePerHour * hours) * 100) / 100; // Round to 2 decimal places
}

/**
 * Format billing rate for display
 * Includes override indicator if applicable
 */
export function formatBillingRate(rate: EffectiveBillingRate): string {
  const formattedRate = `$${rate.rate.toFixed(2)}/hour`;
  return rate.isAccountOverride ? `${formattedRate} (Account Override)` : formattedRate;
}