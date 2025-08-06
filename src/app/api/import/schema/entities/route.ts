import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { permissionService } from '@/lib/permissions/PermissionService';

// Define available target entities for import
const TARGET_ENTITIES = [
  {
    name: 'Account',
    description: 'Business accounts and organizations',
    fields: [
      { name: 'name', type: 'string', required: true, description: 'Account name' },
      { name: 'accountType', type: 'enum', required: false, enum: ['INDIVIDUAL', 'ORGANIZATION', 'SUBSIDIARY'], description: 'Account type' },
      { name: 'parentId', type: 'string', required: false, description: 'Parent account ID for hierarchy' },
      { name: 'companyName', type: 'string', required: false, description: 'Company name' },
      { name: 'address', type: 'string', required: false, description: 'Business address' },
      { name: 'phone', type: 'string', required: false, description: 'Phone number' },
      { name: 'domains', type: 'string', required: false, description: 'Email domains (comma-separated)' },
      { name: 'customFields', type: 'json', required: false, description: 'Additional custom fields' }
    ],
    relationships: [
      { name: 'parent', type: 'one-to-one', target: 'Account', description: 'Parent account' },
      { name: 'children', type: 'one-to-many', target: 'Account', description: 'Child accounts' }
    ]
  },
  {
    name: 'User',
    description: 'System users',
    fields: [
      { name: 'name', type: 'string', required: false, description: 'Full name' },
      { name: 'email', type: 'string', required: true, unique: true, description: 'Email address' },
      { name: 'password', type: 'string', required: false, description: 'Password (will be hashed)' }
    ],
    relationships: []
  },
  {
    name: 'Ticket',
    description: 'Support tickets and tasks',
    fields: [
      { name: 'title', type: 'string', required: true, description: 'Ticket title' },
      { name: 'description', type: 'string', required: false, description: 'Ticket description' },
      { name: 'status', type: 'enum', required: false, enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'CANCELLED', 'ON_HOLD'], description: 'Ticket status' },
      { name: 'priority', type: 'enum', required: false, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], description: 'Priority level' },
      { name: 'accountId', type: 'string', required: true, description: 'Associated account ID' },
      { name: 'assigneeId', type: 'string', required: false, description: 'Assigned user ID' },
      { name: 'creatorId', type: 'string', required: true, description: 'Creator user ID' },
      { name: 'customFields', type: 'json', required: false, description: 'Additional custom fields' }
    ],
    relationships: [
      { name: 'account', type: 'many-to-one', target: 'Account', description: 'Associated account' },
      { name: 'assignee', type: 'many-to-one', target: 'User', description: 'Assigned user' },
      { name: 'creator', type: 'many-to-one', target: 'User', description: 'Creator user' }
    ]
  },
  {
    name: 'TimeEntry',
    description: 'Time tracking entries',
    fields: [
      { name: 'description', type: 'string', required: false, description: 'Work description' },
      { name: 'minutes', type: 'number', required: true, description: 'Time in minutes' },
      { name: 'date', type: 'date', required: true, description: 'Date of work' },
      { name: 'noCharge', type: 'boolean', required: false, description: 'Non-billable flag' },
      { name: 'ticketId', type: 'string', required: false, description: 'Associated ticket ID' },
      { name: 'accountId', type: 'string', required: false, description: 'Direct account association' },
      { name: 'userId', type: 'string', required: true, description: 'User who logged time' },
      { name: 'billingRateId', type: 'string', required: false, description: 'Billing rate ID' }
    ],
    relationships: [
      { name: 'ticket', type: 'many-to-one', target: 'Ticket', description: 'Associated ticket' },
      { name: 'account', type: 'many-to-one', target: 'Account', description: 'Associated account' },
      { name: 'user', type: 'many-to-one', target: 'User', description: 'User who logged time' }
    ]
  },
  {
    name: 'BillingRate',
    description: 'Billing rate definitions',
    fields: [
      { name: 'name', type: 'string', required: true, unique: true, description: 'Rate name' },
      { name: 'rate', type: 'number', required: true, description: 'Hourly rate amount' },
      { name: 'description', type: 'string', required: false, description: 'Rate description' },
      { name: 'isDefault', type: 'boolean', required: false, description: 'Default rate flag' },
      { name: 'isEnabled', type: 'boolean', required: false, description: 'Active rate flag' }
    ],
    relationships: []
  }
];

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission to view import schema
    const canView = await permissionService.hasPermission({
      userId: session.user.id,
      resource: 'imports',
      action: 'view'
    });

    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      entities: TARGET_ENTITIES
    });
  } catch (error) {
    console.error('Error fetching target entities:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}