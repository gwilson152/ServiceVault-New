import { PrismaClient } from '@prisma/client';
import { DEFAULT_EMAIL_TEMPLATES } from '../src/lib/email/templates';

const prisma = new PrismaClient();

async function seedEmailTemplates() {
  console.log('Seeding email templates...');

  try {
    // Get the first admin user to be the creator
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!adminUser) {
      console.log('No admin user found. Please create an admin user first.');
      return;
    }

    for (const template of DEFAULT_EMAIL_TEMPLATES) {
      // Check if template already exists
      const existingTemplate = await prisma.emailTemplate.findUnique({
        where: { name: template.name }
      });

      if (existingTemplate) {
        console.log(`Template "${template.name}" already exists, skipping...`);
        continue;
      }

      await prisma.emailTemplate.create({
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
          createdBy: adminUser.id
        }
      });

      console.log(`Created template: ${template.name}`);
    }

    console.log('Email templates seeded successfully!');
  } catch (error) {
    console.error('Error seeding email templates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  seedEmailTemplates();
}

export { seedEmailTemplates };