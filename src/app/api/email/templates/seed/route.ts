import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/permissions';
import { DEFAULT_EMAIL_TEMPLATES } from '@/lib/email/templates';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check email templates permission
    const canManageEmailTemplates = await hasPermission(session.user.id, {
      resource: 'email',
      action: 'templates'
    });

    if (!canManageEmailTemplates) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const createdTemplates = [];

    for (const template of DEFAULT_EMAIL_TEMPLATES) {
      // Check if template already exists
      const existingTemplate = await prisma.emailTemplate.findFirst({
        where: { 
          type: template.type,
          isDefault: true
        }
      });

      if (!existingTemplate) {
        const createdTemplate = await prisma.emailTemplate.create({
          data: {
            name: template.name,
            type: template.type,
            subject: template.subject,
            htmlBody: template.htmlBody,
            textBody: template.textBody,
            variables: JSON.stringify(
              template.variables.reduce((acc, variable) => {
                acc[variable.name] = {
                  description: variable.description,
                  example: variable.example,
                  required: variable.required
                };
                return acc;
              }, {} as Record<string, any>)
            ),
            isDefault: true,
            status: 'ACTIVE',
            createdBy: session.user.id
          }
        });

        createdTemplates.push(createdTemplate);
      }
    }

    return NextResponse.json({
      message: `Seeded ${createdTemplates.length} default email templates`,
      templates: createdTemplates.map(t => ({ id: t.id, name: t.name, type: t.type }))
    });

  } catch (error) {
    console.error('Error seeding email templates:', error);
    return NextResponse.json(
      { error: 'Failed to seed email templates' },
      { status: 500 }
    );
  }
}