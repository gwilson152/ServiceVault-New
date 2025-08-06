import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { permissionService } from '@/lib/permissions/PermissionService';
import { emailService } from '@/lib/email/EmailService';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check email settings permission
    const canManageEmailSettings = await permissionService.hasPermission({
      userId: session.user.id,
      resource: "email",
      action: "settings"
    });

    if (!canManageEmailSettings) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { testEmail, templateId, variables } = body;

    if (!testEmail) {
      return NextResponse.json(
        { error: 'Test email address is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Test connection first
    const connectionTest = await emailService.testConnection();
    if (!connectionTest) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to connect to SMTP server. Please check your email settings.' 
        },
        { status: 400 }
      );
    }

    // Send test email
    let emailId;
    
    if (templateId && variables) {
      // Send template test email
      try {
        const template = await prisma.emailTemplate.findUnique({
          where: { id: templateId },
          include: {
            creator: { select: { name: true, email: true } }
          }
        });

        if (!template) {
          return NextResponse.json(
            { success: false, error: 'Template not found' },
            { status: 404 }
          );
        }

        if (template.status !== 'ACTIVE') {
          return NextResponse.json(
            { success: false, error: 'Template is not active' },
            { status: 400 }
          );
        }

        // Add test prefix to subject to distinguish test emails
        const testSubject = `[TEST] ${template.subject}`;
        
        emailId = await emailService.sendTemplateEmail(template.type as import('@prisma/client').EmailTemplateType, {
          to: testEmail,
          toName: session.user.name || 'Test Recipient'
        }, {
          ...variables,
          // Add test context to variables
          testContext: `This is a test email sent by ${session.user.name || session.user.email} at ${new Date().toLocaleString()}`
        }, {
          subject: testSubject, // Override subject with test prefix
          templateId: template.id
        });

      } catch (error) {
        console.error('Error sending template test email:', error);
        return NextResponse.json(
          { 
            success: false, 
            error: error instanceof Error ? error.message : 'Failed to send template test email' 
          },
          { status: 500 }
        );
      }
    } else {
      // Send basic SMTP test email
      emailId = await emailService.queueEmail({
        to: testEmail,
        toName: session.user.name || 'Test Recipient',
        subject: '[TEST] Email Configuration Test - ServiceVault',
        htmlBody: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #333; margin-bottom: 10px;">ServiceVault</h1>
              <p style="color: #666; font-size: 16px;">Email Configuration Test</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
              <h2 style="color: #333; margin-top: 0;">✓ Email Test Successful</h2>
              <p style="font-size: 16px; line-height: 1.6; color: #555;">
                Congratulations! Your email configuration is working correctly.
              </p>
              <p style="font-size: 16px; line-height: 1.6; color: #555;">
                This test email was sent from your ServiceVault system at <strong>${new Date().toLocaleString()}</strong>.
              </p>
              
              <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #333;">SMTP Test Details</h3>
                <p style="margin: 10px 0;"><strong>Sent by:</strong> ${session.user.name || session.user.email}</p>
                <p style="margin: 10px 0;"><strong>Sent to:</strong> ${testEmail}</p>
                <p style="margin: 10px 0;"><strong>Test Date:</strong> ${new Date().toLocaleString()}</p>
                <p style="margin: 10px 0;"><strong>Test Type:</strong> Basic SMTP Configuration Test</p>
              </div>
            </div>
            
            <div style="border-top: 1px solid #e9ecef; padding-top: 20px; margin-top: 30px;">
              <p style="font-size: 12px; color: #999; text-align: center;">
                This is an automated test email from ServiceVault. You can safely delete this message.
              </p>
            </div>
          </div>
        `,
        textBody: `
ServiceVault - Email Configuration Test

✓ Email Test Successful

Congratulations! Your email configuration is working correctly.

This test email was sent from your ServiceVault system at ${new Date().toLocaleString()}.

SMTP Test Details:
- Sent by: ${session.user.name || session.user.email}
- Sent to: ${testEmail}
- Test Date: ${new Date().toLocaleString()}
- Test Type: Basic SMTP Configuration Test

This is an automated test email from ServiceVault. You can safely delete this message.
        `,
        priority: 1, // High priority for test emails
        createdBy: session.user.id
      });
    }

    return NextResponse.json({
      success: true,
      message: templateId ? 'Template test email sent successfully' : 'Basic test email sent successfully',
      emailId,
      templateUsed: templateId ? true : false
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send test email' 
      },
      { status: 500 }
    );
  }
}