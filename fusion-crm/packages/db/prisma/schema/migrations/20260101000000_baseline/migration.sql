-- Extensión requerida por los embeddings (KnowledgeChunk y otros: vector(768))
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('NIT', 'CC', 'CE', 'PASSPORT', 'NONE');

-- CreateEnum
CREATE TYPE "ClientType" AS ENUM ('PROSPECT', 'ACTIVE', 'INACTIVE', 'LOST');

-- CreateEnum
CREATE TYPE "ClientSource" AS ENUM ('REFERRAL', 'WEB', 'DIRECTORY', 'DRIVE_IMPORT', 'KIOSK', 'CAMPAIGN', 'ODOO', 'MANUAL', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentTerms" AS ENUM ('CASH', 'DAYS_15', 'DAYS_30', 'DAYS_60', 'DAYS_90');

-- CreateEnum
CREATE TYPE "ClientTemperature" AS ENUM ('COLD', 'WARM', 'HOT');

-- CreateEnum
CREATE TYPE "FileCategory" AS ENUM ('CONTRACT', 'RUT', 'CHAMBER', 'ART', 'OTHER');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'VIEWED', 'NEGOTIATING', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "QuoteSource" AS ENUM ('MANUAL', 'PDF_IMPORT', 'DRIVE_SYNC', 'KIOSK', 'ODOO', 'DUPLICATE');

-- CreateEnum
CREATE TYPE "ProductionMode" AS ENUM ('IN_HOUSE', 'OUTSOURCED', 'AGENCY');

-- CreateEnum
CREATE TYPE "QuoteApprovedVia" AS ENUM ('PORTAL', 'WHATSAPP', 'EMAIL', 'PHONE', 'MANUAL');

-- CreateEnum
CREATE TYPE "QuoteHistoryAction" AS ENUM ('CREATED', 'UPDATED', 'STATUS_CHANGED', 'REVISION_CREATED', 'SENT', 'VIEWED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "StageType" AS ENUM ('OPEN', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "LostReasonCategory" AS ENUM ('PRICE', 'TIMING', 'COMPETITOR', 'NO_BUDGET', 'NO_RESPONSE', 'QUALITY', 'OTHER');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('CALL', 'EMAIL', 'WHATSAPP', 'MEETING', 'NOTE', 'TASK', 'QUOTE_SENT', 'VISIT');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('FOLLOW_UP', 'CALL', 'QUOTE', 'VISIT', 'DELIVERY', 'INTERNAL', 'OTHER');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('MEETING', 'CALL', 'VISIT', 'FOLLOW_UP', 'INTERNAL');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'HELD', 'NO_SHOW', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AttendeeResponseStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'TENTATIVE');

-- CreateEnum
CREATE TYPE "VeaScope" AS ENUM ('COMMERCIAL', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "VeaContributionCategory" AS ENUM ('IDEA', 'ISSUE', 'WIN', 'BLOCKER');

-- CreateEnum
CREATE TYPE "PrintOrderStatus" AS ENUM ('NEW', 'AWAITING_ARTWORK', 'IN_PROCESS', 'IN_PRODUCTION', 'READY', 'DELIVERED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PrintOrderChannel" AS ENUM ('KIOSK', 'WEB', 'STORE', 'PHONE');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'TRANSFER', 'CARD', 'CREDIT');

-- CreateEnum
CREATE TYPE "ArtworkStatus" AS ENUM ('PENDING', 'RECEIVED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('LITHOGRAPHY', 'DIGITAL', 'DTF_UV', 'LARGE_FORMAT', 'EDITORIAL', 'PACKAGING', 'MERCHANDISING', 'OUTSOURCED', 'PRINT_ON_DEMAND');

-- CreateEnum
CREATE TYPE "ProjectPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "QualityResult" AS ENUM ('APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MachineType" AS ENUM ('OFFSET', 'DIGITAL', 'LARGE_FORMAT', 'CUTTER', 'FOLDER', 'LAMINATOR', 'DIE_CUTTER', 'BINDER', 'DTF', 'OTHER');

-- CreateEnum
CREATE TYPE "MachineStatus" AS ENUM ('AVAILABLE', 'RUNNING', 'MAINTENANCE', 'BREAKDOWN', 'RETIRED');

-- CreateEnum
CREATE TYPE "ProcessCategory" AS ENUM ('PREPRESS', 'PRINTING', 'FINISHING', 'LOGISTICS');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('PERMANENT', 'TEMPORARY', 'FREELANCE', 'APPRENTICE');

-- CreateEnum
CREATE TYPE "MaintenanceType" AS ENUM ('PREVENTIVE', 'CORRECTIVE');

-- CreateEnum
CREATE TYPE "KioskHelpType" AS ENUM ('MATERIAL', 'MACHINE', 'QUALITY', 'SUPERVISOR', 'OTHER');

-- CreateEnum
CREATE TYPE "KioskHelpStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "ChannelType" AS ENUM ('EMAIL', 'WHATSAPP', 'WEBCHAT', 'INSTAGRAM', 'MESSENGER', 'SMS', 'VOICE');

-- CreateEnum
CREATE TYPE "CallDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "CallStatus" AS ENUM ('RINGING', 'ANSWERED', 'MISSED', 'VOICEMAIL', 'FAILED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "RingStrategy" AS ENUM ('ALL_AT_ONCE', 'ROUND_ROBIN', 'LONGEST_IDLE');

-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('DRAFT', 'ORDERED', 'PARTIAL', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('PURCHASE_IN', 'PRODUCTION_OUT', 'TRANSFORMATION_IN', 'TRANSFORMATION_OUT', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'DAMAGE_OUT', 'RETURN_IN', 'RESERVATION', 'RELEASE');

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('PAPER', 'SUPPLY');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('ACTIVE', 'CONSUMED', 'RELEASED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DamageCause" AS ENUM ('MACHINE', 'MATERIAL', 'HUMAN', 'DESIGN', 'CLIENT_CHANGE', 'OTHER');

-- CreateEnum
CREATE TYPE "InventoryAlertType" AS ENUM ('LOW_STOCK', 'OUT_OF_STOCK', 'EXPIRING', 'OVERSTOCK', 'NEGATIVE_BALANCE');

-- CreateEnum
CREATE TYPE "InventoryCountStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OvertimeType" AS ENUM ('DAY', 'NIGHT', 'HOLIDAY', 'NIGHT_HOLIDAY');

-- CreateEnum
CREATE TYPE "OvertimeStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PAID');

-- CreateEnum
CREATE TYPE "DeliveryType" AS ENUM ('MESSENGER', 'FREIGHT', 'COURIER', 'OWN_VEHICLE');

-- CreateEnum
CREATE TYPE "SupplyCategory" AS ENUM ('INK', 'PLATE', 'CHEMICAL', 'BLANKET', 'SPARE_PART', 'PACKAGING', 'OFFICE', 'OTHER');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'PENDING', 'SNOOZED', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "HandoffReason" AS ENUM ('CUSTOMER_REQUEST', 'LOW_CONFIDENCE', 'COMPLEX_QUERY', 'ESCALATION', 'PRICING', 'COMPLAINT');

-- CreateEnum
CREATE TYPE "HandoffType" AS ENUM ('AI', 'HUMAN');

-- CreateEnum
CREATE TYPE "SequenceTriggerType" AS ENUM ('MANUAL', 'EVENT', 'SEGMENT');

-- CreateEnum
CREATE TYPE "SequenceDelayUnit" AS ENUM ('MINUTES', 'HOURS', 'DAYS', 'BUSINESS_DAYS');

-- CreateEnum
CREATE TYPE "SequenceEnrollmentStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'EXITED', 'FAILED');

-- CreateEnum
CREATE TYPE "SurveyType" AS ENUM ('CSAT', 'NPS', 'CES');

-- CreateEnum
CREATE TYPE "KnowledgeAudience" AS ENUM ('INTERNAL', 'CUSTOMER', 'BOTH');

-- CreateEnum
CREATE TYPE "KnowledgeStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ConversationIntent" AS ENUM ('NEW_QUOTE', 'ORDER_STATUS', 'COMPLAINT', 'BILLING', 'GENERAL_INFO', 'OTHER');

-- CreateEnum
CREATE TYPE "ConversationUrgency" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ConversationSentiment" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE', 'VERY_NEGATIVE');

-- CreateEnum
CREATE TYPE "TariffStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SheetFormat" AS ENUM ('S70X100', 'S60X90');

-- CreateEnum
CREATE TYPE "PrintTechnique" AS ENUM ('LITHO', 'DIGITAL');

-- CreateEnum
CREATE TYPE "FinishingService" AS ENUM ('CUT', 'TRIM', 'PERFORATION', 'BINDING', 'LAMINATION', 'HALF_CUT', 'DIE_CUT', 'OTHER');

-- CreateEnum
CREATE TYPE "FinishingMode" AS ENUM ('NONE', 'PER_RUN', 'MINIMUM', 'PER_THOUSAND', 'PER_UNIT', 'PER_M2', 'PER_LINEAR_CM', 'PER_CM2', 'PER_LOOP');

-- CreateEnum
CREATE TYPE "TariffScope" AS ENUM ('DIGITAL', 'LITHO', 'BOTH');

-- CreateEnum
CREATE TYPE "CommercialTermType" AS ENUM ('DELIVERY_TIME', 'PAYMENT_TERM', 'VALIDITY', 'VAT', 'CLIENT_DISCOUNT', 'DESIGN_OWNER');

-- CreateEnum
CREATE TYPE "AssistMode" AS ENUM ('GUIDED', 'MANUAL_LITHO', 'WIDE_FORMAT', 'ON_DEMAND');

-- CreateEnum
CREATE TYPE "DashboardLayoutScope" AS ENUM ('ROLE', 'USER');

-- CreateEnum
CREATE TYPE "DashboardLayoutWidgetSize" AS ENUM ('SMALL', 'MEDIUM', 'LARGE', 'FULL');

-- CreateEnum
CREATE TYPE "HomeDensity" AS ENUM ('COMFORTABLE', 'COMPACT');

-- CreateEnum
CREATE TYPE "PinnedEntityType" AS ENUM ('CLIENT', 'OPPORTUNITY', 'QUOTE', 'PRODUCTION_PROJECT', 'TASK', 'CHAT_CHANNEL', 'ANNOUNCEMENT', 'REPORT');

-- CreateEnum
CREATE TYPE "GoalScope" AS ENUM ('ORGANIZATION', 'AREA', 'TEAM', 'USER', 'MACHINE');

-- CreateEnum
CREATE TYPE "GoalPeriod" AS ENUM ('WEEK', 'MONTH', 'QUARTER', 'YEAR');

-- CreateEnum
CREATE TYPE "GoalDirection" AS ENUM ('HIGHER_IS_BETTER', 'LOWER_IS_BETTER');

-- CreateEnum
CREATE TYPE "GoalPaceStatus" AS ENUM ('AHEAD', 'ON_TRACK', 'AT_RISK', 'BEHIND');

-- CreateEnum
CREATE TYPE "CapacitySubjectType" AS ENUM ('EMPLOYEE', 'MACHINE', 'AREA');

-- CreateEnum
CREATE TYPE "EmployeeAbsenceType" AS ENUM ('VACATION', 'SICK_LEAVE', 'PERMIT', 'HOLIDAY', 'TRAINING', 'OTHER');

-- CreateEnum
CREATE TYPE "AnnouncementType" AS ENUM ('ANNOUNCEMENT', 'DIRECTIVE', 'RECOGNITION', 'ALERT', 'EVENT', 'POLICY');

-- CreateEnum
CREATE TYPE "AnnouncementPriority" AS ENUM ('NORMAL', 'IMPORTANT', 'URGENT');

-- CreateEnum
CREATE TYPE "AnnouncementStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AnnouncementTargetType" AS ENUM ('EVERYONE', 'ROLE', 'AREA', 'TEAM', 'USER');

-- CreateEnum
CREATE TYPE "ChatChannelType" AS ENUM ('PUBLIC', 'PRIVATE', 'DIRECT', 'GROUP', 'ENTITY');

-- CreateEnum
CREATE TYPE "ChatEntityType" AS ENUM ('CLIENT', 'OPPORTUNITY', 'QUOTE', 'PRODUCTION_PROJECT', 'PRINT_ORDER', 'VEA_MEETING');

-- CreateEnum
CREATE TYPE "ChatMemberRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "ChatNotificationLevel" AS ENUM ('ALL', 'MENTIONS', 'NONE');

-- CreateEnum
CREATE TYPE "ChatMessageType" AS ENUM ('TEXT', 'FILE', 'IMAGE', 'SYSTEM', 'CALL_SUMMARY', 'ENTITY_LINK');

-- CreateEnum
CREATE TYPE "CallSessionType" AS ENUM ('DIRECT', 'GROUP', 'CHANNEL', 'MEETING');

-- CreateEnum
CREATE TYPE "CallSessionStatus" AS ENUM ('RINGING', 'ONGOING', 'ENDED', 'MISSED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "CallParticipantRole" AS ENUM ('HOST', 'PARTICIPANT', 'VIEWER');

-- CreateEnum
CREATE TYPE "CallQuality" AS ENUM ('GOOD', 'FAIR', 'POOR', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "CallInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'MISSED');

-- CreateEnum
CREATE TYPE "PresenceStatus" AS ENUM ('ONLINE', 'AWAY', 'BUSY', 'IN_CALL', 'DO_NOT_DISTURB', 'OFFLINE');

-- CreateEnum
CREATE TYPE "PresenceDevice" AS ENUM ('WEB', 'MOBILE', 'KIOSK');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'CANCELLED');

-- CreateEnum
CREATE TYPE "IdentityVerificationMethod" AS ENUM ('INBOUND_REPLY', 'OTP', 'MANUAL', 'IMPORT');

-- CreateEnum
CREATE TYPE "IdentityStatus" AS ENUM ('LINKED', 'UNLINKED', 'IGNORED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "IdentityLinkAction" AS ENUM ('LINKED', 'UNLINKED', 'RELINKED', 'MERGED');

-- CreateEnum
CREATE TYPE "IdentityLinkMethod" AS ENUM ('AUTO', 'MANUAL', 'MERGE_CASCADE');

-- CreateEnum
CREATE TYPE "VoiceExtensionType" AS ENUM ('USER', 'DESK', 'VIRTUAL', 'EXTERNAL_MEDIA');

-- CreateEnum
CREATE TYPE "VoiceExtensionStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "VoiceRingStrategy" AS ENUM ('BROWSER_ONLY', 'BROWSER_THEN_MOBILE', 'BROWSER_AND_MOBILE', 'MOBILE_ONLY');

-- CreateEnum
CREATE TYPE "VoiceRecordingPolicy" AS ENUM ('ALWAYS', 'NEVER', 'INBOUND_ONLY', 'OUTBOUND_ONLY');

-- CreateEnum
CREATE TYPE "VoiceTransport" AS ENUM ('UDP', 'TCP', 'TLS');

-- CreateEnum
CREATE TYPE "VoiceTrunkAuth" AS ENUM ('REGISTER', 'IP_AUTH');

-- CreateEnum
CREATE TYPE "VoiceTrunkStatus" AS ENUM ('UNKNOWN', 'REGISTERED', 'UNREGISTERED', 'FAILED');

-- CreateEnum
CREATE TYPE "VoiceNumberDirection" AS ENUM ('INBOUND', 'OUTBOUND', 'BOTH');

-- CreateEnum
CREATE TYPE "VoiceNumberTarget" AS ENUM ('IVR_FLOW', 'QUEUE', 'EXTENSION', 'AI_AGENT', 'VOICEMAIL');

-- CreateEnum
CREATE TYPE "VoicePortingStatus" AS ENUM ('NOT_APPLICABLE', 'REQUESTED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "VoiceCallDirection" AS ENUM ('INBOUND', 'OUTBOUND', 'INTERNAL');

-- CreateEnum
CREATE TYPE "VoiceCallStatus" AS ENUM ('RINGING', 'IN_IVR', 'IN_QUEUE', 'IN_AI', 'CONNECTED', 'ON_HOLD', 'TRANSFERRING', 'VOICEMAIL', 'COMPLETED', 'ABANDONED', 'FAILED', 'REJECTED', 'NO_ANSWER', 'BUSY');

-- CreateEnum
CREATE TYPE "VoiceDisposition" AS ENUM ('ANSWERED', 'MISSED', 'ABANDONED_IN_QUEUE', 'VOICEMAIL_LEFT', 'HANDLED_BY_AI', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VoiceHangupBy" AS ENUM ('CALLER', 'AGENT', 'SYSTEM', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "VoiceCallEventType" AS ENUM ('CREATED', 'RINGING', 'ANSWERED', 'IVR_ENTERED', 'IVR_OPTION', 'QUEUE_ENTERED', 'QUEUE_ANNOUNCE', 'AGENT_RINGING', 'AGENT_ANSWERED', 'AGENT_NO_ANSWER', 'BRIDGED', 'HOLD', 'UNHOLD', 'TRANSFER_BLIND', 'TRANSFER_ATTENDED', 'AI_STARTED', 'AI_INTENT', 'AI_HANDOFF', 'RECORDING_STARTED', 'RECORDING_STOPPED', 'DTMF', 'VOICEMAIL_STARTED', 'HANGUP', 'ERROR');

-- CreateEnum
CREATE TYPE "VoiceQueueStrategy" AS ENUM ('RINGALL', 'ROUND_ROBIN', 'LEAST_RECENT', 'FEWEST_CALLS', 'LONGEST_IDLE', 'SKILL_BASED');

-- CreateEnum
CREATE TYPE "VoiceQueueOverflow" AS ENUM ('VOICEMAIL', 'ANOTHER_QUEUE', 'EXTERNAL_NUMBER', 'AI_AGENT', 'HANGUP_WITH_MESSAGE');

-- CreateEnum
CREATE TYPE "VoiceAgentState" AS ENUM ('AVAILABLE', 'ON_CALL', 'WRAP_UP', 'BREAK', 'OFFLINE');

-- CreateEnum
CREATE TYPE "VoicePromptCategory" AS ENUM ('GREETING', 'MENU', 'QUEUE', 'VOICEMAIL', 'ANNOUNCEMENT', 'ERROR', 'CLOSED', 'LEGAL');

-- CreateEnum
CREATE TYPE "VoicePromptSource" AS ENUM ('RECORDED_BROWSER', 'RECORDED_PHONE', 'UPLOADED', 'TTS');

-- CreateEnum
CREATE TYPE "VoiceFlowStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "VoiceRecordingChannels" AS ENUM ('MONO_MIXED', 'DUAL_STEREO');

-- CreateEnum
CREATE TYPE "VoiceSentiment" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE', 'MIXED');

-- CreateEnum
CREATE TYPE "VoiceTranscriptStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "VoiceAiOutcome" AS ENUM ('RESOLVED', 'TRANSFERRED', 'ABANDONED', 'FAILED', 'ESCALATED_BY_RULE');

-- CreateEnum
CREATE TYPE "VoiceCampaignMode" AS ENUM ('PREVIEW', 'PROGRESSIVE');

-- CreateEnum
CREATE TYPE "VoiceCampaignStatus" AS ENUM ('DRAFT', 'RUNNING', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VoiceCampaignContactStatus" AS ENUM ('PENDING', 'CALLING', 'ANSWERED', 'NO_ANSWER', 'BUSY', 'FAILED', 'DO_NOT_CALL', 'COMPLETED', 'EXCLUDED_BY_LAW');

-- CreateEnum
CREATE TYPE "VoiceDncReason" AS ENUM ('CUSTOMER_REQUEST', 'LEGAL', 'INVALID_NUMBER', 'COMPLAINT');

-- CreateEnum
CREATE TYPE "VoiceVoicemailStatus" AS ENUM ('NEW', 'HEARD', 'RETURNED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ConsentPurpose" AS ENUM ('TRANSACTIONAL', 'MARKETING', 'SURVEY', 'PRODUCTION_UPDATE');

-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('GRANTED', 'DENIED', 'WITHDRAWN', 'PENDING');

-- CreateEnum
CREATE TYPE "ConsentSource" AS ENUM ('FORM', 'INBOUND_MESSAGE', 'VERBAL', 'CONTRACT', 'IMPORT', 'PORTAL');

-- CreateEnum
CREATE TYPE "ConsentChannelType" AS ENUM ('EMAIL', 'WHATSAPP', 'SMS', 'VOICE', 'ALL');

-- CreateEnum
CREATE TYPE "DSRType" AS ENUM ('ACCESS', 'RECTIFICATION', 'DELETION', 'REVOCATION', 'COMPLAINT');

-- CreateEnum
CREATE TYPE "DSRStatus" AS ENUM ('RECEIVED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RetentionAction" AS ENUM ('ANONYMIZE', 'DELETE', 'ARCHIVE');

-- CreateEnum
CREATE TYPE "RoutingStrategy" AS ENUM ('ROUND_ROBIN', 'LEAST_BUSY', 'SKILL_BASED', 'ACCOUNT_OWNER', 'STICKY_LAST_AGENT');

-- CreateEnum
CREATE TYPE "HolidayCalendar" AS ENUM ('COLOMBIA', 'NONE');

-- CreateEnum
CREATE TYPE "EscalationTrigger" AS ENUM ('SLA_BREACH', 'SLA_AT_RISK', 'NO_RESPONSE', 'NEGATIVE_SENTIMENT', 'VIP_CLIENT');

-- CreateEnum
CREATE TYPE "SettingDomain" AS ENUM ('ORGANIZATION', 'COMMERCIAL', 'QUOTING', 'PRODUCTION', 'INVENTORY', 'FINANCE', 'COMMUNICATION', 'AI', 'INTEGRATION', 'SECURITY', 'SYSTEM');

-- CreateEnum
CREATE TYPE "SettingValueType" AS ENUM ('STRING', 'NUMBER', 'DECIMAL', 'BOOLEAN', 'ENUM', 'JSON', 'DURATION', 'PERCENTAGE', 'MONEY', 'COLOR', 'EMAIL', 'URL', 'TIME', 'DATE');

-- CreateEnum
CREATE TYPE "SettingDangerLevel" AS ENUM ('SAFE', 'CAUTION', 'DANGEROUS');

-- CreateEnum
CREATE TYPE "FeatureFlagStatus" AS ENUM ('OFF', 'ON', 'ROLLOUT', 'INTERNAL_ONLY');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "CalendarExceptionType" AS ENUM ('HOLIDAY', 'COMPANY_HOLIDAY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "TemplateType" AS ENUM ('QUOTE_PDF', 'EMAIL', 'WHATSAPP', 'SYSTEM_PROMPT');

-- CreateEnum
CREATE TYPE "AgentType" AS ENUM ('CONVERSATIONAL', 'ANALYST', 'PLANNER', 'MONITOR', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "AgentDomain" AS ENUM ('COMMERCIAL', 'QUOTING', 'PRODUCTION', 'CAPACITY', 'INVENTORY', 'FINANCE', 'SERVICE', 'DATA', 'MANAGEMENT');

-- CreateEnum
CREATE TYPE "ModelPreference" AS ENUM ('FAST', 'REASONING', 'AUTO');

-- CreateEnum
CREATE TYPE "AgentRunTrigger" AS ENUM ('USER_MESSAGE', 'EVENT', 'SCHEDULE', 'ANOTHER_AGENT', 'MANUAL');

-- CreateEnum
CREATE TYPE "AgentRunStatus" AS ENUM ('SUCCESS', 'PARTIAL', 'FAILED', 'REFUSED', 'ESCALATED', 'BUDGET_BLOCKED');

-- CreateEnum
CREATE TYPE "AgentRunFeedback" AS ENUM ('NONE', 'POSITIVE', 'NEGATIVE');

-- CreateEnum
CREATE TYPE "AgentMemoryScope" AS ENUM ('GLOBAL', 'CLIENT', 'PROJECT', 'USER', 'MACHINE', 'SUPPLIER');

-- CreateEnum
CREATE TYPE "AgentMemorySource" AS ENUM ('STATED', 'DERIVED_APPROVED');

-- CreateEnum
CREATE TYPE "AgentTaskType" AS ENUM ('RECOMMENDATION', 'ALERT', 'DRAFT', 'PLAN', 'PURCHASE_PROPOSAL', 'RESCHEDULE_PROPOSAL');

-- CreateEnum
CREATE TYPE "AgentTaskStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'EXECUTED');

-- CreateEnum
CREATE TYPE "EvalSeverity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "EvalSource" AS ENUM ('MANUAL', 'FROM_NEGATIVE_FEEDBACK', 'FROM_INCIDENT');

-- CreateEnum
CREATE TYPE "GoodDirection" AS ENUM ('UP', 'DOWN');

-- CreateEnum
CREATE TYPE "ContextSourceType" AS ENUM ('KNOWLEDGE_ARTICLE', 'DOCUMENT', 'DRIVE_FOLDER', 'WEBSITE', 'DATABASE_VIEW', 'HISTORICAL_DATA', 'SPREADSHEET');

-- CreateEnum
CREATE TYPE "SyncMode" AS ENUM ('MANUAL', 'SCHEDULED', 'ON_EVENT');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "lastLoginAt" TIMESTAMP(3),
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "roleId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "documentType" "DocumentType" NOT NULL DEFAULT 'NONE',
    "documentNumber" TEXT,
    "documentDv" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "mobile" TEXT,
    "website" TEXT,
    "address" TEXT,
    "city" TEXT,
    "department" TEXT,
    "country" TEXT NOT NULL DEFAULT 'CO',
    "sector" TEXT,
    "clientType" "ClientType" NOT NULL DEFAULT 'PROSPECT',
    "source" "ClientSource" NOT NULL DEFAULT 'MANUAL',
    "paymentTerms" "PaymentTerms" NOT NULL DEFAULT 'CASH',
    "creditLimit" DECIMAL(15,2),
    "taxRegime" TEXT,
    "notes" TEXT,
    "temperature" "ClientTemperature" NOT NULL DEFAULT 'COLD',
    "temperatureScore" INTEGER NOT NULL DEFAULT 0,
    "temperatureUpdatedAt" TIMESTAMP(3),
    "ownerId" TEXT,
    "driveFolderId" TEXT,
    "odooPartnerId" TEXT,
    "normalizedName" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "customFields" JSONB NOT NULL DEFAULT '{}',
    "lastContactAt" TIMESTAMP(3),
    "lastQuoteAt" TIMESTAMP(3),
    "lastOrderAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "jobTitle" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "mobile" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "birthday" DATE,
    "notes" TEXT,
    "linkedinUrl" TEXT,
    "preferredChannel" "ChannelType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_files" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "category" "FileCategory" NOT NULL DEFAULT 'OTHER',
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "client_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_merge_logs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "survivingClientId" TEXT NOT NULL,
    "mergedClientId" TEXT NOT NULL,
    "mergedSnapshot" JSONB NOT NULL,
    "mergedById" TEXT,
    "mergedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,

    CONSTRAINT "client_merge_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "parentQuoteId" TEXT,
    "clientId" TEXT NOT NULL,
    "contactId" TEXT,
    "contactName" TEXT,
    "contactJobTitle" TEXT,
    "opportunityId" TEXT,
    "ownerId" TEXT NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "issueDate" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),
    "paymentTerms" TEXT,
    "deliveryTime" TEXT,
    "conditions" TEXT,
    "notes" TEXT,
    "internalNotes" TEXT,
    "applyVat" BOOLEAN NOT NULL DEFAULT true,
    "vatRate" DECIMAL(5,2) NOT NULL DEFAULT 19.00,
    "showGrandTotals" BOOLEAN NOT NULL DEFAULT true,
    "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "discountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "vatAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "internalCost" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "grossMargin" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "marginPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "signatureUrl" TEXT,
    "publicToken" TEXT,
    "publicViewedAt" TIMESTAMP(3),
    "publicViewCount" INTEGER NOT NULL DEFAULT 0,
    "approvedAt" TIMESTAMP(3),
    "approvedByName" TEXT,
    "approvedBySignature" TEXT,
    "approvedVia" "QuoteApprovedVia",
    "approvedPhone" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "source" "QuoteSource" NOT NULL DEFAULT 'MANUAL',
    "sourceFileKey" TEXT,
    "odooQuotationId" TEXT,
    "aiExtracted" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3),
    "sentVia" TEXT[],
    "lastFollowUpAt" TIMESTAMP(3),
    "followUpCount" INTEGER NOT NULL DEFAULT 0,
    "tariffVersionId" TEXT,
    "assistRunCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "reference" TEXT,
    "description" TEXT NOT NULL,
    "productionMode" "ProductionMode" NOT NULL DEFAULT 'IN_HOUSE',
    "catalogProductId" TEXT,
    "size" TEXT,
    "inks" TEXT,
    "materials" TEXT,
    "finishes" TEXT,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit" TEXT,
    "unitPrice" DECIMAL(15,2) NOT NULL,
    "lineSubtotal" DECIMAL(15,2) NOT NULL,
    "applyVat" BOOLEAN NOT NULL DEFAULT true,
    "vatAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL(15,2) NOT NULL,
    "rawMaterialCost" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "laborHours" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "laborCost" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "outsourcedCost" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "otherCost" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "internalCost" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "marginPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "profitabilityPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "paperTypeId" TEXT,
    "paperSheets" INTEGER,
    "wastePercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "assistRunId" TEXT,
    "productionSpec" TEXT,
    "impositionPerSheet" INTEGER,
    "plateCount" INTEGER,
    "sheetsNeeded" INTEGER,
    "printTechnique" "PrintTechnique",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "QuoteItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogProduct" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" TEXT,
    "size" TEXT,
    "inks" TEXT,
    "materials" TEXT,
    "finishes" TEXT,
    "unit" TEXT,
    "baseQuantity" DECIMAL(10,2),
    "rawMaterialCost" DECIMAL(15,2) DEFAULT 0,
    "baseHours" DECIMAL(10,2) DEFAULT 0,
    "baseMargin" DECIMAL(5,2) DEFAULT 0,
    "suggestedPrice" DECIMAL(15,2),
    "lastPrice" DECIMAL(15,2),
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "imageKey" TEXT,
    "specSheet" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "CatalogProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCategory" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteHistory" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "action" "QuoteHistoryAction" NOT NULL,
    "fromStatus" "QuoteStatus",
    "toStatus" "QuoteStatus",
    "changes" JSONB,
    "userId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuoteHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceList" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'COP',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "PriceList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceListVersion" (
    "id" TEXT NOT NULL,
    "priceListId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceListVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceListItem" (
    "id" TEXT NOT NULL,
    "priceListVersionId" TEXT NOT NULL,
    "catalogProductId" TEXT NOT NULL,
    "price" DECIMAL(15,2) NOT NULL,
    "minQuantity" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceListItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiExtractionLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "costUsd" DECIMAL(10,6),
    "latencyMs" INTEGER,
    "confidence" DECIMAL(5,2),
    "humanCorrected" BOOLEAN NOT NULL DEFAULT false,
    "correctedFields" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiExtractionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pipeline_stages" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "color" TEXT,
    "icon" TEXT,
    "probability" INTEGER NOT NULL DEFAULT 0,
    "type" "StageType" NOT NULL DEFAULT 'OPEN',
    "maxDaysInStage" INTEGER NOT NULL DEFAULT 30,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "pipeline_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lost_reasons" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "LostReasonCategory" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "lost_reasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunities" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "contactId" TEXT,
    "stageId" TEXT NOT NULL,
    "stageEnteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "previousStageId" TEXT,
    "estimatedValue" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "weightedValue" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'COP',
    "expectedCloseDate" TIMESTAMP(3),
    "actualCloseDate" TIMESTAMP(3),
    "probability" INTEGER NOT NULL DEFAULT 0,
    "temperature" "ClientTemperature" NOT NULL DEFAULT 'COLD',
    "temperatureScore" INTEGER NOT NULL DEFAULT 0,
    "ownerId" TEXT,
    "source" "ClientSource" NOT NULL DEFAULT 'MANUAL',
    "campaignId" TEXT,
    "lostReasonId" TEXT,
    "lostNotes" TEXT,
    "wonQuoteId" TEXT,
    "productTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "competitorNotes" TEXT,
    "nextActionAt" TIMESTAMP(3),
    "nextActionNote" TEXT,
    "isStale" BOOLEAN NOT NULL DEFAULT false,
    "isAnomaly" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stage_transitions" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "fromStageId" TEXT,
    "toStageId" TEXT NOT NULL,
    "movedById" TEXT,
    "daysInPreviousStage" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "movedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stage_transitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT,
    "clientId" TEXT,
    "opportunityId" TEXT,
    "contactId" TEXT,
    "userId" TEXT,
    "durationMinutes" INTEGER NOT NULL DEFAULT 0,
    "outcome" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "TaskType" NOT NULL DEFAULT 'FOLLOW_UP',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "assigneeId" TEXT,
    "createdById" TEXT,
    "dueAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "completionNote" TEXT,
    "blockedReason" TEXT,
    "clientId" TEXT,
    "opportunityId" TEXT,
    "quoteId" TEXT,
    "productionProjectId" TEXT,
    "parentTaskId" TEXT,
    "automationRuleId" TEXT,
    "reminderAt" TIMESTAMP(3),
    "snoozedUntil" TIMESTAMP(3),
    "snoozeCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "AppointmentType" NOT NULL DEFAULT 'MEETING',
    "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "location" TEXT,
    "meetingUrl" TEXT,
    "clientId" TEXT,
    "opportunityId" TEXT,
    "ownerId" TEXT,
    "outcome" TEXT,
    "outcomeNotes" TEXT,
    "nextStepTaskId" TEXT,
    "externalCalendarId" TEXT,
    "icsUid" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_attendees" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "userId" TEXT,
    "contactId" TEXT,
    "externalEmail" TEXT,
    "responseStatus" "AttendeeResponseStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "appointment_attendees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vea_meetings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "scope" "VeaScope" NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "heldAt" TIMESTAMP(3),
    "facilitatorId" TEXT,
    "vision" JSONB NOT NULL DEFAULT '{}',
    "evaluation" JSONB NOT NULL DEFAULT '{}',
    "agenda" JSONB NOT NULL DEFAULT '{}',
    "attendeeIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "aiSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "vea_meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vea_contributions" (
    "id" TEXT NOT NULL,
    "veaMeetingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" "VeaContributionCategory" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vea_contributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vea_evaluations" (
    "id" TEXT NOT NULL,
    "veaMeetingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "criteria" JSONB NOT NULL,
    "feedback" TEXT,
    "evaluatedById" TEXT,

    CONSTRAINT "vea_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrintCategory" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageKey" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "PrintCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrintMaterial" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageKey" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "PrintMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrintDimension" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageKey" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "PrintDimension_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrintFinish" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageKey" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "PrintFinish_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrintPrice" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "dimensionId" TEXT NOT NULL,
    "finishId" TEXT,
    "minQuantity" INTEGER NOT NULL,
    "maxQuantity" INTEGER,
    "unitPrice" DECIMAL(15,2) NOT NULL,
    "setupFee" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "PrintPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrintOrder" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "customerDocument" TEXT,
    "status" "PrintOrderStatus" NOT NULL DEFAULT 'NEW',
    "channel" "PrintOrderChannel" NOT NULL DEFAULT 'WEB',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" "PaymentMethod",
    "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "vat" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "productionProjectId" TEXT,
    "odooOrderId" TEXT,
    "uploadToken" TEXT,
    "uploadExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "PrintOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrintOrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "dimensionId" TEXT NOT NULL,
    "finishId" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(15,2) NOT NULL,
    "lineTotal" DECIMAL(15,2) NOT NULL,
    "artworkKeys" TEXT[],
    "artworkStatus" "ArtworkStatus" NOT NULL DEFAULT 'PENDING',
    "specifications" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "PrintOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionStage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "color" TEXT,
    "icon" TEXT,
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    "requiresQualityApproval" BOOLEAN NOT NULL DEFAULT false,
    "qualityApprovalsRequired" INTEGER NOT NULL DEFAULT 1,
    "maxDaysInStage" INTEGER NOT NULL DEFAULT 3,
    "allowedNextStageIds" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ProductionStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionProject" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "clientId" TEXT,
    "clientNameSnapshot" TEXT,
    "quoteId" TEXT,
    "opportunityId" TEXT,
    "printOrderId" TEXT,
    "stageId" TEXT NOT NULL,
    "stageEnteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "productType" "ProductType" NOT NULL,
    "priority" "ProjectPriority" NOT NULL DEFAULT 'MEDIUM',
    "startDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "deliveryPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "budgetTotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "laborCost" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "materialCost" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "outsourcedCost" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "otherCost" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "grossMargin" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "marginPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "totalRealHours" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "invoiced" BOOLEAN NOT NULL DEFAULT false,
    "invoiceNumber" TEXT,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "deliveryNoteNumber" TEXT,
    "costsLocked" BOOLEAN NOT NULL DEFAULT false,
    "artworkKeys" TEXT[],
    "purchaseOrderKey" TEXT,
    "paymentProofKey" TEXT,
    "itemsDetail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ProductionProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionRole" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ProductionRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectAssignment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "userId" TEXT,
    "employeeId" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedById" TEXT NOT NULL,
    "unassignedAt" TIMESTAMP(3),

    CONSTRAINT "ProjectAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualityApproval" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "approvedById" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checklist" JSONB,
    "notes" TEXT,
    "photoKeys" TEXT[],
    "result" "QualityResult" NOT NULL,
    "rejectionReason" TEXT,

    CONSTRAINT "QualityApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "productType" "ProductType" NOT NULL,
    "name" TEXT NOT NULL,
    "defaultRoleId" TEXT,
    "defaultHours" DECIMAL(10,2) NOT NULL,
    "order" INTEGER NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TaskTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionTask" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "templateId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "assigneeEmployeeId" TEXT,
    "machineId" TEXT,
    "processId" TEXT,
    "estimatedHours" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "actualHours" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "blockedReason" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "dependsOnTaskIds" TEXT[],

    CONSTRAINT "ProductionTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectComment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "attachmentKeys" TEXT[],
    "mentionedUserIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryNote" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "clientId" TEXT,
    "items" JSONB NOT NULL,
    "deliveredQuantity" INTEGER NOT NULL DEFAULT 0,
    "partialDelivery" BOOLEAN NOT NULL DEFAULT false,
    "receivedByName" TEXT,
    "receivedById" TEXT,
    "receivedSignatureKey" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "deliveredByEmployeeId" TEXT,
    "vehiclePlate" TEXT,
    "notes" TEXT,
    "pdfKey" TEXT,
    "odooDocumentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "DeliveryNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Machine" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "type" "MachineType" NOT NULL,
    "status" "MachineStatus" NOT NULL DEFAULT 'AVAILABLE',
    "maxSheetWidth" DECIMAL(10,2),
    "maxSheetHeight" DECIMAL(10,2),
    "minSheetWidth" DECIMAL(10,2),
    "minSheetHeight" DECIMAL(10,2),
    "maxColors" INTEGER,
    "sheetsPerHour" INTEGER NOT NULL DEFAULT 0,
    "setupMinutes" INTEGER NOT NULL DEFAULT 0,
    "hourlyCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "purchaseDate" TIMESTAMP(3),
    "purchaseValue" DECIMAL(15,2),
    "maintenanceIntervalHours" INTEGER NOT NULL DEFAULT 500,
    "lastMaintenanceAt" TIMESTAMP(3),
    "nextMaintenanceAt" TIMESTAMP(3),
    "totalHours" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "location" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Machine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Process" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "ProcessCategory" NOT NULL,
    "standardMinutesPerUnit" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "setupMinutes" INTEGER NOT NULL DEFAULT 0,
    "isOutsourceable" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Process_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MachineProcess" (
    "machineId" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "minutesPerUnit" DECIMAL(10,4) NOT NULL,
    "setupMinutes" INTEGER NOT NULL,
    "isPreferred" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "MachineProcess_pkey" PRIMARY KEY ("machineId","processId")
);

-- CreateTable
CREATE TABLE "ProductionEmployee" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "code" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "documentNumber" TEXT,
    "roleIds" TEXT[],
    "skillProcessIds" TEXT[],
    "hourlyRate" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "contractType" "ContractType" NOT NULL,
    "hireDate" TIMESTAMP(3),
    "terminationDate" TIMESTAMP(3),
    "weeklyHours" INTEGER NOT NULL DEFAULT 48,
    "phone" TEXT,
    "emergencyContact" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ProductionEmployee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MachineUsageLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "taskId" TEXT,
    "employeeId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "hours" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "sheetsProcessed" INTEGER NOT NULL DEFAULT 0,
    "setupMinutes" INTEGER NOT NULL DEFAULT 0,
    "downtimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "downtimeReason" TEXT,
    "notes" TEXT,

    CONSTRAINT "MachineUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeEntry" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "taskId" TEXT,
    "processId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "hours" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isOvertime" BOOLEAN NOT NULL DEFAULT false,
    "hourlyRate" DECIMAL(10,2) NOT NULL,
    "cost" DECIMAL(15,2) NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "TimeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceLog" (
    "id" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "type" "MaintenanceType" NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "performedBy" TEXT NOT NULL,
    "cost" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "downtimeHours" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL,
    "partsReplaced" JSONB,
    "nextDueAt" TIMESTAMP(3),

    CONSTRAINT "MaintenanceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KioskInstance" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "machineIds" TEXT[],
    "deviceFingerprint" TEXT,
    "pairingCode" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,

    CONSTRAINT "KioskInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KioskSession" (
    "id" TEXT NOT NULL,
    "kioskInstanceId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "tasksCompleted" INTEGER NOT NULL DEFAULT 0,
    "hoursLogged" DECIMAL(10,2) NOT NULL DEFAULT 0,

    CONSTRAINT "KioskSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KioskHelpRequest" (
    "id" TEXT NOT NULL,
    "kioskInstanceId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "projectId" TEXT,
    "machineId" TEXT,
    "type" "KioskHelpType" NOT NULL,
    "message" TEXT,
    "status" "KioskHelpStatus" NOT NULL DEFAULT 'OPEN',
    "acknowledgedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KioskHelpRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhoneLine" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "providerNumber" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "ivrMenuId" TEXT,
    "ringGroupId" TEXT,
    "recordCalls" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PhoneLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "conversationId" TEXT,
    "phoneLineId" TEXT NOT NULL,
    "direction" "CallDirection" NOT NULL,
    "fromNumber" TEXT NOT NULL,
    "toNumber" TEXT NOT NULL,
    "status" "CallStatus" NOT NULL,
    "answeredById" TEXT,
    "queuedSeconds" INTEGER NOT NULL DEFAULT 0,
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,
    "recordingKey" TEXT,
    "voicemailKey" TEXT,
    "voicemailTranscript" TEXT,
    "clientId" TEXT,
    "contactId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answeredAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "CallLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RingGroup" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "memberUserIds" TEXT[],
    "strategy" "RingStrategy" NOT NULL,
    "ringSeconds" INTEGER NOT NULL DEFAULT 30,
    "overflowToVoicemail" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "RingGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IvrMenu" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "greetingAudioKey" TEXT,
    "greetingText" TEXT,
    "options" JSONB NOT NULL,

    CONSTRAINT "IvrMenu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nit" TEXT,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "paymentTerms" TEXT,
    "leadTimeDays" INTEGER NOT NULL DEFAULT 0,
    "rating" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierRating" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "purchaseId" TEXT,
    "qualityScore" DECIMAL(5,2) NOT NULL,
    "deliveryScore" DECIMAL(5,2) NOT NULL,
    "priceScore" DECIMAL(5,2) NOT NULL,
    "serviceScore" DECIMAL(5,2) NOT NULL,
    "overallScore" DECIMAL(5,2) NOT NULL,
    "comments" TEXT,
    "ratedById" TEXT NOT NULL,
    "ratedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaperType" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "grammage" INTEGER NOT NULL,
    "finish" TEXT,
    "color" TEXT,
    "isRecycled" BOOLEAN NOT NULL DEFAULT false,
    "defaultSupplierId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PaperType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaperSize" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "widthMm" INTEGER NOT NULL,
    "heightMm" INTEGER NOT NULL,
    "isStandard" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PaperSize_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaperInventory" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "paperTypeId" TEXT NOT NULL,
    "paperSizeId" TEXT NOT NULL,
    "currentSheets" INTEGER NOT NULL DEFAULT 0,
    "reservedSheets" INTEGER NOT NULL DEFAULT 0,
    "availableSheets" INTEGER NOT NULL DEFAULT 0,
    "minStockSheets" INTEGER NOT NULL DEFAULT 0,
    "maxStockSheets" INTEGER NOT NULL DEFAULT 0,
    "reorderPointSheets" INTEGER NOT NULL DEFAULT 0,
    "averageCostPerSheet" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "lastCostPerSheet" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "location" TEXT,
    "lastCountedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "PaperInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaperLot" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "paperInventoryId" TEXT NOT NULL,
    "lotNumber" TEXT NOT NULL,
    "supplierId" TEXT,
    "purchaseId" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "initialSheets" INTEGER NOT NULL,
    "remainingSheets" INTEGER NOT NULL,
    "costPerSheet" DECIMAL(15,4) NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "qualityNotes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PaperLot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaperTransformation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sourceLotId" TEXT NOT NULL,
    "sourcePaperSizeId" TEXT NOT NULL,
    "targetPaperSizeId" TEXT NOT NULL,
    "sheetsConsumed" INTEGER NOT NULL,
    "sheetsProduced" INTEGER NOT NULL,
    "wasteSheets" INTEGER NOT NULL,
    "yieldPercent" DECIMAL(5,2) NOT NULL,
    "performedByEmployeeId" TEXT NOT NULL,
    "machineId" TEXT,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "PaperTransformation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WasteFormula" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "productType" TEXT NOT NULL,
    "processId" TEXT,
    "machineId" TEXT,
    "baseWasteSheets" INTEGER NOT NULL DEFAULT 0,
    "wastePercentPerColor" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "wastePercentPerThousand" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "minWasteSheets" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "WasteFormula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supply" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "SupplyCategory" NOT NULL,
    "unit" TEXT NOT NULL,
    "currentStock" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "reservedStock" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "minStock" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "reorderPoint" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "averageCost" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "lastCost" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "machineIds" TEXT[],
    "defaultSupplierId" TEXT,
    "location" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Supply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "orderedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedAt" TIMESTAMP(3),
    "status" "PurchaseStatus" NOT NULL DEFAULT 'DRAFT',
    "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "vat" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "invoiceNumber" TEXT,
    "notes" TEXT,
    "receivedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseItem" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "itemType" "ItemType" NOT NULL,
    "paperInventoryId" TEXT,
    "supplyId" TEXT,
    "quantity" DECIMAL(15,4) NOT NULL,
    "unitCost" DECIMAL(15,4) NOT NULL,
    "lineTotal" DECIMAL(15,2) NOT NULL,

    CONSTRAINT "PurchaseItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryMovement" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "movementType" "MovementType" NOT NULL,
    "itemType" "ItemType" NOT NULL,
    "paperLotId" TEXT,
    "supplyId" TEXT,
    "quantity" DECIMAL(15,4) NOT NULL,
    "unitCost" DECIMAL(15,4) NOT NULL,
    "totalCost" DECIMAL(15,4) NOT NULL,
    "balanceAfter" DECIMAL(15,4) NOT NULL,
    "projectId" TEXT,
    "purchaseId" TEXT,
    "transformationId" TEXT,
    "damageId" TEXT,
    "performedById" TEXT NOT NULL,
    "reason" TEXT,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryReservation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "paperLotId" TEXT,
    "supplyId" TEXT,
    "quantity" DECIMAL(15,4) NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'ACTIVE',
    "reservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),

    CONSTRAINT "InventoryReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DamageRecord" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT,
    "machineId" TEXT,
    "employeeId" TEXT,
    "itemType" "ItemType" NOT NULL,
    "paperLotId" TEXT,
    "supplyId" TEXT,
    "quantity" DECIMAL(15,4) NOT NULL,
    "cost" DECIMAL(15,2) NOT NULL,
    "cause" "DamageCause" NOT NULL,
    "causeDetail" TEXT,
    "photoKeys" TEXT[],
    "isReprocess" BOOLEAN NOT NULL DEFAULT false,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DamageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reprocess" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "damageId" TEXT,
    "reason" TEXT NOT NULL,
    "additionalCost" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "additionalHours" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "responsibleArea" TEXT,
    "preventiveAction" TEXT,
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reprocess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryAlert" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "itemType" "ItemType" NOT NULL,
    "paperInventoryId" TEXT,
    "supplyId" TEXT,
    "alertType" "InventoryAlertType" NOT NULL,
    "threshold" DECIMAL(15,4) NOT NULL,
    "currentValue" DECIMAL(15,4) NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "acknowledgedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryCount" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "countedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "countedById" TEXT NOT NULL,
    "status" "InventoryCountStatus" NOT NULL DEFAULT 'PENDING',
    "items" JSONB NOT NULL,
    "adjustmentMovementIds" TEXT[],
    "notes" TEXT,

    CONSTRAINT "InventoryCount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Overtime" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "hours" DECIMAL(10,2) NOT NULL,
    "type" "OvertimeType" NOT NULL,
    "surchargePercent" DECIMAL(5,2) NOT NULL,
    "hourlyRate" DECIMAL(10,2) NOT NULL,
    "totalCost" DECIMAL(15,2) NOT NULL,
    "status" "OvertimeStatus" NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Overtime_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemporaryWorker" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "agencyId" TEXT,
    "hourlyCost" DECIMAL(10,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TemporaryWorker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemporaryWorkerLog" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "hours" DECIMAL(10,2) NOT NULL,
    "totalCost" DECIMAL(15,2) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "TemporaryWorkerLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Freelancer" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "specialty" TEXT,
    "hourlyRate" DECIMAL(10,2),
    "projectRate" DECIMAL(15,2),
    "bankAccount" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Freelancer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FreelancerPayment" (
    "id" TEXT NOT NULL,
    "freelancerId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "supportKey" TEXT,
    "notes" TEXT,

    CONSTRAINT "FreelancerPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryCost" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "deliveryNoteId" TEXT,
    "type" "DeliveryType" NOT NULL,
    "provider" TEXT,
    "destination" TEXT NOT NULL,
    "cost" DECIMAL(15,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "invoiceKey" TEXT,

    CONSTRAINT "DeliveryCost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutsourcedCost" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "processId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitCost" DECIMAL(15,2) NOT NULL,
    "totalCost" DECIMAL(15,2) NOT NULL,
    "orderedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedAt" TIMESTAMP(3),
    "invoiceNumber" TEXT,
    "qualityRating" DECIMAL(5,2),

    CONSTRAINT "OutsourcedCost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Channel" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ChannelType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Channel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,

    CONSTRAINT "MessageTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "conversationId" TEXT,
    "content" TEXT NOT NULL,
    "mid" TEXT,
    "fromId" TEXT,
    "toId" TEXT,
    "direction" TEXT NOT NULL DEFAULT 'INBOUND',
    "mediaUrl" TEXT,
    "mediaType" TEXT,
    "thumbnailUrl" TEXT,
    "transcript" TEXT,
    "replyToId" TEXT,
    "context" JSONB,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "reactions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "clientId" TEXT,
    "contactId" TEXT,
    "externalId" TEXT,
    "subject" TEXT,
    "status" "ConversationStatus" NOT NULL DEFAULT 'OPEN',
    "assigneeId" TEXT,
    "assignedAt" TIMESTAMP(3),
    "intent" "ConversationIntent",
    "urgency" "ConversationUrgency",
    "sentiment" "ConversationSentiment",
    "sentimentScore" DECIMAL(5,2),
    "autoClassifiedAt" TIMESTAMP(3),
    "isAiHandled" BOOLEAN NOT NULL DEFAULT true,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "tags" TEXT[],
    "leadScore" INTEGER NOT NULL DEFAULT 0,
    "firstResponseAt" TIMESTAMP(3),
    "lastMessageAt" TIMESTAMP(3),
    "lastInboundAt" TIMESTAMP(3),
    "lastOutboundAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "resolutionTimeMinutes" INTEGER,
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Handoff" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "fromType" "HandoffType" NOT NULL,
    "toType" "HandoffType" NOT NULL,
    "toUserId" TEXT,
    "reason" "HandoffReason" NOT NULL,
    "context" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Handoff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sequence" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "goal" TEXT,
    "triggerType" "SequenceTriggerType" NOT NULL DEFAULT 'MANUAL',
    "triggerConfig" JSONB,
    "exitConditions" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "enrolledCount" INTEGER NOT NULL DEFAULT 0,
    "completedCount" INTEGER NOT NULL DEFAULT 0,
    "responseRate" DECIMAL(5,2) NOT NULL DEFAULT 0,

    CONSTRAINT "Sequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SequenceStep" (
    "id" TEXT NOT NULL,
    "sequenceId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "delayValue" INTEGER NOT NULL,
    "delayUnit" "SequenceDelayUnit" NOT NULL,
    "channel" TEXT NOT NULL,
    "templateId" TEXT,
    "conditions" JSONB,
    "abTestVariantOf" TEXT,

    CONSTRAINT "SequenceStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SequenceEnrollment" (
    "id" TEXT NOT NULL,
    "sequenceId" TEXT NOT NULL,
    "clientId" TEXT,
    "contactId" TEXT,
    "opportunityId" TEXT,
    "status" "SequenceEnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentStepOrder" INTEGER NOT NULL DEFAULT 1,
    "nextRunAt" TIMESTAMP(3),
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exitedAt" TIMESTAMP(3),
    "exitReason" TEXT,

    CONSTRAINT "SequenceEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StepExecution" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "messageId" TEXT,
    "status" TEXT NOT NULL,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "error" TEXT,

    CONSTRAINT "StepExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Survey" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "SurveyType" NOT NULL,
    "pregunta" TEXT NOT NULL,
    "escala" INTEGER NOT NULL,
    "plantilla" TEXT,
    "trigger" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Survey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyResponse" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "clientId" TEXT,
    "projectId" TEXT,
    "conversationId" TEXT,
    "score" INTEGER NOT NULL,
    "comment" TEXT,
    "respondedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentiment" TEXT,
    "followUpTaskId" TEXT,

    CONSTRAINT "SurveyResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeCategory" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "icon" TEXT,

    CONSTRAINT "KnowledgeCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeArticle" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "categoryId" TEXT,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "tags" TEXT[],
    "audience" "KnowledgeAudience" NOT NULL DEFAULT 'BOTH',
    "status" "KnowledgeStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "authorId" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "notHelpfulCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeArticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeChunk" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(768),
    "tokenCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TariffVersion" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "TariffStatus" NOT NULL DEFAULT 'DRAFT',
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "publishedById" TEXT,
    "archivedAt" TIMESTAMP(3),
    "bleedCm" DECIMAL(10,2) NOT NULL DEFAULT 0.6,
    "gripMarginCm" DECIMAL(10,2) NOT NULL DEFAULT 1.0,
    "defaultWastageSheets" INTEGER NOT NULL DEFAULT 200,
    "defaultLithoMarginPercent" DECIMAL(5,2) NOT NULL DEFAULT 30.0,
    "notes" TEXT,
    "sourceFileKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "TariffVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaperTariffItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "tariffVersionId" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "paperTypeId" TEXT,
    "sheetFormat" "SheetFormat" NOT NULL,
    "pricePerSheet" DECIMAL(18,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "PaperTariffItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DigitalFormatTariff" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "tariffVersionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "widthCm" DECIMAL(10,2) NOT NULL,
    "heightCm" DECIMAL(10,2) NOT NULL,
    "price1x0" DECIMAL(15,2) NOT NULL,
    "price4x0" DECIMAL(15,2) NOT NULL,
    "price4x4" DECIMAL(15,2) NOT NULL,
    "laminationUnitPrice" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "DigitalFormatTariff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DigitalVolumeTier" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "digitalFormatTariffId" TEXT NOT NULL,
    "minSheets" INTEGER NOT NULL,
    "maxSheets" INTEGER,
    "unitPrice" DECIMAL(15,2) NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "DigitalVolumeTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LithoFormatTariff" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "tariffVersionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "machineLabel" TEXT,
    "printAreaWidthCm" DECIMAL(10,2) NOT NULL,
    "printAreaHeightCm" DECIMAL(10,2) NOT NULL,
    "plateUnitPrice" DECIMAL(15,2) NOT NULL,
    "pressPricePerThousand" DECIMAL(15,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "LithoFormatTariff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SheetCut" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "tariffVersionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "divisor" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "SheetCut_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SheetCutSize" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sheetCutId" TEXT NOT NULL,
    "sheetFormat" "SheetFormat" NOT NULL,
    "widthCm" DECIMAL(10,2) NOT NULL,
    "heightCm" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "SheetCutSize_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InkSetTariff" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "tariffVersionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "plates" INTEGER NOT NULL,
    "technique" "PrintTechnique" NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "InkSetTariff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinishingTariff" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "tariffVersionId" TEXT NOT NULL,
    "service" "FinishingService" NOT NULL,
    "mode" "FinishingMode" NOT NULL,
    "label" TEXT NOT NULL,
    "price" DECIMAL(15,2) NOT NULL,
    "minimumCharge" DECIMAL(15,2),
    "appliesTo" "TariffScope" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "FinishingTariff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommercialTermTariff" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "tariffVersionId" TEXT NOT NULL,
    "type" "CommercialTermType" NOT NULL,
    "label" TEXT NOT NULL,
    "numericValue" DECIMAL(10,4),
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "CommercialTermTariff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WideFormatTariff" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "tariffVersionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pricePerMeter" DECIMAL(15,2) NOT NULL,
    "peerDiscountPerMeter" DECIMAL(15,2) NOT NULL DEFAULT 10000,
    "roundToNearest" INTEGER NOT NULL DEFAULT 500,
    "minimumCharge" DECIMAL(15,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "WideFormatTariff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteAssistRun" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "tariffVersionId" TEXT NOT NULL,
    "engineVersion" TEXT NOT NULL,
    "quoteId" TEXT,
    "quoteItemIds" TEXT[],
    "technique" "PrintTechnique" NOT NULL,
    "mode" "AssistMode" NOT NULL,
    "input" JSONB NOT NULL,
    "result" JSONB NOT NULL,
    "warnings" TEXT[],
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "QuoteAssistRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_layouts" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "scope" "DashboardLayoutScope" NOT NULL,
    "roleId" TEXT,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "widgets" JSONB NOT NULL DEFAULT '[]',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "dashboard_layouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_home_preferences" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "greetingName" TEXT,
    "startPage" TEXT NOT NULL DEFAULT 'home',
    "density" "HomeDensity" NOT NULL DEFAULT 'COMFORTABLE',
    "showWelcomeTour" BOOLEAN NOT NULL DEFAULT true,
    "defaultDateRange" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "user_home_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pinned_items" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entityType" "PinnedEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "pinnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "pinned_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goals" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "scope" "GoalScope" NOT NULL,
    "ownerUserId" TEXT,
    "areaKey" TEXT,
    "machineId" TEXT,
    "metricKey" TEXT NOT NULL,
    "period" "GoalPeriod" NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "targetValue" DECIMAL(15,2) NOT NULL,
    "minimumValue" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "stretchValue" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "direction" "GoalDirection" NOT NULL DEFAULT 'HIGHER_IS_BETTER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_progress" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "asOfDate" DATE NOT NULL,
    "actualValue" DECIMAL(15,2) NOT NULL,
    "expectedValue" DECIMAL(15,2) NOT NULL,
    "attainmentPercent" DECIMAL(5,2) NOT NULL,
    "paceStatus" "GoalPaceStatus" NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goal_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_compliance_daily" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "tasksDue" INTEGER NOT NULL DEFAULT 0,
    "tasksCompleted" INTEGER NOT NULL DEFAULT 0,
    "tasksCompletedOnTime" INTEGER NOT NULL DEFAULT 0,
    "tasksCompletedLate" INTEGER NOT NULL DEFAULT 0,
    "tasksOverdueOpen" INTEGER NOT NULL DEFAULT 0,
    "tasksSnoozed" INTEGER NOT NULL DEFAULT 0,
    "averageDaysLate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "compliancePercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_compliance_daily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capacity_daily" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "subjectType" "CapacitySubjectType" NOT NULL,
    "employeeId" TEXT,
    "machineId" TEXT,
    "areaKey" TEXT,
    "availableHours" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "committedHours" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "loggedHours" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "productiveHours" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "setupHours" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "downtimeHours" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "standardHoursEarned" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "unregisteredHours" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "utilizationPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "efficiencyPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "capacity_daily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_absences" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "EmployeeAbsenceType" NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "hours" DECIMAL(10,2) NOT NULL,
    "approvedById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "employee_absences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "type" "AnnouncementType" NOT NULL,
    "priority" "AnnouncementPriority" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "summary" TEXT,
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "coverImageKey" TEXT,
    "status" "AnnouncementStatus" NOT NULL DEFAULT 'DRAFT',
    "publishAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "pinnedUntil" TIMESTAMP(3),
    "requiresAcknowledgement" BOOLEAN NOT NULL DEFAULT false,
    "allowsComments" BOOLEAN NOT NULL DEFAULT true,
    "allowsReactions" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcement_audiences" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "targetType" "AnnouncementTargetType" NOT NULL,
    "roleId" TEXT,
    "areaKey" TEXT,
    "userId" TEXT,

    CONSTRAINT "announcement_audiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcement_receipts" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deliveredAt" TIMESTAMP(3),
    "seenAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedIp" TEXT,
    "dismissedAt" TIMESTAMP(3),

    CONSTRAINT "announcement_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcement_comments" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "parentCommentId" TEXT,
    "mentionedUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "announcement_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcement_reactions" (
    "announcementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcement_reactions_pkey" PRIMARY KEY ("announcementId","userId","emoji")
);

-- CreateTable
CREATE TABLE "chat_channels" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "ChatChannelType" NOT NULL,
    "key" TEXT,
    "name" TEXT NOT NULL,
    "topic" TEXT,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "entityType" "ChatEntityType",
    "entityId" TEXT,
    "directKey" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "isReadOnly" BOOLEAN NOT NULL DEFAULT false,
    "lastMessageAt" TIMESTAMP(3),
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "chat_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_members" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ChatMemberRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "isMuted" BOOLEAN NOT NULL DEFAULT false,
    "mutedUntil" TIMESTAMP(3),
    "notificationLevel" "ChatNotificationLevel" NOT NULL DEFAULT 'ALL',
    "lastReadMessageId" TEXT,
    "lastReadAt" TIMESTAMP(3),
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "unreadMentionCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "chat_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "type" "ChatMessageType" NOT NULL DEFAULT 'TEXT',
    "body" TEXT NOT NULL,
    "bodyPlain" TEXT NOT NULL,
    "parentMessageId" TEXT,
    "threadReplyCount" INTEGER NOT NULL DEFAULT 0,
    "threadLastReplyAt" TIMESTAMP(3),
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "mentionedUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "mentionsEveryone" BOOLEAN NOT NULL DEFAULT false,
    "linkedEntityType" TEXT,
    "linkedEntityId" TEXT,
    "callSessionId" TEXT,
    "editedAt" TIMESTAMP(3),
    "deletedById" TEXT,
    "clientMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_reactions" (
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_reactions_pkey" PRIMARY KEY ("messageId","userId","emoji")
);

-- CreateTable
CREATE TABLE "chat_pins" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "pinnedById" TEXT NOT NULL,
    "pinnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_pins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_replies" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "shortcut" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "saved_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "call_sessions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "roomName" TEXT NOT NULL,
    "title" TEXT,
    "type" "CallSessionType" NOT NULL DEFAULT 'DIRECT',
    "channelId" TEXT,
    "linkedEntityType" TEXT,
    "linkedEntityId" TEXT,
    "startedById" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,
    "status" "CallSessionStatus" NOT NULL DEFAULT 'RINGING',
    "maxParticipants" INTEGER NOT NULL DEFAULT 2,
    "hadScreenShare" BOOLEAN NOT NULL DEFAULT false,
    "isRecorded" BOOLEAN NOT NULL DEFAULT false,
    "recordingKey" TEXT,
    "recordingConsentBy" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "summary" TEXT,
    "activityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "call_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "call_participants" (
    "id" TEXT NOT NULL,
    "callSessionId" TEXT NOT NULL,
    "userId" TEXT,
    "employeeId" TEXT,
    "externalName" TEXT,
    "externalEmail" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,
    "role" "CallParticipantRole" NOT NULL DEFAULT 'PARTICIPANT',
    "connectionQuality" "CallQuality" NOT NULL DEFAULT 'UNKNOWN',
    "device" TEXT,
    "leftReason" TEXT,

    CONSTRAINT "call_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "call_invitations" (
    "id" TEXT NOT NULL,
    "callSessionId" TEXT NOT NULL,
    "invitedUserId" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "CallInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "call_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_presence" (
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "status" "PresenceStatus" NOT NULL DEFAULT 'OFFLINE',
    "customStatusEmoji" TEXT,
    "customStatusText" TEXT,
    "customStatusExpiresAt" TIMESTAMP(3),
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentDevice" "PresenceDevice" NOT NULL DEFAULT 'WEB',
    "activeCallSessionId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_presence_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "shoutouts" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "message" TEXT NOT NULL,
    "valueKey" TEXT NOT NULL,
    "linkedEntityType" TEXT,
    "linkedEntityId" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "announcementId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shoutouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuickReply" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "shortcut" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "channel" TEXT,
    "category" TEXT,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuickReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "segmentQuery" JSONB NOT NULL,
    "templateId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "deliveredCount" INTEGER NOT NULL DEFAULT 0,
    "readCount" INTEGER NOT NULL DEFAULT 0,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "optOutCount" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignRecipient" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "clientId" TEXT,
    "contactId" TEXT,
    "status" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "optedOutAt" TIMESTAMP(3),

    CONSTRAINT "CampaignRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationReview" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "reviewedById" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "criteria" JSONB NOT NULL,
    "comments" TEXT,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactIdentity" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "contactId" TEXT,
    "clientId" TEXT,
    "channelType" "ChannelType" NOT NULL,
    "rawIdentifier" TEXT NOT NULL,
    "normalizedIdentifier" TEXT NOT NULL,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verificationMethod" "IdentityVerificationMethod",
    "confidence" INTEGER NOT NULL DEFAULT 0,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "status" "IdentityStatus" NOT NULL DEFAULT 'UNLINKED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ContactIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdentityLinkLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "fromContactId" TEXT,
    "toContactId" TEXT,
    "action" "IdentityLinkAction" NOT NULL,
    "method" "IdentityLinkMethod" NOT NULL,
    "actorId" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdentityLinkLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceExtension" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "extension" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sipUsername" TEXT NOT NULL,
    "sipPasswordSecretId" TEXT NOT NULL,
    "type" "VoiceExtensionType" NOT NULL DEFAULT 'USER',
    "status" "VoiceExtensionStatus" NOT NULL DEFAULT 'ACTIVE',
    "callerIdName" TEXT,
    "callerIdNumber" TEXT,
    "mobileNumber" TEXT,
    "ringStrategy" "VoiceRingStrategy" NOT NULL DEFAULT 'BROWSER_ONLY',
    "ringTimeoutSeconds" INTEGER NOT NULL DEFAULT 25,
    "voicemailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "dndUntil" TIMESTAMP(3),
    "forwardToExtension" TEXT,
    "recordingPolicy" "VoiceRecordingPolicy" NOT NULL DEFAULT 'ALWAYS',
    "lastRegisteredAt" TIMESTAMP(3),
    "lastUserAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "VoiceExtension_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceTrunk" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "sipHost" TEXT NOT NULL,
    "sipPort" INTEGER NOT NULL DEFAULT 5060,
    "transport" "VoiceTransport" NOT NULL DEFAULT 'UDP',
    "authMode" "VoiceTrunkAuth" NOT NULL DEFAULT 'REGISTER',
    "usernameSecretId" TEXT,
    "passwordSecretId" TEXT,
    "fromUser" TEXT,
    "fromDomain" TEXT,
    "outboundProxy" TEXT,
    "codecs" TEXT[] DEFAULT ARRAY['alaw', 'ulaw']::TEXT[],
    "maxChannels" INTEGER NOT NULL DEFAULT 10,
    "dialPrefix" TEXT,
    "status" "VoiceTrunkStatus" NOT NULL DEFAULT 'UNKNOWN',
    "lastStatusAt" TIMESTAMP(3),
    "lastStatusDetail" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "VoiceTrunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceNumber" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "trunkId" TEXT NOT NULL,
    "direction" "VoiceNumberDirection" NOT NULL DEFAULT 'BOTH',
    "inboundTarget" "VoiceNumberTarget" NOT NULL DEFAULT 'IVR_FLOW',
    "inboundTargetId" TEXT,
    "isPorted" BOOLEAN NOT NULL DEFAULT false,
    "portingStatus" "VoicePortingStatus" NOT NULL DEFAULT 'NOT_APPLICABLE',
    "portingNotes" TEXT,
    "outboundCallerIdFor" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "VoiceNumber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceCall" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "linkedChannelId" TEXT,
    "bridgeId" TEXT,
    "direction" "VoiceCallDirection" NOT NULL,
    "fromNumber" TEXT NOT NULL,
    "toNumber" TEXT NOT NULL,
    "didId" TEXT,
    "trunkId" TEXT,
    "customerId" TEXT,
    "contactId" TEXT,
    "quoteId" TEXT,
    "projectId" TEXT,
    "extensionId" TEXT,
    "handledByUserId" TEXT,
    "queueId" TEXT,
    "ivrFlowId" TEXT,
    "aiSessionId" TEXT,
    "status" "VoiceCallStatus" NOT NULL DEFAULT 'RINGING',
    "disposition" "VoiceDisposition",
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answeredAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "waitSeconds" INTEGER NOT NULL DEFAULT 0,
    "talkSeconds" INTEGER NOT NULL DEFAULT 0,
    "holdSeconds" INTEGER NOT NULL DEFAULT 0,
    "totalSeconds" INTEGER NOT NULL DEFAULT 0,
    "hangupCause" TEXT,
    "hangupBy" "VoiceHangupBy" NOT NULL DEFAULT 'UNKNOWN',
    "recordingId" TEXT,
    "transcriptId" TEXT,
    "activityId" TEXT,
    "sipCallId" TEXT,
    "cost" DECIMAL(18,2),
    "notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "VoiceCall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceCallEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "VoiceCallEventType" NOT NULL,
    "actorUserId" TEXT,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "VoiceCallEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceQueue" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "extension" TEXT,
    "strategy" "VoiceQueueStrategy" NOT NULL DEFAULT 'RINGALL',
    "ringSeconds" INTEGER NOT NULL DEFAULT 20,
    "wrapUpSeconds" INTEGER NOT NULL DEFAULT 10,
    "maxWaitSeconds" INTEGER NOT NULL DEFAULT 180,
    "maxCallers" INTEGER NOT NULL DEFAULT 20,
    "announcePositionEverySeconds" INTEGER NOT NULL DEFAULT 45,
    "announceHoldTime" BOOLEAN NOT NULL DEFAULT true,
    "musicOnHold" TEXT NOT NULL DEFAULT 'default',
    "greetingPromptId" TEXT,
    "periodicPromptId" TEXT,
    "overflowTarget" "VoiceQueueOverflow" NOT NULL DEFAULT 'VOICEMAIL',
    "overflowTargetId" TEXT,
    "scheduleId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "VoiceQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceQueueMember" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "queueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "penalty" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "VoiceQueueMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceAgentStatus" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "VoiceAgentState" NOT NULL DEFAULT 'OFFLINE',
    "since" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "currentCallId" TEXT,
    "deviceState" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "VoiceAgentStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoicePrompt" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "VoicePromptCategory" NOT NULL DEFAULT 'ANNOUNCEMENT',
    "source" "VoicePromptSource" NOT NULL DEFAULT 'UPLOADED',
    "text" TEXT,
    "ttsVoice" TEXT,
    "ttsLanguage" TEXT NOT NULL DEFAULT 'es-CO',
    "storageKey" TEXT NOT NULL,
    "asteriskFilename" TEXT NOT NULL,
    "durationSeconds" DECIMAL(18,2) NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'wav',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "previousPromptId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "versionLock" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "VoicePrompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceIvrFlow" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "didIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "VoiceFlowStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "publishedById" TEXT,
    "definition" JSONB NOT NULL,
    "scheduleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "flowVersion" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "VoiceIvrFlow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceSchedule" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Bogota',
    "rules" JSONB NOT NULL,
    "holidaysFollowColombia" BOOLEAN NOT NULL DEFAULT true,
    "closedPromptId" TEXT,
    "holidayPromptId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "VoiceSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceRecording" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "durationSeconds" DECIMAL(18,2) NOT NULL,
    "sizeBytes" BIGINT,
    "format" TEXT NOT NULL DEFAULT 'wav',
    "channels" "VoiceRecordingChannels" NOT NULL DEFAULT 'MONO_MIXED',
    "consentAnnounced" BOOLEAN NOT NULL DEFAULT true,
    "retentionUntil" TIMESTAMP(3) NOT NULL,
    "deletedReason" TEXT,
    "deletedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "VoiceRecording_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceTranscript" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "recordingId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'gemini',
    "language" TEXT NOT NULL DEFAULT 'es-CO',
    "segments" JSONB NOT NULL,
    "fullText" TEXT NOT NULL,
    "summary" TEXT,
    "sentiment" "VoiceSentiment",
    "detectedIntents" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "actionItems" JSONB,
    "embedding" vector(768),
    "status" "VoiceTranscriptStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "VoiceTranscript_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceAiSession" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "agentConfigId" TEXT,
    "turns" JSONB NOT NULL,
    "resolvedIntent" TEXT,
    "outcome" "VoiceAiOutcome",
    "handoffReason" TEXT,
    "toolCallCount" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER,
    "costEstimate" DECIMAL(18,2),
    "barginCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "VoiceAiSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceAiAgentConfig" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "systemPrompt" TEXT NOT NULL,
    "voice" TEXT NOT NULL DEFAULT 'es-CO-Standard-A',
    "language" TEXT NOT NULL DEFAULT 'es-CO',
    "greetingPromptId" TEXT,
    "maxTurns" INTEGER NOT NULL DEFAULT 20,
    "maxDurationSeconds" INTEGER NOT NULL DEFAULT 300,
    "handoffQueueId" TEXT,
    "allowedTools" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "temperature" DECIMAL(18,2) NOT NULL DEFAULT 0.3,
    "interruptible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "VoiceAiAgentConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceCampaign" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "numberId" TEXT,
    "queueId" TEXT,
    "mode" "VoiceCampaignMode" NOT NULL DEFAULT 'PREVIEW',
    "scriptText" TEXT NOT NULL,
    "status" "VoiceCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduleId" TEXT,
    "maxAttemptsPerContact" INTEGER NOT NULL DEFAULT 3,
    "retryAfterHours" INTEGER NOT NULL DEFAULT 24,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "consentRequired" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "VoiceCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceCampaignContact" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "customerId" TEXT,
    "contactId" TEXT,
    "phone" TEXT NOT NULL,
    "status" "VoiceCampaignContactStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "nextAttemptAt" TIMESTAMP(3),
    "callId" TEXT,
    "outcome" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "VoiceCampaignContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceDoNotCall" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "customerId" TEXT,
    "reason" "VoiceDncReason" NOT NULL DEFAULT 'CUSTOMER_REQUEST',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestedVia" TEXT NOT NULL,
    "requestedByUserId" TEXT,
    "evidence" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "VoiceDoNotCall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceVoicemail" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "extensionId" TEXT,
    "queueId" TEXT,
    "storageKey" TEXT NOT NULL,
    "durationSeconds" DECIMAL(18,2) NOT NULL,
    "transcriptText" TEXT,
    "status" "VoiceVoicemailStatus" NOT NULL DEFAULT 'NEW',
    "heardAt" TIMESTAMP(3),
    "heardById" TEXT,
    "returnedCallId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "VoiceVoicemail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentRecord" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "contactId" TEXT,
    "clientId" TEXT,
    "channelType" "ConsentChannelType" NOT NULL,
    "purpose" "ConsentPurpose" NOT NULL,
    "status" "ConsentStatus" NOT NULL,
    "source" "ConsentSource" NOT NULL,
    "sourceDetail" TEXT,
    "evidenceSnapshot" JSONB,
    "policyVersion" TEXT,
    "grantedAt" TIMESTAMP(3),
    "withdrawnAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataSubjectRequest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "contactId" TEXT,
    "clientId" TEXT,
    "type" "DSRType" NOT NULL,
    "status" "DSRStatus" NOT NULL DEFAULT 'RECEIVED',
    "channel" TEXT,
    "requestText" TEXT,
    "responseText" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "assigneeId" TEXT,
    "resolutionEvidence" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "DataSubjectRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetentionPolicy" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "retentionMonths" INTEGER NOT NULL,
    "action" "RetentionAction" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "RetentionPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebchatConfig" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "primaryColor" TEXT NOT NULL DEFAULT '#0f172a',
    "position" TEXT NOT NULL DEFAULT 'right',
    "greeting" TEXT NOT NULL DEFAULT '¡Hola! ¿En qué podemos ayudarte?',
    "avatarUrl" TEXT,
    "businessHours" JSONB NOT NULL DEFAULT '{"timezone":"America/Bogota","schedule":{"monday":{"open":"08:00","close":"17:00"},"tuesday":{"open":"08:00","close":"17:00"},"wednesday":{"open":"08:00","close":"17:00"},"thursday":{"open":"08:00","close":"17:00"},"friday":{"open":"08:00","close":"17:00"}}}',
    "outOfHoursMessage" TEXT NOT NULL DEFAULT 'En este momento estamos fuera del horario de atención. Déjanos tu mensaje y te contactaremos pronto.',
    "quickReplies" JSONB NOT NULL DEFAULT '["Cotizar un trabajo", "Estado de mi pedido", "Hablar con un asesor"]',
    "allowedOrigins" TEXT[] DEFAULT ARRAY['*']::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebchatConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebchatSession" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "channelId" TEXT,
    "visitorToken" TEXT NOT NULL,
    "conversationId" TEXT,
    "pageUrl" TEXT,
    "referrer" TEXT,
    "userAgent" TEXT,
    "ipHash" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmTerm" TEXT,
    "utmContent" TEXT,
    "visitedPages" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebchatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetaChannelConfig" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "pageId" TEXT,
    "instagramId" TEXT,
    "accessToken" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3),
    "lastHealthCheck" TIMESTAMP(3),
    "healthStatus" TEXT NOT NULL DEFAULT 'HEALTHY',
    "webhookSecret" TEXT,
    "replyToComments" BOOLEAN NOT NULL DEFAULT false,
    "commentReplyText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetaChannelConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetaEventLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "channelId" TEXT,
    "platform" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROCESSED',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetaEventLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Call" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "channelId" TEXT,
    "conversationId" TEXT,
    "contactId" TEXT,
    "clientId" TEXT,
    "direction" TEXT NOT NULL,
    "fromNumber" TEXT NOT NULL,
    "toNumber" TEXT NOT NULL,
    "externalCallId" TEXT,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answeredAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "agentId" TEXT,
    "recordingUrl" TEXT,
    "recordingConsent" BOOLEAN NOT NULL DEFAULT false,
    "transcriptText" TEXT,
    "transcriptSegments" JSONB,
    "aiSummary" TEXT,
    "aiSentiment" TEXT,
    "aiNextSteps" JSONB,
    "disposition" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Call_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlaPolicy" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "appliesTo" JSONB NOT NULL,
    "firstResponseMinutes" INTEGER NOT NULL,
    "resolutionMinutes" INTEGER NOT NULL,
    "businessHoursOnly" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlaPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessHours" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Bogota',
    "schedule" JSONB NOT NULL,
    "holidayCalendar" "HolidayCalendar" NOT NULL DEFAULT 'COLOMBIA',
    "exceptions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessHours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentShift" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessHoursId" TEXT NOT NULL,
    "skills" TEXT[],
    "maxConcurrentConversations" INTEGER NOT NULL DEFAULT 5,
    "channels" TEXT[],
    "isBackup" BOOLEAN NOT NULL DEFAULT false,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentShift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutingRule" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "conditions" JSONB NOT NULL,
    "strategy" "RoutingStrategy" NOT NULL,
    "targetUserIds" TEXT[],
    "targetTeamId" TEXT,
    "fallbackUserId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoutingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscalationPolicy" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trigger" "EscalationTrigger" NOT NULL,
    "steps" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EscalationPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationCost" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "channelCost" DECIMAL(18,2) NOT NULL,
    "aiCost" DECIMAL(18,2) NOT NULL,
    "agentMinutes" INTEGER NOT NULL,
    "agentCost" DECIMAL(18,2) NOT NULL,
    "totalCost" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'COP',
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversationCost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelTariff" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "cost" DECIMAL(18,4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChannelTariff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SettingDefinition" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "domain" "SettingDomain" NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "helpText" TEXT,
    "valueType" "SettingValueType" NOT NULL,
    "defaultValue" JSONB NOT NULL,
    "validationSchema" JSONB NOT NULL,
    "enumOptions" JSONB,
    "unit" TEXT,
    "isSensitive" BOOLEAN NOT NULL DEFAULT false,
    "requiresRestart" BOOLEAN NOT NULL DEFAULT false,
    "requiredPermission" TEXT NOT NULL DEFAULT 'settings:update',
    "dangerLevel" "SettingDangerLevel" NOT NULL DEFAULT 'SAFE',
    "order" INTEGER NOT NULL DEFAULT 0,
    "group" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SettingDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SettingValue" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "isOverridden" BOOLEAN NOT NULL DEFAULT false,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveUntil" TIMESTAMP(3),

    CONSTRAINT "SettingValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SettingChange" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "previousValue" JSONB,
    "newValue" JSONB,
    "changedById" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "userAgent" TEXT,
    "reason" TEXT,
    "revertedById" TEXT,
    "revertedAt" TIMESTAMP(3),
    "revertsChangeId" TEXT,

    CONSTRAINT "SettingChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "FeatureFlagStatus" NOT NULL DEFAULT 'OFF',
    "rolloutPercentage" INTEGER NOT NULL DEFAULT 0,
    "enabledForUserIds" TEXT[],
    "enabledForRoleKeys" TEXT[],
    "killSwitch" BOOLEAN NOT NULL DEFAULT false,
    "ownerId" TEXT,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "permissions" TEXT[],

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserInvitation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "roleIds" TEXT[],
    "invitedById" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "UserInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessReview" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'OPEN',
    "reviewerId" TEXT,
    "findings" JSONB,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AccessReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Secret" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "encryptedValue" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "authTag" TEXT,
    "algorithm" TEXT NOT NULL DEFAULT 'aes-256-gcm',
    "version" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Secret_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NumberSequence" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "series" TEXT NOT NULL,
    "current" INTEGER NOT NULL DEFAULT 100,
    "prefix" TEXT,
    "step" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NumberSequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterRecord" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "catalog" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "usageCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MasterRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentSeries" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "currentValue" INTEGER NOT NULL DEFAULT 0,
    "padding" INTEGER NOT NULL DEFAULT 4,
    "resetYearly" BOOLEAN NOT NULL DEFAULT false,
    "yearFormat" TEXT,

    CONSTRAINT "DocumentSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarException" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "type" "CalendarExceptionType" NOT NULL,
    "name" TEXT NOT NULL,
    "isWorkingDay" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CalendarException_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "TemplateType" NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "avatarIcon" TEXT,
    "type" "AgentType" NOT NULL,
    "domain" "AgentDomain" NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "promptVersion" INTEGER NOT NULL DEFAULT 1,
    "modelPreference" "ModelPreference" NOT NULL DEFAULT 'AUTO',
    "temperature" DECIMAL(3,2) NOT NULL DEFAULT 0.7,
    "maxOutputTokens" INTEGER NOT NULL DEFAULT 8192,
    "allowedToolKeys" TEXT[],
    "requiredPermission" TEXT,
    "canRunAutonomously" BOOLEAN NOT NULL DEFAULT false,
    "requiresApprovalFor" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentPromptVersion" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "changedById" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "evalScore" DECIMAL(5,2),

    CONSTRAINT "AgentPromptVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentRun" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "promptVersion" INTEGER NOT NULL,
    "trigger" "AgentRunTrigger" NOT NULL,
    "triggerRef" TEXT,
    "userId" TEXT,
    "conversationId" TEXT,
    "input" JSONB NOT NULL,
    "output" JSONB,
    "toolCalls" JSONB,
    "model" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "cachedTokens" INTEGER,
    "costCop" DECIMAL(18,2),
    "latencyMs" INTEGER,
    "confidence" DECIMAL(5,2),
    "status" "AgentRunStatus" NOT NULL,
    "errorDetail" TEXT,
    "feedback" "AgentRunFeedback" NOT NULL DEFAULT 'NONE',
    "feedbackNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentMemory" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "scope" "AgentMemoryScope" NOT NULL,
    "scopeRef" TEXT,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "embedding" vector(768),
    "source" "AgentMemorySource" NOT NULL,
    "sourceRunId" TEXT,
    "confidence" DECIMAL(5,2),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentMemory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentTask" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "runId" TEXT,
    "type" "AgentTaskType" NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "impact" JSONB,
    "status" "AgentTaskStatus" NOT NULL DEFAULT 'PENDING',
    "assignedToId" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "executedAt" TIMESTAMP(3),
    "executionResult" JSONB,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvalCase" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "agentKey" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "expectedBehavior" TEXT NOT NULL,
    "assertions" JSONB NOT NULL,
    "severity" "EvalSeverity" NOT NULL,
    "source" "EvalSource" NOT NULL DEFAULT 'MANUAL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvalCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvalRun" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "agentKey" TEXT NOT NULL,
    "promptVersion" INTEGER NOT NULL,
    "totalCases" INTEGER NOT NULL,
    "passed" INTEGER NOT NULL,
    "failed" INTEGER NOT NULL,
    "score" DECIMAL(5,2) NOT NULL,
    "failedCaseIds" TEXT[],
    "costCop" DECIMAL(18,2),
    "durationMs" INTEGER,
    "triggeredBy" TEXT,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvalRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiBudget" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "monthlyBudgetCop" DECIMAL(18,2) NOT NULL,
    "alertAt70Sent" BOOLEAN NOT NULL DEFAULT false,
    "alertAt90Sent" BOOLEAN NOT NULL DEFAULT false,
    "exhaustedAlertSent" BOOLEAN NOT NULL DEFAULT false,
    "currentMonthSpend" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "currentMonth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiBudget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SemanticEntity" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "entityKey" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "synonyms" TEXT[],
    "domain" TEXT NOT NULL,
    "isQueryable" BOOLEAN NOT NULL DEFAULT true,
    "exampleQuestions" TEXT[],
    "embedding" vector(768),
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SemanticEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SemanticField" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "unit" TEXT,
    "synonyms" TEXT[],
    "isSensitive" BOOLEAN NOT NULL DEFAULT false,
    "calculationNote" TEXT,
    "commonFilters" JSONB,

    CONSTRAINT "SemanticField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SemanticMetric" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "formula" TEXT NOT NULL,
    "sqlHint" TEXT,
    "unit" TEXT,
    "goodDirection" "GoodDirection" NOT NULL,
    "targetValue" DECIMAL(18,4),
    "warningThreshold" DECIMAL(18,4),
    "criticalThreshold" DECIMAL(18,4),
    "ownerRole" TEXT,

    CONSTRAINT "SemanticMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessGlossary" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "synonyms" TEXT[],
    "domain" TEXT,
    "examples" TEXT[],
    "embedding" vector(768),

    CONSTRAINT "BusinessGlossary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContextSource" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ContextSourceType" NOT NULL,
    "config" JSONB,
    "syncMode" "SyncMode" NOT NULL DEFAULT 'MANUAL',
    "lastSyncAt" TIMESTAMP(3),
    "documentCount" INTEGER NOT NULL DEFAULT 0,
    "chunkCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "allowedAgentKeys" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContextSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContextVacio" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "topic" TEXT,
    "agentId" TEXT,
    "runId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ContextVacio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clients_organizationId_normalizedName_idx" ON "clients"("organizationId", "normalizedName");

-- CreateIndex
CREATE INDEX "clients_organizationId_clientType_temperature_idx" ON "clients"("organizationId", "clientType", "temperature");

-- CreateIndex
CREATE UNIQUE INDEX "clients_organizationId_documentNumber_key" ON "clients"("organizationId", "documentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_publicToken_key" ON "Quote"("publicToken");

-- CreateIndex
CREATE INDEX "Quote_organizationId_status_issueDate_idx" ON "Quote"("organizationId", "status", "issueDate");

-- CreateIndex
CREATE INDEX "Quote_organizationId_clientId_issueDate_idx" ON "Quote"("organizationId", "clientId", "issueDate");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_organizationId_number_revision_key" ON "Quote"("organizationId", "number", "revision");

-- CreateIndex
CREATE INDEX "QuoteItem_organizationId_quoteId_idx" ON "QuoteItem"("organizationId", "quoteId");

-- CreateIndex
CREATE INDEX "CatalogProduct_organizationId_normalizedName_idx" ON "CatalogProduct"("organizationId", "normalizedName");

-- CreateIndex
CREATE INDEX "ProductCategory_organizationId_parentId_idx" ON "ProductCategory"("organizationId", "parentId");

-- CreateIndex
CREATE INDEX "QuoteHistory_quoteId_createdAt_idx" ON "QuoteHistory"("quoteId", "createdAt");

-- CreateIndex
CREATE INDEX "PriceListVersion_priceListId_validFrom_idx" ON "PriceListVersion"("priceListId", "validFrom");

-- CreateIndex
CREATE INDEX "PriceListItem_priceListVersionId_catalogProductId_idx" ON "PriceListItem"("priceListVersionId", "catalogProductId");

-- CreateIndex
CREATE INDEX "AiExtractionLog_organizationId_sourceType_idx" ON "AiExtractionLog"("organizationId", "sourceType");

-- CreateIndex
CREATE UNIQUE INDEX "pipeline_stages_organizationId_key_key" ON "pipeline_stages"("organizationId", "key");

-- CreateIndex
CREATE INDEX "opportunities_organizationId_stageId_idx" ON "opportunities"("organizationId", "stageId");

-- CreateIndex
CREATE INDEX "opportunities_clientId_idx" ON "opportunities"("clientId");

-- CreateIndex
CREATE INDEX "activities_clientId_occurredAt_idx" ON "activities"("clientId", "occurredAt");

-- CreateIndex
CREATE INDEX "activities_opportunityId_occurredAt_idx" ON "activities"("opportunityId", "occurredAt");

-- CreateIndex
CREATE INDEX "tasks_assigneeId_status_dueAt_idx" ON "tasks"("assigneeId", "status", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_icsUid_key" ON "appointments"("icsUid");

-- CreateIndex
CREATE INDEX "appointments_ownerId_startAt_idx" ON "appointments"("ownerId", "startAt");

-- CreateIndex
CREATE UNIQUE INDEX "vea_meetings_organizationId_scope_year_weekNumber_key" ON "vea_meetings"("organizationId", "scope", "year", "weekNumber");

-- CreateIndex
CREATE INDEX "PrintCategory_organizationId_isActive_order_idx" ON "PrintCategory"("organizationId", "isActive", "order");

-- CreateIndex
CREATE INDEX "PrintMaterial_organizationId_isActive_order_idx" ON "PrintMaterial"("organizationId", "isActive", "order");

-- CreateIndex
CREATE INDEX "PrintDimension_organizationId_isActive_order_idx" ON "PrintDimension"("organizationId", "isActive", "order");

-- CreateIndex
CREATE INDEX "PrintFinish_organizationId_isActive_order_idx" ON "PrintFinish"("organizationId", "isActive", "order");

-- CreateIndex
CREATE INDEX "PrintPrice_organizationId_categoryId_materialId_dimensionId_idx" ON "PrintPrice"("organizationId", "categoryId", "materialId", "dimensionId");

-- CreateIndex
CREATE UNIQUE INDEX "PrintOrder_uploadToken_key" ON "PrintOrder"("uploadToken");

-- CreateIndex
CREATE INDEX "PrintOrder_organizationId_status_idx" ON "PrintOrder"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PrintOrder_organizationId_number_key" ON "PrintOrder"("organizationId", "number");

-- CreateIndex
CREATE INDEX "PrintOrderItem_orderId_idx" ON "PrintOrderItem"("orderId");

-- CreateIndex
CREATE INDEX "ProductionStage_organizationId_order_idx" ON "ProductionStage"("organizationId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionStage_organizationId_key_key" ON "ProductionStage"("organizationId", "key");

-- CreateIndex
CREATE INDEX "ProductionProject_organizationId_stageId_idx" ON "ProductionProject"("organizationId", "stageId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionProject_organizationId_number_key" ON "ProductionProject"("organizationId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionRole_organizationId_key_key" ON "ProductionRole"("organizationId", "key");

-- CreateIndex
CREATE INDEX "ProjectAssignment_projectId_roleId_idx" ON "ProjectAssignment"("projectId", "roleId");

-- CreateIndex
CREATE INDEX "ProductionTask_projectId_idx" ON "ProductionTask"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryNote_organizationId_number_key" ON "DeliveryNote"("organizationId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "Machine_organizationId_code_key" ON "Machine"("organizationId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionEmployee_userId_key" ON "ProductionEmployee"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionEmployee_organizationId_code_key" ON "ProductionEmployee"("organizationId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_organizationId_code_key" ON "Supplier"("organizationId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "PaperInventory_organizationId_paperTypeId_paperSizeId_key" ON "PaperInventory"("organizationId", "paperTypeId", "paperSizeId");

-- CreateIndex
CREATE UNIQUE INDEX "Message_mid_key" ON "Message"("mid");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeArticle_organizationId_slug_key" ON "KnowledgeArticle"("organizationId", "slug");

-- CreateIndex
CREATE INDEX "TariffVersion_organizationId_status_validFrom_idx" ON "TariffVersion"("organizationId", "status", "validFrom");

-- CreateIndex
CREATE UNIQUE INDEX "TariffVersion_organizationId_code_key" ON "TariffVersion"("organizationId", "code");

-- CreateIndex
CREATE INDEX "PaperTariffItem_organizationId_tariffVersionId_idx" ON "PaperTariffItem"("organizationId", "tariffVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "PaperTariffItem_tariffVersionId_name_sheetFormat_key" ON "PaperTariffItem"("tariffVersionId", "name", "sheetFormat");

-- CreateIndex
CREATE INDEX "DigitalFormatTariff_organizationId_tariffVersionId_idx" ON "DigitalFormatTariff"("organizationId", "tariffVersionId");

-- CreateIndex
CREATE INDEX "DigitalVolumeTier_organizationId_digitalFormatTariffId_idx" ON "DigitalVolumeTier"("organizationId", "digitalFormatTariffId");

-- CreateIndex
CREATE UNIQUE INDEX "DigitalVolumeTier_digitalFormatTariffId_minSheets_key" ON "DigitalVolumeTier"("digitalFormatTariffId", "minSheets");

-- CreateIndex
CREATE INDEX "LithoFormatTariff_organizationId_tariffVersionId_idx" ON "LithoFormatTariff"("organizationId", "tariffVersionId");

-- CreateIndex
CREATE INDEX "SheetCut_organizationId_tariffVersionId_idx" ON "SheetCut"("organizationId", "tariffVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "SheetCut_tariffVersionId_code_key" ON "SheetCut"("tariffVersionId", "code");

-- CreateIndex
CREATE INDEX "SheetCutSize_organizationId_sheetCutId_idx" ON "SheetCutSize"("organizationId", "sheetCutId");

-- CreateIndex
CREATE UNIQUE INDEX "SheetCutSize_sheetCutId_sheetFormat_key" ON "SheetCutSize"("sheetCutId", "sheetFormat");

-- CreateIndex
CREATE INDEX "InkSetTariff_organizationId_tariffVersionId_idx" ON "InkSetTariff"("organizationId", "tariffVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "InkSetTariff_tariffVersionId_code_technique_key" ON "InkSetTariff"("tariffVersionId", "code", "technique");

-- CreateIndex
CREATE INDEX "FinishingTariff_organizationId_tariffVersionId_idx" ON "FinishingTariff"("organizationId", "tariffVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "FinishingTariff_tariffVersionId_service_label_key" ON "FinishingTariff"("tariffVersionId", "service", "label");

-- CreateIndex
CREATE INDEX "CommercialTermTariff_organizationId_tariffVersionId_idx" ON "CommercialTermTariff"("organizationId", "tariffVersionId");

-- CreateIndex
CREATE INDEX "WideFormatTariff_organizationId_tariffVersionId_idx" ON "WideFormatTariff"("organizationId", "tariffVersionId");

-- CreateIndex
CREATE INDEX "QuoteAssistRun_organizationId_quoteId_idx" ON "QuoteAssistRun"("organizationId", "quoteId");

-- CreateIndex
CREATE INDEX "QuoteAssistRun_organizationId_createdAt_idx" ON "QuoteAssistRun"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "dashboard_layouts_organizationId_scope_idx" ON "dashboard_layouts"("organizationId", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "dashboard_layouts_organizationId_scope_roleId_key" ON "dashboard_layouts"("organizationId", "scope", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "dashboard_layouts_organizationId_scope_userId_key" ON "dashboard_layouts"("organizationId", "scope", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_home_preferences_userId_key" ON "user_home_preferences"("userId");

-- CreateIndex
CREATE INDEX "user_home_preferences_organizationId_userId_idx" ON "user_home_preferences"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "pinned_items_organizationId_userId_idx" ON "pinned_items"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "pinned_items_userId_entityType_entityId_key" ON "pinned_items"("userId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "goals_organizationId_isActive_idx" ON "goals"("organizationId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "goals_organizationId_scope_ownerUserId_machineId_metricKey__key" ON "goals"("organizationId", "scope", "ownerUserId", "machineId", "metricKey", "periodStart");

-- CreateIndex
CREATE INDEX "goal_progress_goalId_asOfDate_idx" ON "goal_progress"("goalId", "asOfDate");

-- CreateIndex
CREATE UNIQUE INDEX "goal_progress_goalId_asOfDate_key" ON "goal_progress"("goalId", "asOfDate");

-- CreateIndex
CREATE INDEX "task_compliance_daily_organizationId_date_idx" ON "task_compliance_daily"("organizationId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "task_compliance_daily_organizationId_userId_date_key" ON "task_compliance_daily"("organizationId", "userId", "date");

-- CreateIndex
CREATE INDEX "capacity_daily_organizationId_date_idx" ON "capacity_daily"("organizationId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "capacity_daily_organizationId_subjectType_employeeId_machin_key" ON "capacity_daily"("organizationId", "subjectType", "employeeId", "machineId", "areaKey", "date");

-- CreateIndex
CREATE INDEX "employee_absences_organizationId_employeeId_startAt_idx" ON "employee_absences"("organizationId", "employeeId", "startAt");

-- CreateIndex
CREATE INDEX "announcements_organizationId_status_publishAt_idx" ON "announcements"("organizationId", "status", "publishAt");

-- CreateIndex
CREATE INDEX "announcement_audiences_announcementId_idx" ON "announcement_audiences"("announcementId");

-- CreateIndex
CREATE INDEX "announcement_receipts_userId_idx" ON "announcement_receipts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "announcement_receipts_announcementId_userId_key" ON "announcement_receipts"("announcementId", "userId");

-- CreateIndex
CREATE INDEX "announcement_comments_announcementId_createdAt_idx" ON "announcement_comments"("announcementId", "createdAt");

-- CreateIndex
CREATE INDEX "chat_channels_organizationId_type_idx" ON "chat_channels"("organizationId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "chat_channels_organizationId_key_key" ON "chat_channels"("organizationId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "chat_channels_organizationId_entityType_entityId_key" ON "chat_channels"("organizationId", "entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "chat_channels_organizationId_directKey_key" ON "chat_channels"("organizationId", "directKey");

-- CreateIndex
CREATE INDEX "chat_members_userId_idx" ON "chat_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "chat_members_channelId_userId_key" ON "chat_members"("channelId", "userId");

-- CreateIndex
CREATE INDEX "chat_messages_channelId_createdAt_idx" ON "chat_messages"("channelId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "chat_messages_organizationId_authorId_createdAt_idx" ON "chat_messages"("organizationId", "authorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "chat_messages_channelId_clientMessageId_key" ON "chat_messages"("channelId", "clientMessageId");

-- CreateIndex
CREATE INDEX "chat_pins_channelId_pinnedAt_idx" ON "chat_pins"("channelId", "pinnedAt");

-- CreateIndex
CREATE INDEX "saved_replies_organizationId_shortcut_idx" ON "saved_replies"("organizationId", "shortcut");

-- CreateIndex
CREATE UNIQUE INDEX "call_sessions_roomName_key" ON "call_sessions"("roomName");

-- CreateIndex
CREATE INDEX "call_sessions_organizationId_status_idx" ON "call_sessions"("organizationId", "status");

-- CreateIndex
CREATE INDEX "call_participants_callSessionId_idx" ON "call_participants"("callSessionId");

-- CreateIndex
CREATE INDEX "call_invitations_callSessionId_invitedUserId_idx" ON "call_invitations"("callSessionId", "invitedUserId");

-- CreateIndex
CREATE INDEX "user_presence_organizationId_status_idx" ON "user_presence"("organizationId", "status");

-- CreateIndex
CREATE INDEX "shoutouts_organizationId_createdAt_idx" ON "shoutouts"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "ContactIdentity_organizationId_status_idx" ON "ContactIdentity"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ContactIdentity_organizationId_channelType_normalizedIdenti_key" ON "ContactIdentity"("organizationId", "channelType", "normalizedIdentifier");

-- CreateIndex
CREATE UNIQUE INDEX "VoiceExtension_sipUsername_key" ON "VoiceExtension"("sipUsername");

-- CreateIndex
CREATE INDEX "VoiceExtension_organizationId_userId_idx" ON "VoiceExtension"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "VoiceExtension_organizationId_status_idx" ON "VoiceExtension"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "VoiceExtension_organizationId_extension_key" ON "VoiceExtension"("organizationId", "extension");

-- CreateIndex
CREATE INDEX "VoiceTrunk_organizationId_status_idx" ON "VoiceTrunk"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "VoiceNumber_number_key" ON "VoiceNumber"("number");

-- CreateIndex
CREATE INDEX "VoiceNumber_organizationId_direction_idx" ON "VoiceNumber"("organizationId", "direction");

-- CreateIndex
CREATE UNIQUE INDEX "VoiceCall_channelId_key" ON "VoiceCall"("channelId");

-- CreateIndex
CREATE INDEX "VoiceCall_organizationId_startedAt_idx" ON "VoiceCall"("organizationId", "startedAt" DESC);

-- CreateIndex
CREATE INDEX "VoiceCall_customerId_startedAt_idx" ON "VoiceCall"("customerId", "startedAt" DESC);

-- CreateIndex
CREATE INDEX "VoiceCall_handledByUserId_startedAt_idx" ON "VoiceCall"("handledByUserId", "startedAt" DESC);

-- CreateIndex
CREATE INDEX "VoiceCall_status_idx" ON "VoiceCall"("status");

-- CreateIndex
CREATE INDEX "VoiceCall_channelId_idx" ON "VoiceCall"("channelId");

-- CreateIndex
CREATE INDEX "VoiceCall_direction_startedAt_idx" ON "VoiceCall"("direction", "startedAt" DESC);

-- CreateIndex
CREATE INDEX "VoiceCallEvent_callId_at_idx" ON "VoiceCallEvent"("callId", "at");

-- CreateIndex
CREATE INDEX "VoiceCallEvent_organizationId_type_idx" ON "VoiceCallEvent"("organizationId", "type");

-- CreateIndex
CREATE INDEX "VoiceQueue_organizationId_isActive_idx" ON "VoiceQueue"("organizationId", "isActive");

-- CreateIndex
CREATE INDEX "VoiceQueueMember_organizationId_userId_idx" ON "VoiceQueueMember"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "VoiceQueueMember_queueId_userId_key" ON "VoiceQueueMember"("queueId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "VoiceAgentStatus_userId_key" ON "VoiceAgentStatus"("userId");

-- CreateIndex
CREATE INDEX "VoiceAgentStatus_organizationId_status_idx" ON "VoiceAgentStatus"("organizationId", "status");

-- CreateIndex
CREATE INDEX "VoicePrompt_organizationId_category_isActive_idx" ON "VoicePrompt"("organizationId", "category", "isActive");

-- CreateIndex
CREATE INDEX "VoiceIvrFlow_organizationId_status_idx" ON "VoiceIvrFlow"("organizationId", "status");

-- CreateIndex
CREATE INDEX "VoiceSchedule_organizationId_idx" ON "VoiceSchedule"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "VoiceRecording_callId_key" ON "VoiceRecording"("callId");

-- CreateIndex
CREATE INDEX "VoiceRecording_organizationId_retentionUntil_idx" ON "VoiceRecording"("organizationId", "retentionUntil");

-- CreateIndex
CREATE UNIQUE INDEX "VoiceTranscript_callId_key" ON "VoiceTranscript"("callId");

-- CreateIndex
CREATE INDEX "VoiceTranscript_organizationId_status_idx" ON "VoiceTranscript"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "VoiceAiSession_callId_key" ON "VoiceAiSession"("callId");

-- CreateIndex
CREATE INDEX "VoiceAiSession_organizationId_outcome_idx" ON "VoiceAiSession"("organizationId", "outcome");

-- CreateIndex
CREATE INDEX "VoiceAiAgentConfig_organizationId_isActive_idx" ON "VoiceAiAgentConfig"("organizationId", "isActive");

-- CreateIndex
CREATE INDEX "VoiceCampaign_organizationId_status_idx" ON "VoiceCampaign"("organizationId", "status");

-- CreateIndex
CREATE INDEX "VoiceCampaignContact_campaignId_status_idx" ON "VoiceCampaignContact"("campaignId", "status");

-- CreateIndex
CREATE INDEX "VoiceCampaignContact_organizationId_phone_idx" ON "VoiceCampaignContact"("organizationId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "VoiceDoNotCall_phone_key" ON "VoiceDoNotCall"("phone");

-- CreateIndex
CREATE INDEX "VoiceDoNotCall_organizationId_phone_idx" ON "VoiceDoNotCall"("organizationId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "VoiceVoicemail_callId_key" ON "VoiceVoicemail"("callId");

-- CreateIndex
CREATE INDEX "VoiceVoicemail_organizationId_status_idx" ON "VoiceVoicemail"("organizationId", "status");

-- CreateIndex
CREATE INDEX "ConsentRecord_organizationId_contactId_channelType_purpose_idx" ON "ConsentRecord"("organizationId", "contactId", "channelType", "purpose");

-- CreateIndex
CREATE UNIQUE INDEX "WebchatConfig_organizationId_key" ON "WebchatConfig"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "WebchatConfig_publicKey_key" ON "WebchatConfig"("publicKey");

-- CreateIndex
CREATE UNIQUE INDEX "WebchatSession_visitorToken_key" ON "WebchatSession"("visitorToken");

-- CreateIndex
CREATE INDEX "WebchatSession_organizationId_visitorToken_idx" ON "WebchatSession"("organizationId", "visitorToken");

-- CreateIndex
CREATE UNIQUE INDEX "MetaChannelConfig_channelId_key" ON "MetaChannelConfig"("channelId");

-- CreateIndex
CREATE UNIQUE INDEX "SettingDefinition_key_key" ON "SettingDefinition"("key");

-- CreateIndex
CREATE UNIQUE INDEX "SettingValue_organizationId_key_key" ON "SettingValue"("organizationId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_organizationId_key_key" ON "FeatureFlag"("organizationId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "Role_organizationId_key_key" ON "Role"("organizationId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "UserInvitation_token_key" ON "UserInvitation"("token");

-- CreateIndex
CREATE INDEX "UserInvitation_organizationId_email_idx" ON "UserInvitation"("organizationId", "email");

-- CreateIndex
CREATE INDEX "Secret_organizationId_idx" ON "Secret"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Secret_organizationId_key_key" ON "Secret"("organizationId", "key");

-- CreateIndex
CREATE INDEX "NumberSequence_organizationId_idx" ON "NumberSequence"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "NumberSequence_organizationId_series_key" ON "NumberSequence"("organizationId", "series");

-- CreateIndex
CREATE UNIQUE INDEX "MasterRecord_organizationId_catalog_code_key" ON "MasterRecord"("organizationId", "catalog", "code");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentSeries_organizationId_documentType_key" ON "DocumentSeries"("organizationId", "documentType");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarException_organizationId_date_key" ON "CalendarException"("organizationId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Template_organizationId_type_name_key" ON "Template"("organizationId", "type", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_key_key" ON "Agent"("key");

-- CreateIndex
CREATE UNIQUE INDEX "AiBudget_organizationId_key" ON "AiBudget"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "SemanticMetric_key_key" ON "SemanticMetric"("key");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessGlossary_term_key" ON "BusinessGlossary"("term");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_files" ADD CONSTRAINT "client_files_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_files" ADD CONSTRAINT "client_files_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_files" ADD CONSTRAINT "client_files_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_merge_logs" ADD CONSTRAINT "client_merge_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_merge_logs" ADD CONSTRAINT "client_merge_logs_survivingClientId_fkey" FOREIGN KEY ("survivingClientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_merge_logs" ADD CONSTRAINT "client_merge_logs_mergedById_fkey" FOREIGN KEY ("mergedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_parentQuoteId_fkey" FOREIGN KEY ("parentQuoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_tariffVersionId_fkey" FOREIGN KEY ("tariffVersionId") REFERENCES "TariffVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_catalogProductId_fkey" FOREIGN KEY ("catalogProductId") REFERENCES "CatalogProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_assistRunId_fkey" FOREIGN KEY ("assistRunId") REFERENCES "QuoteAssistRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogProduct" ADD CONSTRAINT "CatalogProduct_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ProductCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteHistory" ADD CONSTRAINT "QuoteHistory_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteHistory" ADD CONSTRAINT "QuoteHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceListVersion" ADD CONSTRAINT "PriceListVersion_priceListId_fkey" FOREIGN KEY ("priceListId") REFERENCES "PriceList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceListItem" ADD CONSTRAINT "PriceListItem_priceListVersionId_fkey" FOREIGN KEY ("priceListVersionId") REFERENCES "PriceListVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipeline_stages" ADD CONSTRAINT "pipeline_stages_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lost_reasons" ADD CONSTRAINT "lost_reasons_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "pipeline_stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_previousStageId_fkey" FOREIGN KEY ("previousStageId") REFERENCES "pipeline_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_lostReasonId_fkey" FOREIGN KEY ("lostReasonId") REFERENCES "lost_reasons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_transitions" ADD CONSTRAINT "stage_transitions_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_transitions" ADD CONSTRAINT "stage_transitions_fromStageId_fkey" FOREIGN KEY ("fromStageId") REFERENCES "pipeline_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_transitions" ADD CONSTRAINT "stage_transitions_toStageId_fkey" FOREIGN KEY ("toStageId") REFERENCES "pipeline_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_transitions" ADD CONSTRAINT "stage_transitions_movedById_fkey" FOREIGN KEY ("movedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parentTaskId_fkey" FOREIGN KEY ("parentTaskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_attendees" ADD CONSTRAINT "appointment_attendees_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_attendees" ADD CONSTRAINT "appointment_attendees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_attendees" ADD CONSTRAINT "appointment_attendees_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vea_meetings" ADD CONSTRAINT "vea_meetings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vea_meetings" ADD CONSTRAINT "vea_meetings_facilitatorId_fkey" FOREIGN KEY ("facilitatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vea_contributions" ADD CONSTRAINT "vea_contributions_veaMeetingId_fkey" FOREIGN KEY ("veaMeetingId") REFERENCES "vea_meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vea_contributions" ADD CONSTRAINT "vea_contributions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vea_evaluations" ADD CONSTRAINT "vea_evaluations_veaMeetingId_fkey" FOREIGN KEY ("veaMeetingId") REFERENCES "vea_meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vea_evaluations" ADD CONSTRAINT "vea_evaluations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vea_evaluations" ADD CONSTRAINT "vea_evaluations_evaluatedById_fkey" FOREIGN KEY ("evaluatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintPrice" ADD CONSTRAINT "PrintPrice_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "PrintCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintPrice" ADD CONSTRAINT "PrintPrice_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "PrintMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintPrice" ADD CONSTRAINT "PrintPrice_dimensionId_fkey" FOREIGN KEY ("dimensionId") REFERENCES "PrintDimension"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintPrice" ADD CONSTRAINT "PrintPrice_finishId_fkey" FOREIGN KEY ("finishId") REFERENCES "PrintFinish"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintOrderItem" ADD CONSTRAINT "PrintOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "PrintOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintOrderItem" ADD CONSTRAINT "PrintOrderItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "PrintCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintOrderItem" ADD CONSTRAINT "PrintOrderItem_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "PrintMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintOrderItem" ADD CONSTRAINT "PrintOrderItem_dimensionId_fkey" FOREIGN KEY ("dimensionId") REFERENCES "PrintDimension"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintOrderItem" ADD CONSTRAINT "PrintOrderItem_finishId_fkey" FOREIGN KEY ("finishId") REFERENCES "PrintFinish"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionProject" ADD CONSTRAINT "ProductionProject_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "ProductionStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAssignment" ADD CONSTRAINT "ProjectAssignment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ProductionProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAssignment" ADD CONSTRAINT "ProjectAssignment_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "ProductionRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityApproval" ADD CONSTRAINT "QualityApproval_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ProductionProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionTask" ADD CONSTRAINT "ProductionTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ProductionProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectComment" ADD CONSTRAINT "ProjectComment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ProductionProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryNote" ADD CONSTRAINT "DeliveryNote_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ProductionProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineProcess" ADD CONSTRAINT "MachineProcess_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineProcess" ADD CONSTRAINT "MachineProcess_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineUsageLog" ADD CONSTRAINT "MachineUsageLog_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineUsageLog" ADD CONSTRAINT "MachineUsageLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ProductionProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineUsageLog" ADD CONSTRAINT "MachineUsageLog_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ProductionTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ProductionProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ProductionTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceLog" ADD CONSTRAINT "MaintenanceLog_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KioskSession" ADD CONSTRAINT "KioskSession_kioskInstanceId_fkey" FOREIGN KEY ("kioskInstanceId") REFERENCES "KioskInstance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KioskHelpRequest" ADD CONSTRAINT "KioskHelpRequest_kioskInstanceId_fkey" FOREIGN KEY ("kioskInstanceId") REFERENCES "KioskInstance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KioskHelpRequest" ADD CONSTRAINT "KioskHelpRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ProductionProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhoneLine" ADD CONSTRAINT "PhoneLine_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhoneLine" ADD CONSTRAINT "PhoneLine_ivrMenuId_fkey" FOREIGN KEY ("ivrMenuId") REFERENCES "IvrMenu"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhoneLine" ADD CONSTRAINT "PhoneLine_ringGroupId_fkey" FOREIGN KEY ("ringGroupId") REFERENCES "RingGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallLog" ADD CONSTRAINT "CallLog_phoneLineId_fkey" FOREIGN KEY ("phoneLineId") REFERENCES "PhoneLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierRating" ADD CONSTRAINT "SupplierRating_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierRating" ADD CONSTRAINT "SupplierRating_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperInventory" ADD CONSTRAINT "PaperInventory_paperTypeId_fkey" FOREIGN KEY ("paperTypeId") REFERENCES "PaperType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperInventory" ADD CONSTRAINT "PaperInventory_paperSizeId_fkey" FOREIGN KEY ("paperSizeId") REFERENCES "PaperSize"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperLot" ADD CONSTRAINT "PaperLot_paperInventoryId_fkey" FOREIGN KEY ("paperInventoryId") REFERENCES "PaperInventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperLot" ADD CONSTRAINT "PaperLot_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperLot" ADD CONSTRAINT "PaperLot_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_paperLotId_fkey" FOREIGN KEY ("paperLotId") REFERENCES "PaperLot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_supplyId_fkey" FOREIGN KEY ("supplyId") REFERENCES "Supply"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reprocess" ADD CONSTRAINT "Reprocess_damageId_fkey" FOREIGN KEY ("damageId") REFERENCES "DamageRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemporaryWorkerLog" ADD CONSTRAINT "TemporaryWorkerLog_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "TemporaryWorker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreelancerPayment" ADD CONSTRAINT "FreelancerPayment_freelancerId_fkey" FOREIGN KEY ("freelancerId") REFERENCES "Freelancer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutsourcedCost" ADD CONSTRAINT "OutsourcedCost_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Handoff" ADD CONSTRAINT "Handoff_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SequenceStep" ADD CONSTRAINT "SequenceStep_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "Sequence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SequenceStep" ADD CONSTRAINT "SequenceStep_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "MessageTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SequenceEnrollment" ADD CONSTRAINT "SequenceEnrollment_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "Sequence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SequenceEnrollment" ADD CONSTRAINT "SequenceEnrollment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SequenceEnrollment" ADD CONSTRAINT "SequenceEnrollment_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StepExecution" ADD CONSTRAINT "StepExecution_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "SequenceEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeArticle" ADD CONSTRAINT "KnowledgeArticle_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "KnowledgeCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeChunk" ADD CONSTRAINT "KnowledgeChunk_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "KnowledgeArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperTariffItem" ADD CONSTRAINT "PaperTariffItem_tariffVersionId_fkey" FOREIGN KEY ("tariffVersionId") REFERENCES "TariffVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigitalFormatTariff" ADD CONSTRAINT "DigitalFormatTariff_tariffVersionId_fkey" FOREIGN KEY ("tariffVersionId") REFERENCES "TariffVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigitalVolumeTier" ADD CONSTRAINT "DigitalVolumeTier_digitalFormatTariffId_fkey" FOREIGN KEY ("digitalFormatTariffId") REFERENCES "DigitalFormatTariff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LithoFormatTariff" ADD CONSTRAINT "LithoFormatTariff_tariffVersionId_fkey" FOREIGN KEY ("tariffVersionId") REFERENCES "TariffVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SheetCut" ADD CONSTRAINT "SheetCut_tariffVersionId_fkey" FOREIGN KEY ("tariffVersionId") REFERENCES "TariffVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SheetCutSize" ADD CONSTRAINT "SheetCutSize_sheetCutId_fkey" FOREIGN KEY ("sheetCutId") REFERENCES "SheetCut"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InkSetTariff" ADD CONSTRAINT "InkSetTariff_tariffVersionId_fkey" FOREIGN KEY ("tariffVersionId") REFERENCES "TariffVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinishingTariff" ADD CONSTRAINT "FinishingTariff_tariffVersionId_fkey" FOREIGN KEY ("tariffVersionId") REFERENCES "TariffVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialTermTariff" ADD CONSTRAINT "CommercialTermTariff_tariffVersionId_fkey" FOREIGN KEY ("tariffVersionId") REFERENCES "TariffVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WideFormatTariff" ADD CONSTRAINT "WideFormatTariff_tariffVersionId_fkey" FOREIGN KEY ("tariffVersionId") REFERENCES "TariffVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteAssistRun" ADD CONSTRAINT "QuoteAssistRun_tariffVersionId_fkey" FOREIGN KEY ("tariffVersionId") REFERENCES "TariffVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_progress" ADD CONSTRAINT "goal_progress_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_audiences" ADD CONSTRAINT "announcement_audiences_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_receipts" ADD CONSTRAINT "announcement_receipts_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_comments" ADD CONSTRAINT "announcement_comments_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_comments" ADD CONSTRAINT "announcement_comments_parentCommentId_fkey" FOREIGN KEY ("parentCommentId") REFERENCES "announcement_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_reactions" ADD CONSTRAINT "announcement_reactions_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_members" ADD CONSTRAINT "chat_members_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "chat_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "chat_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_parentMessageId_fkey" FOREIGN KEY ("parentMessageId") REFERENCES "chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_reactions" ADD CONSTRAINT "chat_reactions_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_pins" ADD CONSTRAINT "chat_pins_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "chat_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_pins" ADD CONSTRAINT "chat_pins_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_participants" ADD CONSTRAINT "call_participants_callSessionId_fkey" FOREIGN KEY ("callSessionId") REFERENCES "call_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_invitations" ADD CONSTRAINT "call_invitations_callSessionId_fkey" FOREIGN KEY ("callSessionId") REFERENCES "call_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignRecipient" ADD CONSTRAINT "CampaignRecipient_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactIdentity" ADD CONSTRAINT "ContactIdentity_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactIdentity" ADD CONSTRAINT "ContactIdentity_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceNumber" ADD CONSTRAINT "VoiceNumber_trunkId_fkey" FOREIGN KEY ("trunkId") REFERENCES "VoiceTrunk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceCallEvent" ADD CONSTRAINT "VoiceCallEvent_callId_fkey" FOREIGN KEY ("callId") REFERENCES "VoiceCall"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceQueueMember" ADD CONSTRAINT "VoiceQueueMember_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "VoiceQueue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceCampaignContact" ADD CONSTRAINT "VoiceCampaignContact_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "VoiceCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataSubjectRequest" ADD CONSTRAINT "DataSubjectRequest_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataSubjectRequest" ADD CONSTRAINT "DataSubjectRequest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebchatConfig" ADD CONSTRAINT "WebchatConfig_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebchatSession" ADD CONSTRAINT "WebchatSession_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebchatSession" ADD CONSTRAINT "WebchatSession_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentShift" ADD CONSTRAINT "AgentShift_businessHoursId_fkey" FOREIGN KEY ("businessHoursId") REFERENCES "BusinessHours"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettingValue" ADD CONSTRAINT "SettingValue_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "SettingDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentPromptVersion" ADD CONSTRAINT "AgentPromptVersion_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentMemory" ADD CONSTRAINT "AgentMemory_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentTask" ADD CONSTRAINT "AgentTask_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentTask" ADD CONSTRAINT "AgentTask_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AgentRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SemanticField" ADD CONSTRAINT "SemanticField_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "SemanticEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

