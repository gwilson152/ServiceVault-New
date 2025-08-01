/**
 * Ticket Number Generator Utility
 * Generates user-friendly ticket numbers based on configurable templates
 */

import { prisma } from "./prisma";

// Default ticket number template
export const DEFAULT_TICKET_NUMBER_TEMPLATE = "{account}-{year}-{sequence:3}";

// Available template tags
export interface TicketNumberTemplateVars {
  account: string;      // Account name/code (first 4 chars, uppercase)
  year: string;         // Current year (YYYY)
  month: string;        // Current month (MM)
  day: string;          // Current day (DD)
  sequence: string;     // Sequential number (padded)
  random: string;       // Random string (4 chars)
}

/**
 * Get ticket number template from settings
 */
export async function getTicketNumberTemplate(): Promise<string> {
  try {
    const setting = await prisma.systemSettings.findUnique({
      where: { key: "ticketNumberTemplate" }
    });
    return setting?.value || DEFAULT_TICKET_NUMBER_TEMPLATE;
  } catch (error) {
    console.error("Failed to get ticket number template:", error);
    return DEFAULT_TICKET_NUMBER_TEMPLATE;
  }
}

/**
 * Generate template variables for ticket number generation
 */
function generateTemplateVars(accountName: string): TicketNumberTemplateVars {
  const now = new Date();
  
  return {
    account: accountName.substring(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, ''),
    year: now.getFullYear().toString(),
    month: (now.getMonth() + 1).toString().padStart(2, '0'),
    day: now.getDate().toString().padStart(2, '0'),
    sequence: "", // Will be filled by getNextSequence
    random: Math.random().toString(36).substring(2, 6).toUpperCase()
  };
}

/**
 * Get the next sequence number for the given template pattern
 */
async function getNextSequence(templatePattern: string): Promise<number> {
  try {
    // Find all tickets that match the pattern (excluding sequence part)
    const tickets = await prisma.ticket.findMany({
      select: { ticketNumber: true },
      orderBy: { createdAt: 'desc' }
    });

    // Extract sequence numbers from matching tickets
    const sequences: number[] = [];
    const patternRegex = templatePattern.replace(/\{sequence:\d+\}/g, '(\\d+)');
    const regex = new RegExp(patternRegex);

    for (const ticket of tickets) {
      const match = ticket.ticketNumber.match(regex);
      if (match && match[1]) {
        sequences.push(parseInt(match[1], 10));
      }
    }

    // Return next sequence number
    return sequences.length > 0 ? Math.max(...sequences) + 1 : 1;
  } catch (error) {
    console.error("Failed to get next sequence:", error);
    return 1;
  }
}

/**
 * Replace template variables in the template string
 */
function replaceTemplateVars(template: string, vars: TicketNumberTemplateVars): string {
  let result = template;

  // Replace simple variables
  Object.entries(vars).forEach(([key, value]) => {
    if (key !== 'sequence') {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }
  });

  // Handle sequence with padding
  const sequenceMatch = result.match(/\{sequence:(\d+)\}/);
  if (sequenceMatch) {
    const padding = parseInt(sequenceMatch[1], 10);
    result = result.replace(sequenceMatch[0], vars.sequence.padStart(padding, '0'));
  } else {
    // Handle sequence without padding
    result = result.replace(/\{sequence\}/g, vars.sequence);
  }

  return result;
}

/**
 * Generate a unique ticket number based on the template
 */
export async function generateTicketNumber(accountName: string): Promise<string> {
  try {
    const template = await getTicketNumberTemplate();
    const vars = generateTemplateVars(accountName);
    
    // Create a pattern to find existing tickets with similar structure
    let templatePattern = template;
    Object.entries(vars).forEach(([key, value]) => {
      if (key !== 'sequence') {
        templatePattern = templatePattern.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
      }
    });

    // Get next sequence number
    const nextSequence = await getNextSequence(templatePattern);
    vars.sequence = nextSequence.toString();

    // Generate the final ticket number
    const ticketNumber = replaceTemplateVars(template, vars);

    // Ensure uniqueness (in case of race conditions)
    const existingTicket = await prisma.ticket.findUnique({
      where: { ticketNumber }
    });

    if (existingTicket) {
      // If somehow the number exists, append a random suffix
      return `${ticketNumber}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    }

    return ticketNumber;
  } catch (error) {
    console.error("Failed to generate ticket number:", error);
    // Fallback to timestamp-based number
    return `TICKET-${Date.now()}`;
  }
}

/**
 * Validate ticket number template
 */
export function validateTicketNumberTemplate(template: string): { valid: boolean; error?: string } {
  if (!template || template.trim().length === 0) {
    return { valid: false, error: "Template cannot be empty" };
  }

  // Check for required sequence tag
  if (!template.includes('{sequence}') && !template.includes('{sequence:')) {
    return { valid: false, error: "Template must include {sequence} or {sequence:N} tag" };
  }

  // Check for valid template tags
  const validTags = ['account', 'year', 'month', 'day', 'sequence', 'random'];
  const templateTags = template.match(/\{([^}]+)\}/g) || [];
  
  for (const tag of templateTags) {
    const tagName = tag.replace(/[{}]/g, '').split(':')[0];
    if (!validTags.includes(tagName)) {
      return { valid: false, error: `Unknown template tag: ${tag}` };
    }
  }

  // Check sequence padding format
  const sequenceMatches = template.match(/\{sequence:(\d+)\}/g) || [];
  for (const match of sequenceMatches) {
    const padding = match.match(/\{sequence:(\d+)\}/)?.[1];
    if (padding && (parseInt(padding, 10) < 1 || parseInt(padding, 10) > 10)) {
      return { valid: false, error: "Sequence padding must be between 1 and 10" };
    }
  }

  return { valid: true };
}

/**
 * Get available template tags with descriptions
 */
export function getAvailableTemplateTags(): Array<{ tag: string; description: string; example: string }> {
  return [
    { tag: '{account}', description: 'Account name (first 4 chars, uppercase)', example: 'ACME' },
    { tag: '{year}', description: 'Current year', example: '2024' },
    { tag: '{month}', description: 'Current month (MM)', example: '03' },
    { tag: '{day}', description: 'Current day (DD)', example: '15' },
    { tag: '{sequence}', description: 'Sequential number', example: '1' },
    { tag: '{sequence:3}', description: 'Sequential number with padding', example: '001' },
    { tag: '{random}', description: 'Random 4-character string', example: 'A7X2' },
  ];
}

/**
 * Preview ticket number generation with given template
 */
export function previewTicketNumber(template: string, accountName: string = "Sample Account"): string {
  const vars = generateTemplateVars(accountName);
  vars.sequence = "1"; // Use 1 for preview
  
  return replaceTemplateVars(template, vars);
}