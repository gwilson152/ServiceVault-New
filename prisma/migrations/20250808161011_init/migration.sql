-- CreateEnum
CREATE TYPE "public"."AccountType" AS ENUM ('INDIVIDUAL', 'ORGANIZATION', 'SUBSIDIARY');

-- CreateEnum
CREATE TYPE "public"."EmailTemplateType" AS ENUM ('USER_INVITATION', 'TICKET_UPDATE', 'TICKET_STATUS_CHANGE', 'TIME_ENTRY_APPROVAL', 'INVOICE_GENERATED', 'PASSWORD_RESET', 'ACCOUNT_WELCOME', 'SYSTEM_NOTIFICATION', 'EMAIL_TICKET_CREATED', 'EMAIL_TICKET_REPLY', 'EMAIL_SECURITY_ALERT', 'EMAIL_QUARANTINE_NOTIFICATION', 'EMAIL_INTEGRATION_ERROR', 'EMAIL_INTEGRATION_SUCCESS', 'EMAIL_AUTO_RESPONSE', 'EMAIL_DELIVERY_CONFIRMATION');

-- CreateEnum
CREATE TYPE "public"."EmailTemplateStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DRAFT');

-- CreateEnum
CREATE TYPE "public"."EmailQueueStatus" AS ENUM ('PENDING', 'SENDING', 'SENT', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."ImportSourceType" AS ENUM ('DATABASE_MYSQL', 'DATABASE_POSTGRESQL', 'DATABASE_SQLITE', 'DATABASE_MONGODB', 'FILE_CSV', 'FILE_EXCEL', 'FILE_JSON', 'API_REST', 'API_GRAPHQL');

-- CreateEnum
CREATE TYPE "public"."ImportStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED', 'PAUSED');

-- CreateEnum
CREATE TYPE "public"."LogLevel" AS ENUM ('INFO', 'WARNING', 'ERROR', 'DEBUG');

-- CreateEnum
CREATE TYPE "public"."EmailProvider" AS ENUM ('MICROSOFT_GRAPH', 'GMAIL', 'GENERIC_IMAP', 'GENERIC_POP3');

-- CreateEnum
CREATE TYPE "public"."EmailMessageStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'QUARANTINED', 'IGNORED');

-- CreateEnum
CREATE TYPE "public"."AttachmentSecurityStatus" AS ENUM ('PENDING', 'SAFE', 'SUSPICIOUS', 'BLOCKED');

-- CreateEnum
CREATE TYPE "public"."EmailAuditEventType" AS ENUM ('INTEGRATION_CREATED', 'INTEGRATION_UPDATED', 'INTEGRATION_DELETED', 'INTEGRATION_ACTIVATED', 'INTEGRATION_DEACTIVATED', 'OAUTH_TOKEN_REFRESHED', 'OAUTH_TOKEN_EXPIRED', 'SYNC_STARTED', 'SYNC_COMPLETED', 'SYNC_FAILED', 'MESSAGE_RECEIVED', 'MESSAGE_PROCESSED', 'MESSAGE_QUARANTINED', 'MESSAGE_RELEASED', 'MESSAGE_DELETED', 'TICKET_CREATED', 'TICKET_UPDATED', 'ATTACHMENT_SCANNED', 'ATTACHMENT_BLOCKED', 'SECURITY_ALERT_GENERATED', 'CONFIGURATION_CHANGED', 'PERMISSION_GRANTED', 'PERMISSION_REVOKED', 'BULK_ACTION_PERFORMED', 'EXPORT_PERFORMED', 'BACKUP_CREATED', 'SYSTEM_ERROR');

-- CreateTable
CREATE TABLE "public"."AuthAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "AuthAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "password" TEXT,
    "preferences" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Account" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accountType" "public"."AccountType" NOT NULL DEFAULT 'INDIVIDUAL',
    "parentId" TEXT,
    "companyName" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "domains" TEXT,
    "customFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AccountMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RoleTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" TEXT[],
    "inheritAllPermissions" BOOLEAN NOT NULL DEFAULT false,
    "isSystemRole" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT NOT NULL DEFAULT 'account',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MembershipRole" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "MembershipRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SystemRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "SystemRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Ticket" (
    "id" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "customFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "accountId" TEXT NOT NULL,
    "creatorId" TEXT,
    "assigneeId" TEXT,
    "assignedAccountUserId" TEXT,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TimeEntry" (
    "id" TEXT NOT NULL,
    "description" TEXT,
    "minutes" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "noCharge" BOOLEAN NOT NULL DEFAULT false,
    "billingRateId" TEXT,
    "billingRateName" TEXT,
    "billingRateValue" DOUBLE PRECISION,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ticketId" TEXT,
    "accountId" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "TimeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TicketAddon" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "ticketId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketAddon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Invoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "total" DOUBLE PRECISION NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "accountId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InvoiceItem" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "timeEntryId" TEXT,
    "addonId" TEXT,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BillingRate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AccountBillingRate" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "billingRateId" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountBillingRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SystemSettings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "customFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AccountSettings" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "customFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Timer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pausedTime" INTEGER NOT NULL DEFAULT 0,
    "isRunning" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Timer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EmailTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."EmailTemplateType" NOT NULL,
    "subject" TEXT NOT NULL,
    "htmlBody" TEXT NOT NULL,
    "textBody" TEXT,
    "variables" TEXT NOT NULL DEFAULT '{}',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "status" "public"."EmailTemplateStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EmailQueue" (
    "id" TEXT NOT NULL,
    "templateId" TEXT,
    "fromEmail" TEXT NOT NULL,
    "fromName" TEXT,
    "toEmail" TEXT NOT NULL,
    "toName" TEXT,
    "ccEmails" TEXT,
    "bccEmails" TEXT,
    "subject" TEXT NOT NULL,
    "htmlBody" TEXT NOT NULL,
    "textBody" TEXT,
    "variables" TEXT NOT NULL DEFAULT '{}',
    "status" "public"."EmailQueueStatus" NOT NULL DEFAULT 'PENDING',
    "priority" INTEGER NOT NULL DEFAULT 5,
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "preferences" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."import_configurations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sourceType" "public"."ImportSourceType" NOT NULL,
    "connectionConfig" JSONB NOT NULL,
    "sourceTableConfig" JSONB NOT NULL,
    "isMultiStage" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "import_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."import_stages" (
    "id" TEXT NOT NULL,
    "configurationId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sourceTable" TEXT NOT NULL,
    "targetEntity" TEXT NOT NULL,
    "fieldMappings" JSONB NOT NULL,
    "fieldOverrides" JSONB NOT NULL,
    "dependsOnStages" TEXT[],
    "crossStageMapping" JSONB NOT NULL,
    "validationRules" JSONB NOT NULL,
    "transformRules" JSONB NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "import_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."import_executions" (
    "id" TEXT NOT NULL,
    "configurationId" TEXT NOT NULL,
    "status" "public"."ImportStatus" NOT NULL DEFAULT 'PENDING',
    "currentStage" INTEGER NOT NULL DEFAULT 1,
    "totalStages" INTEGER NOT NULL DEFAULT 1,
    "totalRecords" INTEGER NOT NULL DEFAULT 0,
    "processedRecords" INTEGER NOT NULL DEFAULT 0,
    "successfulRecords" INTEGER NOT NULL DEFAULT 0,
    "failedRecords" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB NOT NULL,
    "warnings" JSONB NOT NULL,
    "resultSummary" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "executedBy" TEXT NOT NULL,

    CONSTRAINT "import_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."import_stage_executions" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "status" "public"."ImportStatus" NOT NULL DEFAULT 'PENDING',
    "sourceTable" TEXT NOT NULL,
    "targetEntity" TEXT NOT NULL,
    "totalRecords" INTEGER NOT NULL DEFAULT 0,
    "processedRecords" INTEGER NOT NULL DEFAULT 0,
    "successfulRecords" INTEGER NOT NULL DEFAULT 0,
    "failedRecords" INTEGER NOT NULL DEFAULT 0,
    "skippedRecords" INTEGER NOT NULL DEFAULT 0,
    "createdEntityIds" JSONB NOT NULL,
    "errors" JSONB NOT NULL,
    "warnings" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "import_stage_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."import_execution_logs" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "level" "public"."LogLevel" NOT NULL,
    "message" TEXT NOT NULL,
    "details" JSONB,
    "recordIndex" INTEGER,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_execution_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EmailIntegration" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" "public"."EmailProvider" NOT NULL,
    "providerConfig" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "syncInterval" INTEGER NOT NULL DEFAULT 300,
    "processingRules" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."domain_mappings" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "domain_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EmailMessage" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "threadId" TEXT,
    "inReplyTo" TEXT,
    "ticketId" TEXT,
    "fromEmail" TEXT NOT NULL,
    "fromName" TEXT,
    "toEmail" TEXT NOT NULL,
    "toName" TEXT,
    "ccEmails" TEXT,
    "bccEmails" TEXT,
    "subject" TEXT NOT NULL,
    "textBody" TEXT,
    "htmlBody" TEXT,
    "headers" JSONB,
    "status" "public"."EmailMessageStatus" NOT NULL DEFAULT 'PENDING',
    "priority" INTEGER NOT NULL DEFAULT 5,
    "securityScore" DOUBLE PRECISION,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EmailAttachment" (
    "id" TEXT NOT NULL,
    "emailId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "contentId" TEXT,
    "content" BYTEA,
    "storagePath" TEXT,
    "securityStatus" "public"."AttachmentSecurityStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EmailProcessingLog" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "messageId" TEXT,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "details" JSONB,
    "errorMessage" TEXT,
    "processingTime" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailProcessingLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."email_audit_logs" (
    "id" TEXT NOT NULL,
    "eventType" "public"."EmailAuditEventType" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "previousValues" JSONB,
    "newValues" JSONB,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "accountId" TEXT,
    "integrationId" TEXT,
    "messageId" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "processingTime" INTEGER,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."email_access_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "accountId" TEXT,
    "integrationId" TEXT,
    "searchQuery" TEXT,
    "resultCount" INTEGER,
    "filters" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "sessionId" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "responseTime" INTEGER,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."email_security_logs" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT,
    "messageId" TEXT,
    "attachmentId" TEXT,
    "threatType" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "securityScore" DOUBLE PRECISION,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "scanEngine" TEXT,
    "scanResults" JSONB,
    "falsePositive" BOOLEAN NOT NULL DEFAULT false,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "notificationsSent" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_security_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuthAccount_provider_providerAccountId_key" ON "public"."AuthAccount"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "public"."Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "public"."VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "public"."VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "Account_parentId_idx" ON "public"."Account"("parentId");

-- CreateIndex
CREATE INDEX "Account_domains_idx" ON "public"."Account"("domains");

-- CreateIndex
CREATE INDEX "AccountMembership_userId_idx" ON "public"."AccountMembership"("userId");

-- CreateIndex
CREATE INDEX "AccountMembership_accountId_idx" ON "public"."AccountMembership"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountMembership_userId_accountId_key" ON "public"."AccountMembership"("userId", "accountId");

-- CreateIndex
CREATE UNIQUE INDEX "RoleTemplate_name_key" ON "public"."RoleTemplate"("name");

-- CreateIndex
CREATE INDEX "RoleTemplate_isSystemRole_idx" ON "public"."RoleTemplate"("isSystemRole");

-- CreateIndex
CREATE INDEX "RoleTemplate_inheritAllPermissions_idx" ON "public"."RoleTemplate"("inheritAllPermissions");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipRole_membershipId_roleId_key" ON "public"."MembershipRole"("membershipId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "SystemRole_userId_roleId_key" ON "public"."SystemRole"("userId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_ticketNumber_key" ON "public"."Ticket"("ticketNumber");

-- CreateIndex
CREATE INDEX "Ticket_accountId_idx" ON "public"."Ticket"("accountId");

-- CreateIndex
CREATE INDEX "Ticket_creatorId_idx" ON "public"."Ticket"("creatorId");

-- CreateIndex
CREATE INDEX "Ticket_assigneeId_idx" ON "public"."Ticket"("assigneeId");

-- CreateIndex
CREATE INDEX "Ticket_assignedAccountUserId_idx" ON "public"."Ticket"("assignedAccountUserId");

-- CreateIndex
CREATE INDEX "Ticket_status_idx" ON "public"."Ticket"("status");

-- CreateIndex
CREATE INDEX "TimeEntry_userId_idx" ON "public"."TimeEntry"("userId");

-- CreateIndex
CREATE INDEX "TimeEntry_ticketId_idx" ON "public"."TimeEntry"("ticketId");

-- CreateIndex
CREATE INDEX "TimeEntry_accountId_idx" ON "public"."TimeEntry"("accountId");

-- CreateIndex
CREATE INDEX "TimeEntry_date_idx" ON "public"."TimeEntry"("date");

-- CreateIndex
CREATE INDEX "TimeEntry_isApproved_idx" ON "public"."TimeEntry"("isApproved");

-- CreateIndex
CREATE INDEX "TicketAddon_ticketId_idx" ON "public"."TicketAddon"("ticketId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "public"."Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Invoice_accountId_idx" ON "public"."Invoice"("accountId");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "public"."Invoice"("status");

-- CreateIndex
CREATE INDEX "InvoiceItem_invoiceId_idx" ON "public"."InvoiceItem"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "BillingRate_name_key" ON "public"."BillingRate"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AccountBillingRate_accountId_billingRateId_key" ON "public"."AccountBillingRate"("accountId", "billingRateId");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSettings_key_key" ON "public"."SystemSettings"("key");

-- CreateIndex
CREATE UNIQUE INDEX "AccountSettings_accountId_key" ON "public"."AccountSettings"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "Timer_userId_ticketId_key" ON "public"."Timer"("userId", "ticketId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplate_name_key" ON "public"."EmailTemplate"("name");

-- CreateIndex
CREATE INDEX "EmailQueue_status_idx" ON "public"."EmailQueue"("status");

-- CreateIndex
CREATE INDEX "EmailQueue_scheduledAt_idx" ON "public"."EmailQueue"("scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreferences_userId_key" ON "public"."UserPreferences"("userId");

-- CreateIndex
CREATE INDEX "UserPreferences_userId_idx" ON "public"."UserPreferences"("userId");

-- CreateIndex
CREATE INDEX "import_configurations_createdBy_idx" ON "public"."import_configurations"("createdBy");

-- CreateIndex
CREATE INDEX "import_configurations_isMultiStage_idx" ON "public"."import_configurations"("isMultiStage");

-- CreateIndex
CREATE INDEX "import_stages_configurationId_idx" ON "public"."import_stages"("configurationId");

-- CreateIndex
CREATE INDEX "import_stages_order_idx" ON "public"."import_stages"("order");

-- CreateIndex
CREATE INDEX "import_stages_targetEntity_idx" ON "public"."import_stages"("targetEntity");

-- CreateIndex
CREATE INDEX "import_executions_configurationId_idx" ON "public"."import_executions"("configurationId");

-- CreateIndex
CREATE INDEX "import_executions_executedBy_idx" ON "public"."import_executions"("executedBy");

-- CreateIndex
CREATE INDEX "import_executions_status_idx" ON "public"."import_executions"("status");

-- CreateIndex
CREATE INDEX "import_stage_executions_executionId_idx" ON "public"."import_stage_executions"("executionId");

-- CreateIndex
CREATE INDEX "import_stage_executions_stageId_idx" ON "public"."import_stage_executions"("stageId");

-- CreateIndex
CREATE INDEX "import_stage_executions_status_idx" ON "public"."import_stage_executions"("status");

-- CreateIndex
CREATE INDEX "import_stage_executions_order_idx" ON "public"."import_stage_executions"("order");

-- CreateIndex
CREATE INDEX "import_execution_logs_executionId_idx" ON "public"."import_execution_logs"("executionId");

-- CreateIndex
CREATE INDEX "import_execution_logs_level_idx" ON "public"."import_execution_logs"("level");

-- CreateIndex
CREATE INDEX "EmailIntegration_provider_idx" ON "public"."EmailIntegration"("provider");

-- CreateIndex
CREATE INDEX "EmailIntegration_isActive_idx" ON "public"."EmailIntegration"("isActive");

-- CreateIndex
CREATE INDEX "EmailIntegration_name_idx" ON "public"."EmailIntegration"("name");

-- CreateIndex
CREATE UNIQUE INDEX "domain_mappings_domain_key" ON "public"."domain_mappings"("domain");

-- CreateIndex
CREATE INDEX "domain_mappings_domain_idx" ON "public"."domain_mappings"("domain");

-- CreateIndex
CREATE INDEX "domain_mappings_accountId_idx" ON "public"."domain_mappings"("accountId");

-- CreateIndex
CREATE INDEX "domain_mappings_priority_idx" ON "public"."domain_mappings"("priority");

-- CreateIndex
CREATE INDEX "domain_mappings_isActive_idx" ON "public"."domain_mappings"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "EmailMessage_messageId_key" ON "public"."EmailMessage"("messageId");

-- CreateIndex
CREATE INDEX "EmailMessage_messageId_idx" ON "public"."EmailMessage"("messageId");

-- CreateIndex
CREATE INDEX "EmailMessage_threadId_idx" ON "public"."EmailMessage"("threadId");

-- CreateIndex
CREATE INDEX "EmailMessage_ticketId_idx" ON "public"."EmailMessage"("ticketId");

-- CreateIndex
CREATE INDEX "EmailMessage_integrationId_idx" ON "public"."EmailMessage"("integrationId");

-- CreateIndex
CREATE INDEX "EmailMessage_fromEmail_idx" ON "public"."EmailMessage"("fromEmail");

-- CreateIndex
CREATE INDEX "EmailMessage_status_idx" ON "public"."EmailMessage"("status");

-- CreateIndex
CREATE INDEX "EmailMessage_createdAt_idx" ON "public"."EmailMessage"("createdAt");

-- CreateIndex
CREATE INDEX "EmailAttachment_emailId_idx" ON "public"."EmailAttachment"("emailId");

-- CreateIndex
CREATE INDEX "EmailAttachment_securityStatus_idx" ON "public"."EmailAttachment"("securityStatus");

-- CreateIndex
CREATE INDEX "EmailProcessingLog_integrationId_idx" ON "public"."EmailProcessingLog"("integrationId");

-- CreateIndex
CREATE INDEX "EmailProcessingLog_messageId_idx" ON "public"."EmailProcessingLog"("messageId");

-- CreateIndex
CREATE INDEX "EmailProcessingLog_action_idx" ON "public"."EmailProcessingLog"("action");

-- CreateIndex
CREATE INDEX "EmailProcessingLog_status_idx" ON "public"."EmailProcessingLog"("status");

-- CreateIndex
CREATE INDEX "EmailProcessingLog_createdAt_idx" ON "public"."EmailProcessingLog"("createdAt");

-- CreateIndex
CREATE INDEX "email_audit_logs_eventType_idx" ON "public"."email_audit_logs"("eventType");

-- CreateIndex
CREATE INDEX "email_audit_logs_entityType_idx" ON "public"."email_audit_logs"("entityType");

-- CreateIndex
CREATE INDEX "email_audit_logs_entityId_idx" ON "public"."email_audit_logs"("entityId");

-- CreateIndex
CREATE INDEX "email_audit_logs_userId_idx" ON "public"."email_audit_logs"("userId");

-- CreateIndex
CREATE INDEX "email_audit_logs_accountId_idx" ON "public"."email_audit_logs"("accountId");

-- CreateIndex
CREATE INDEX "email_audit_logs_integrationId_idx" ON "public"."email_audit_logs"("integrationId");

-- CreateIndex
CREATE INDEX "email_audit_logs_messageId_idx" ON "public"."email_audit_logs"("messageId");

-- CreateIndex
CREATE INDEX "email_audit_logs_timestamp_idx" ON "public"."email_audit_logs"("timestamp");

-- CreateIndex
CREATE INDEX "email_audit_logs_success_idx" ON "public"."email_audit_logs"("success");

-- CreateIndex
CREATE INDEX "email_access_logs_userId_idx" ON "public"."email_access_logs"("userId");

-- CreateIndex
CREATE INDEX "email_access_logs_action_idx" ON "public"."email_access_logs"("action");

-- CreateIndex
CREATE INDEX "email_access_logs_resourceType_idx" ON "public"."email_access_logs"("resourceType");

-- CreateIndex
CREATE INDEX "email_access_logs_resourceId_idx" ON "public"."email_access_logs"("resourceId");

-- CreateIndex
CREATE INDEX "email_access_logs_accountId_idx" ON "public"."email_access_logs"("accountId");

-- CreateIndex
CREATE INDEX "email_access_logs_integrationId_idx" ON "public"."email_access_logs"("integrationId");

-- CreateIndex
CREATE INDEX "email_access_logs_timestamp_idx" ON "public"."email_access_logs"("timestamp");

-- CreateIndex
CREATE INDEX "email_access_logs_success_idx" ON "public"."email_access_logs"("success");

-- CreateIndex
CREATE INDEX "email_security_logs_integrationId_idx" ON "public"."email_security_logs"("integrationId");

-- CreateIndex
CREATE INDEX "email_security_logs_messageId_idx" ON "public"."email_security_logs"("messageId");

-- CreateIndex
CREATE INDEX "email_security_logs_attachmentId_idx" ON "public"."email_security_logs"("attachmentId");

-- CreateIndex
CREATE INDEX "email_security_logs_threatType_idx" ON "public"."email_security_logs"("threatType");

-- CreateIndex
CREATE INDEX "email_security_logs_riskLevel_idx" ON "public"."email_security_logs"("riskLevel");

-- CreateIndex
CREATE INDEX "email_security_logs_action_idx" ON "public"."email_security_logs"("action");

-- CreateIndex
CREATE INDEX "email_security_logs_timestamp_idx" ON "public"."email_security_logs"("timestamp");

-- CreateIndex
CREATE INDEX "email_security_logs_falsePositive_idx" ON "public"."email_security_logs"("falsePositive");

-- AddForeignKey
ALTER TABLE "public"."AuthAccount" ADD CONSTRAINT "AuthAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Account" ADD CONSTRAINT "Account_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AccountMembership" ADD CONSTRAINT "AccountMembership_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AccountMembership" ADD CONSTRAINT "AccountMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MembershipRole" ADD CONSTRAINT "MembershipRole_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "public"."AccountMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MembershipRole" ADD CONSTRAINT "MembershipRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."RoleTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SystemRole" ADD CONSTRAINT "SystemRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."RoleTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SystemRole" ADD CONSTRAINT "SystemRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Ticket" ADD CONSTRAINT "Ticket_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Ticket" ADD CONSTRAINT "Ticket_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Ticket" ADD CONSTRAINT "Ticket_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Ticket" ADD CONSTRAINT "Ticket_assignedAccountUserId_fkey" FOREIGN KEY ("assignedAccountUserId") REFERENCES "public"."AccountMembership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TimeEntry" ADD CONSTRAINT "TimeEntry_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TimeEntry" ADD CONSTRAINT "TimeEntry_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TimeEntry" ADD CONSTRAINT "TimeEntry_billingRateId_fkey" FOREIGN KEY ("billingRateId") REFERENCES "public"."BillingRate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TimeEntry" ADD CONSTRAINT "TimeEntry_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TimeEntry" ADD CONSTRAINT "TimeEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TicketAddon" ADD CONSTRAINT "TicketAddon_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invoice" ADD CONSTRAINT "Invoice_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invoice" ADD CONSTRAINT "Invoice_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InvoiceItem" ADD CONSTRAINT "InvoiceItem_addonId_fkey" FOREIGN KEY ("addonId") REFERENCES "public"."TicketAddon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InvoiceItem" ADD CONSTRAINT "InvoiceItem_timeEntryId_fkey" FOREIGN KEY ("timeEntryId") REFERENCES "public"."TimeEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AccountBillingRate" ADD CONSTRAINT "AccountBillingRate_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AccountBillingRate" ADD CONSTRAINT "AccountBillingRate_billingRateId_fkey" FOREIGN KEY ("billingRateId") REFERENCES "public"."BillingRate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AccountSettings" ADD CONSTRAINT "AccountSettings_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Timer" ADD CONSTRAINT "Timer_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Timer" ADD CONSTRAINT "Timer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmailTemplate" ADD CONSTRAINT "EmailTemplate_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmailTemplate" ADD CONSTRAINT "EmailTemplate_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmailQueue" ADD CONSTRAINT "EmailQueue_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmailQueue" ADD CONSTRAINT "EmailQueue_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."EmailTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."import_stages" ADD CONSTRAINT "import_stages_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "public"."import_configurations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."import_executions" ADD CONSTRAINT "import_executions_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "public"."import_configurations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."import_stage_executions" ADD CONSTRAINT "import_stage_executions_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "public"."import_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."import_stage_executions" ADD CONSTRAINT "import_stage_executions_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "public"."import_stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."import_execution_logs" ADD CONSTRAINT "import_execution_logs_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "public"."import_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."domain_mappings" ADD CONSTRAINT "domain_mappings_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmailMessage" ADD CONSTRAINT "EmailMessage_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "public"."EmailIntegration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmailMessage" ADD CONSTRAINT "EmailMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmailMessage" ADD CONSTRAINT "EmailMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "public"."EmailMessage"("messageId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmailAttachment" ADD CONSTRAINT "EmailAttachment_emailId_fkey" FOREIGN KEY ("emailId") REFERENCES "public"."EmailMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
