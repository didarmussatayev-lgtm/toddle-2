-- CreateEnum
CREATE TYPE "ProgrammeCode" AS ENUM ('MYP', 'DP');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('INVITED', 'ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('ru', 'kk', 'en');

-- CreateEnum
CREATE TYPE "RoleKey" AS ENUM ('SUPER_ADMIN', 'ACCOUNT_SUPERVISOR', 'IT_ADMIN', 'SCHOOL_ADMIN', 'PRINCIPAL', 'COORDINATOR', 'DEPUTY_HEAD', 'TEACHER', 'COMMUNICATIONS_MANAGER', 'ATTENDANCE_MANAGER', 'PROJECT_COORDINATOR', 'PROJECT_SUPERVISOR', 'HOMEROOM_ADVISOR', 'CAS_SUPERVISOR', 'STUDENT', 'GUARDIAN');

-- CreateEnum
CREATE TYPE "PeriodKind" AS ENUM ('REPORTING', 'CUMULATIVE');

-- CreateEnum
CREATE TYPE "CourseLevel" AS ENUM ('NONE', 'SL', 'HL');

-- CreateEnum
CREATE TYPE "GroupKind" AS ENUM ('YEAR_GROUP', 'HOMEROOM', 'SUBGROUP', 'CUSTOM');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'WITHDRAWN', 'COMPLETED');

-- CreateEnum
CREATE TYPE "DatasetKind" AS ENUM ('ATL', 'KEY_CONCEPT', 'RELATED_CONCEPT', 'GLOBAL_CONTEXT', 'LEARNER_PROFILE', 'STATEMENT_OF_INQUIRY_TEMPLATE', 'DP_AIM', 'DP_ASSESSMENT_OBJECTIVE', 'DP_SYLLABUS', 'STANDARD', 'CUSTOM');

-- CreateEnum
CREATE TYPE "UnitItemType" AS ENUM ('LEARNING_EXPERIENCE', 'FORMATIVE_ASSESSMENT', 'SUMMATIVE_ASSESSMENT', 'WORKSHEET', 'QUICK_TASK', 'NOTE', 'LINK', 'FOLDER');

-- CreateEnum
CREATE TYPE "AssignmentType" AS ENUM ('FORMATIVE', 'SUMMATIVE', 'LEARNING_EXPERIENCE', 'WORKSHEET', 'QUICK_TASK', 'VIDEO_MEETING');

-- CreateEnum
CREATE TYPE "PublishStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('NOT_SUBMITTED', 'SUBMITTED', 'LATE', 'RETURNED', 'MISSED_VALID', 'MISSED_INVALID');

-- CreateEnum
CREATE TYPE "EvaluationStatus" AS ENUM ('NOT_EVALUATED', 'DRAFT', 'EVALUATED', 'SHARED');

-- CreateEnum
CREATE TYPE "GradeScaleType" AS ENUM ('REGULAR', 'SPECIAL_CODES', 'DEPENDENT');

-- CreateEnum
CREATE TYPE "CriterionAggregation" AS ENUM ('MEAN_ROUND_HALF_UP', 'MODE', 'LATEST', 'HIGHEST', 'BEST_FIT');

-- CreateEnum
CREATE TYPE "AttendanceKind" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED', 'OLYMPIAD', 'OTHER');

-- CreateEnum
CREATE TYPE "ExcusalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ProjectKind" AS ENUM ('PERSONAL_PROJECT', 'COMMUNITY_PROJECT', 'SERVICE_AS_ACTION', 'CAS', 'EXTENDED_ESSAY', 'TOK_ESSAY', 'TOK_EXHIBITION', 'REFLECTIVE_PROJECT', 'COLLABORATIVE_SCIENCES', 'COMMUNITY_ENGAGEMENT', 'SERVICE_LEARNING');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED', 'NON_SUBMISSION');

-- CreateEnum
CREATE TYPE "CasStrand" AS ENUM ('CREATIVITY', 'ACTIVITY', 'SERVICE');

-- CreateEnum
CREATE TYPE "AssessmentComponentKind" AS ENUM ('INTERNAL', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "ConversationKind" AS ENUM ('DIRECT', 'GROUP');

-- CreateEnum
CREATE TYPE "AnnouncementStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'TRASHED');

-- CreateEnum
CREATE TYPE "RecipientScope" AS ENUM ('ALL_MEMBERS', 'STAFF', 'STUDENTS', 'FAMILY');

-- CreateEnum
CREATE TYPE "AudienceGroupType" AS ENUM ('SCHOOL', 'GRADE', 'CLASS', 'CUSTOM');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'PUSH');

-- CreateEnum
CREATE TYPE "PortfolioPostStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'IN_APPROVAL', 'PUBLISHED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReportKind" AS ENUM ('STATUS_REPORT', 'SEMESTER_REPORT', 'STUDENT_OVERVIEW', 'TRANSCRIPT', 'CERTIFICATE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "ExternalSource" AS ENUM ('TODDLE', 'EDUPAGE', 'ASC_TIMETABLES', 'GOOGLE');

-- CreateTable
CREATE TABLE "School" (
    "id" UUID NOT NULL,
    "name" JSONB NOT NULL,
    "code" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Almaty',
    "defaultLocale" "Locale" NOT NULL DEFAULT 'ru',
    "logoFileId" UUID,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Programme" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "code" "ProgrammeCode" NOT NULL,
    "name" JSONB NOT NULL,

    CONSTRAINT "Programme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolModuleToggle" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "programmeId" UUID,
    "moduleKey" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "visibleToStudents" BOOLEAN NOT NULL DEFAULT true,
    "visibleToFamily" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "SchoolModuleToggle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "middleName" TEXT,
    "preferredName" TEXT,
    "prefix" TEXT,
    "avatarFileId" UUID,
    "locale" "Locale" NOT NULL DEFAULT 'ru',
    "status" "UserStatus" NOT NULL DEFAULT 'INVITED',
    "signInCodeHash" TEXT,
    "uid" TEXT,
    "lastActiveAt" TIMESTAMP(3),
    "passwordHash" TEXT,
    "passwordChangedAt" TIMESTAMP(3),
    "failedLogins" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthAccount" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refreshToken" TEXT,
    "accessToken" TEXT,
    "expiresAt" INTEGER,
    "scope" TEXT,

    CONSTRAINT "AuthAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleAssignment" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "RoleKey" NOT NULL,
    "programmeId" UUID,
    "yearGroupId" UUID,
    "departmentId" UUID,
    "projectKind" "ProjectKind",
    "academicYearId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffProfile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "staffUid" TEXT,
    "displayTitle" TEXT,
    "departmentId" UUID,
    "phone" TEXT,

    CONSTRAINT "StaffProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentProfile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "studentUid" TEXT,
    "birthDate" DATE,
    "gender" TEXT,
    "enrolledAt" DATE,
    "graduatedAt" DATE,
    "extra" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuardianProfile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "phone" TEXT,

    CONSTRAINT "GuardianProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentGuardian" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "guardianId" UUID NOT NULL,
    "relation" TEXT,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "invitedAt" TIMESTAMP(3),
    "connectedAt" TIMESTAMP(3),

    CONSTRAINT "StudentGuardian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyInvite" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "email" TEXT,
    "codeHash" TEXT,
    "expiresAt" TIMESTAMP(3),
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamilyInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentAdvisor" (
    "id" UUID NOT NULL,
    "academicYearId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "staffId" UUID NOT NULL,

    CONSTRAINT "StudentAdvisor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentAccommodation" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "validFrom" DATE,
    "validTo" DATE,
    "orderNumber" TEXT,
    "documentFileId" UUID,
    "notes" TEXT,

    CONSTRAINT "StudentAccommodation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentFlag" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "note" TEXT,
    "expiresAt" TIMESTAMP(3),
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherNote" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeacherNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentFile" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "folder" TEXT,
    "fileId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileAsset" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "checksum" TEXT,
    "uploadedById" UUID,
    "scanStatus" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FileAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicYear" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AcademicYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradingPeriod" (
    "id" UUID NOT NULL,
    "academicYearId" UUID NOT NULL,
    "programmeId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT NOT NULL,
    "kind" "PeriodKind" NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "locked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "GradingPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeriodContribution" (
    "id" UUID NOT NULL,
    "parentId" UUID NOT NULL,
    "childId" UUID NOT NULL,
    "weight" DECIMAL(6,3) NOT NULL DEFAULT 1,

    CONSTRAINT "PeriodContribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YearGroup" (
    "id" UUID NOT NULL,
    "programmeId" UUID NOT NULL,
    "batchLabel" TEXT NOT NULL,
    "graduationYear" INTEGER NOT NULL,

    CONSTRAINT "YearGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YearGroupYear" (
    "id" UUID NOT NULL,
    "yearGroupId" UUID NOT NULL,
    "academicYearId" UUID NOT NULL,
    "gradeLabel" TEXT NOT NULL,
    "gradeNumber" INTEGER NOT NULL,

    CONSTRAINT "YearGroupYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "name" JSONB NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubjectGroup" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SubjectGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" UUID NOT NULL,
    "programmeId" UUID NOT NULL,
    "subjectGroupId" UUID,
    "name" JSONB NOT NULL,
    "ibCode" TEXT,
    "firstAssessment" INTEGER,
    "lastAssessment" INTEGER,
    "isCore" BOOLEAN NOT NULL DEFAULT false,
    "isLocal" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentGroup" (
    "id" UUID NOT NULL,
    "yearGroupId" UUID,
    "academicYearId" UUID NOT NULL,
    "kind" "GroupKind" NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "StudentGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupMember" (
    "groupId" UUID NOT NULL,
    "studentId" UUID NOT NULL,

    CONSTRAINT "GroupMember_pkey" PRIMARY KEY ("groupId","studentId")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "academicYearId" UUID NOT NULL,
    "programmeId" UUID NOT NULL,
    "subjectId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "classCode" TEXT,
    "level" "CourseLevel" NOT NULL DEFAULT 'NONE',
    "iconKey" TEXT,
    "color" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseGroup" (
    "courseId" UUID NOT NULL,
    "groupId" UUID NOT NULL,

    CONSTRAINT "CourseGroup_pkey" PRIMARY KEY ("courseId","groupId")
);

-- CreateTable
CREATE TABLE "CourseStaff" (
    "courseId" UUID NOT NULL,
    "staffId" UUID NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CourseStaff_pkey" PRIMARY KEY ("courseId","staffId")
);

-- CreateTable
CREATE TABLE "CourseEnrollment" (
    "courseId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "CourseEnrollment_pkey" PRIMARY KEY ("courseId","studentId")
);

-- CreateTable
CREATE TABLE "Criterion" (
    "id" UUID NOT NULL,
    "subjectId" UUID NOT NULL,
    "yearBand" INTEGER NOT NULL DEFAULT 0,
    "phase" TEXT,
    "code" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "maxLevel" INTEGER NOT NULL DEFAULT 8,

    CONSTRAINT "Criterion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CriterionStrand" (
    "id" UUID NOT NULL,
    "criterionId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "text" JSONB NOT NULL,

    CONSTRAINT "CriterionStrand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CriterionDescriptor" (
    "id" UUID NOT NULL,
    "criterionId" UUID NOT NULL,
    "levelFrom" INTEGER NOT NULL,
    "levelTo" INTEGER NOT NULL,
    "text" JSONB NOT NULL,

    CONSTRAINT "CriterionDescriptor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dataset" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "kind" "DatasetKind" NOT NULL,
    "name" JSONB NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Dataset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatasetItem" (
    "id" UUID NOT NULL,
    "datasetId" UUID NOT NULL,
    "parentId" UUID,
    "code" TEXT,
    "title" JSONB NOT NULL,
    "description" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DatasetItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubjectDatasetItem" (
    "subjectId" UUID NOT NULL,
    "datasetItemId" UUID NOT NULL,
    "level" "CourseLevel" NOT NULL DEFAULT 'NONE',

    CONSTRAINT "SubjectDatasetItem_pkey" PRIMARY KEY ("subjectId","datasetItemId","level")
);

-- CreateTable
CREATE TABLE "GradingPolicy" (
    "id" UUID NOT NULL,
    "programmeId" UUID NOT NULL,
    "academicYearId" UUID,
    "criterionAggregation" "CriterionAggregation" NOT NULL DEFAULT 'MEAN_ROUND_HALF_UP',
    "roundHalfUp" BOOLEAN NOT NULL DEFAULT true,
    "useCriteriaMethod" BOOLEAN NOT NULL DEFAULT true,
    "usePercentMethod" BOOLEAN NOT NULL DEFAULT true,
    "maxSummativePerDay" INTEGER NOT NULL DEFAULT 3,
    "oneCriterionOncePerPeriod" BOOLEAN NOT NULL DEFAULT true,
    "allowFormativeInFinal" BOOLEAN NOT NULL DEFAULT false,
    "annualWeights" JSONB NOT NULL DEFAULT '{"S1":0.5,"S2":0.5}',
    "examWeight" DECIMAL(4,3),
    "fiveScaleOnlyForFinal" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" DATE,

    CONSTRAINT "GradingPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradeBoundarySet" (
    "id" UUID NOT NULL,
    "policyId" UUID NOT NULL,
    "criteriaCount" INTEGER NOT NULL,

    CONSTRAINT "GradeBoundarySet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradeBoundary" (
    "id" UUID NOT NULL,
    "setId" UUID NOT NULL,
    "grade" INTEGER NOT NULL,
    "minTotal" INTEGER NOT NULL,
    "maxTotal" INTEGER NOT NULL,

    CONSTRAINT "GradeBoundary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PercentGradeBand" (
    "id" UUID NOT NULL,
    "policyId" UUID NOT NULL,
    "grade" INTEGER NOT NULL,
    "minPct" DECIMAL(5,2) NOT NULL,
    "maxPct" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "PercentGradeBand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradeScale" (
    "id" UUID NOT NULL,
    "programmeId" UUID,
    "code" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "type" "GradeScaleType" NOT NULL DEFAULT 'REGULAR',
    "minValue" DECIMAL(5,2),
    "maxValue" DECIMAL(5,2),
    "isAlpha" BOOLEAN NOT NULL DEFAULT false,
    "sourceScaleId" UUID,

    CONSTRAINT "GradeScale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradeScaleEntry" (
    "id" UUID NOT NULL,
    "scaleId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "numericValue" DECIMAL(5,2),
    "description" JSONB,
    "color" TEXT,
    "sortOrder" INTEGER NOT NULL,
    "sourceValues" INTEGER[],

    CONSTRAINT "GradeScaleEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinalGradeSetup" (
    "id" UUID NOT NULL,
    "subjectId" UUID NOT NULL,
    "gradeNumber" INTEGER NOT NULL,
    "periodId" UUID NOT NULL,
    "primaryScaleId" UUID NOT NULL,
    "additionalScaleIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "method" TEXT NOT NULL DEFAULT 'SCORE_BASED',

    CONSTRAINT "FinalGradeSetup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradingCategory" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" JSONB NOT NULL,

    CONSTRAINT "GradingCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryWeight" (
    "id" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "periodId" UUID NOT NULL,
    "courseId" UUID,
    "weight" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "CategoryWeight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseGradingSettings" (
    "courseId" UUID NOT NULL,
    "percentBands" JSONB,
    "enabledCriteria" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "visibility" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "CourseGradingSettings_pkey" PRIMARY KEY ("courseId")
);

-- CreateTable
CREATE TABLE "GradebookVisibilityRule" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "programmeId" UUID,
    "audience" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "settings" JSONB NOT NULL,

    CONSTRAINT "GradebookVisibilityRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlannerTemplate" (
    "id" UUID NOT NULL,
    "programmeId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "sections" JSONB NOT NULL,

    CONSTRAINT "PlannerTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "templateId" UUID NOT NULL,
    "title" JSONB,
    "startDate" DATE,
    "endDate" DATE,
    "hours" DECIMAL(6,2),
    "level" "CourseLevel" NOT NULL DEFAULT 'NONE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "content" JSONB NOT NULL DEFAULT '{}',
    "sharedWithStudents" BOOLEAN NOT NULL DEFAULT false,
    "fromLibraryId" UUID,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnitCollaborator" (
    "unitId" UUID NOT NULL,
    "staffId" UUID NOT NULL,

    CONSTRAINT "UnitCollaborator_pkey" PRIMARY KEY ("unitId","staffId")
);

-- CreateTable
CREATE TABLE "UnitDatasetItem" (
    "unitId" UUID NOT NULL,
    "datasetItemId" UUID NOT NULL,
    "field" TEXT NOT NULL,
    "note" TEXT,

    CONSTRAINT "UnitDatasetItem_pkey" PRIMARY KEY ("unitId","datasetItemId","field")
);

-- CreateTable
CREATE TABLE "UnitItem" (
    "id" UUID NOT NULL,
    "unitId" UUID NOT NULL,
    "parentId" UUID,
    "type" "UnitItemType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" JSONB,
    "url" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "assignmentId" UUID,

    CONSTRAINT "UnitItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnitReflection" (
    "id" UUID NOT NULL,
    "unitId" UUID NOT NULL,
    "phase" TEXT NOT NULL,
    "body" JSONB NOT NULL,
    "authorId" UUID NOT NULL,

    CONSTRAINT "UnitReflection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyPlanner" (
    "id" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "weekStart" DATE NOT NULL,
    "content" JSONB NOT NULL,

    CONSTRAINT "WeeklyPlanner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LibraryItem" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "refId" UUID NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LibraryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "type" "AssignmentType" NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" JSONB,
    "periodId" UUID,
    "categoryId" UUID,
    "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "publishAt" TIMESTAMP(3),
    "openAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "closeAt" TIMESTAMP(3),
    "submissionsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "maxScore" DECIMAL(8,2),
    "hideTotalFromStudents" BOOLEAN NOT NULL DEFAULT false,
    "isSummativeDate" BOOLEAN NOT NULL DEFAULT false,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentCriterion" (
    "assignmentId" UUID NOT NULL,
    "criterionId" UUID NOT NULL,
    "maxLevel" INTEGER NOT NULL DEFAULT 8,

    CONSTRAINT "AssignmentCriterion_pkey" PRIMARY KEY ("assignmentId","criterionId")
);

-- CreateTable
CREATE TABLE "AssignmentTarget" (
    "id" UUID NOT NULL,
    "assignmentId" UUID NOT NULL,
    "studentId" UUID,
    "groupId" UUID,
    "variant" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "AssignmentTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentAttachment" (
    "id" UUID NOT NULL,
    "assignmentId" UUID NOT NULL,
    "fileId" UUID,
    "url" TEXT,
    "title" TEXT,

    CONSTRAINT "AssignmentAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentDatasetItem" (
    "assignmentId" UUID NOT NULL,
    "datasetItemId" UUID NOT NULL,

    CONSTRAINT "AssignmentDatasetItem_pkey" PRIMARY KEY ("assignmentId","datasetItemId")
);

-- CreateTable
CREATE TABLE "AssessmentRubric" (
    "id" UUID NOT NULL,
    "assignmentId" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "definition" JSONB NOT NULL,

    CONSTRAINT "AssessmentRubric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" UUID NOT NULL,
    "assignmentId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
    "submittedAt" TIMESTAMP(3),
    "body" JSONB,
    "makeupUntil" TIMESTAMP(3),
    "absenceNote" TEXT,
    "absenceDocFileId" UUID,
    "similarityScore" DECIMAL(5,2),

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmissionFile" (
    "id" UUID NOT NULL,
    "submissionId" UUID NOT NULL,
    "fileId" UUID NOT NULL,

    CONSTRAINT "SubmissionFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evaluation" (
    "id" UUID NOT NULL,
    "assignmentId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "status" "EvaluationStatus" NOT NULL DEFAULT 'NOT_EVALUATED',
    "score" DECIMAL(8,2),
    "gradeLabel" TEXT,
    "comment" JSONB,
    "evaluatedById" UUID,
    "evaluatedAt" TIMESTAMP(3),
    "sharedAt" TIMESTAMP(3),

    CONSTRAINT "Evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CriterionEvaluation" (
    "evaluationId" UUID NOT NULL,
    "criterionId" UUID NOT NULL,
    "level" INTEGER,
    "comment" TEXT,

    CONSTRAINT "CriterionEvaluation_pkey" PRIMARY KEY ("evaluationId","criterionId")
);

-- CreateTable
CREATE TABLE "SubmissionComment" (
    "id" UUID NOT NULL,
    "submissionId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubmissionComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeriodGrade" (
    "id" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "periodId" UUID NOT NULL,
    "criteriaSum" INTEGER,
    "criteriaCount" INTEGER,
    "overallPct" DECIMAL(6,2),
    "grade7" INTEGER,
    "grade5" INTEGER,
    "gradeOverride7" INTEGER,
    "gradeOverride5" INTEGER,
    "overriddenById" UUID,
    "overriddenAt" TIMESTAMP(3),
    "published" BOOLEAN NOT NULL DEFAULT false,
    "calculatedAt" TIMESTAMP(3),

    CONSTRAINT "PeriodGrade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CriterionGrade" (
    "periodGradeId" UUID NOT NULL,
    "criterionId" UUID NOT NULL,
    "level" INTEGER,
    "overrideLevel" INTEGER,

    CONSTRAINT "CriterionGrade_pkey" PRIMARY KEY ("periodGradeId","criterionId")
);

-- CreateTable
CREATE TABLE "PredictedGrade" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "grade" INTEGER NOT NULL,
    "note" TEXT,
    "setById" UUID,
    "setAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PredictedGrade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgrammeResult" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "academicYearId" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "value" DECIMAL(6,2),
    "passed" BOOLEAN,
    "detail" JSONB,

    CONSTRAINT "ProgrammeResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimetablePeriod" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "isBreak" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "TimetablePeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BellSchedule" (
    "id" UUID NOT NULL,
    "academicYearId" UUID NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "BellSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BellSlot" (
    "id" UUID NOT NULL,
    "bellScheduleId" UUID NOT NULL,
    "periodId" UUID NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,

    CONSTRAINT "BellSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Routine" (
    "id" UUID NOT NULL,
    "academicYearId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "validFrom" DATE NOT NULL,
    "validTo" DATE NOT NULL,
    "cycleDays" INTEGER NOT NULL DEFAULT 5,
    "gradeNumbers" INTEGER[] DEFAULT ARRAY[]::INTEGER[],

    CONSTRAINT "Routine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutineDay" (
    "id" UUID NOT NULL,
    "routineId" UUID NOT NULL,
    "dayIndex" INTEGER NOT NULL,
    "bellScheduleId" UUID NOT NULL,

    CONSTRAINT "RoutineDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleDay" (
    "id" UUID NOT NULL,
    "academicYearId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "dayIndex" INTEGER,
    "bellScheduleId" UUID,
    "isNonWorking" BOOLEAN NOT NULL DEFAULT false,
    "label" TEXT,

    CONSTRAINT "ScheduleDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimetableEntry" (
    "id" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "slotId" UUID NOT NULL,
    "dayIndex" INTEGER NOT NULL,
    "room" TEXT,
    "teacherId" UUID,
    "validFrom" DATE NOT NULL,
    "validTo" DATE NOT NULL,
    "importId" UUID,

    CONSTRAINT "TimetableEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimetableImport" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "source" "ExternalSource" NOT NULL,
    "fileId" UUID,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "validFrom" DATE,
    "validTo" DATE,
    "stats" JSONB,
    "errors" JSONB,
    "importedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimetableImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceCode" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "kind" "AttendanceKind" NOT NULL,
    "countsAsPresent" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AttendanceCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceSession" (
    "id" UUID NOT NULL,
    "entryId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "markedById" UUID,
    "markedAt" TIMESTAMP(3),

    CONSTRAINT "AttendanceSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "sessionId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "codeId" UUID NOT NULL,
    "note" TEXT,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("sessionId","studentId")
);

-- CreateTable
CREATE TABLE "AttendanceTier" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "minPct" DECIMAL(5,2) NOT NULL,
    "maxPct" DECIMAL(5,2) NOT NULL,
    "color" TEXT,

    CONSTRAINT "AttendanceTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Excusal" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "fromDate" DATE NOT NULL,
    "toDate" DATE NOT NULL,
    "reason" TEXT,
    "fileId" UUID,
    "status" "ExcusalStatus" NOT NULL DEFAULT 'PENDING',
    "createdById" UUID NOT NULL,
    "decidedById" UUID,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "Excusal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "courseId" UUID,
    "authorId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" JSONB NOT NULL,
    "bannerFileId" UUID,
    "status" "AnnouncementStatus" NOT NULL DEFAULT 'DRAFT',
    "publishAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnnouncementRecipient" (
    "id" UUID NOT NULL,
    "announcementId" UUID NOT NULL,
    "scope" "RecipientScope" NOT NULL,
    "groupType" "AudienceGroupType" NOT NULL,
    "refId" UUID,

    CONSTRAINT "AnnouncementRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnnouncementAttachment" (
    "id" UUID NOT NULL,
    "announcementId" UUID NOT NULL,
    "fileId" UUID,
    "url" TEXT,

    CONSTRAINT "AnnouncementAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "kind" "ConversationKind" NOT NULL DEFAULT 'DIRECT',
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationParticipant" (
    "conversationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "lastReadAt" TIMESTAMP(3),

    CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY ("conversationId","userId")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "senderId" UUID NOT NULL,
    "body" TEXT,
    "audioFileId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageAttachment" (
    "id" UUID NOT NULL,
    "messageId" UUID NOT NULL,
    "fileId" UUID NOT NULL,

    CONSTRAINT "MessageAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioPost" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "courseId" UUID,
    "authorId" UUID NOT NULL,
    "status" "PortfolioPostStatus" NOT NULL DEFAULT 'DRAFT',
    "body" JSONB,
    "mediaType" TEXT,
    "publishAt" TIMESTAMP(3),
    "approvedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioMedia" (
    "id" UUID NOT NULL,
    "postId" UUID NOT NULL,
    "fileId" UUID,
    "url" TEXT,

    CONSTRAINT "PortfolioMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioTag" (
    "postId" UUID NOT NULL,
    "datasetItemId" UUID NOT NULL,

    CONSTRAINT "PortfolioTag_pkey" PRIMARY KEY ("postId","datasetItemId")
);

-- CreateTable
CREATE TABLE "PortfolioComment" (
    "id" UUID NOT NULL,
    "postId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "body" TEXT NOT NULL,

    CONSTRAINT "PortfolioComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassDriveItem" (
    "id" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "parentId" UUID,
    "name" TEXT NOT NULL,
    "fileId" UUID,
    "isFolder" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ClassDriveItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolDocument" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "parentId" UUID,
    "title" JSONB NOT NULL,
    "fileId" UUID,
    "isFolder" BOOLEAN NOT NULL DEFAULT false,
    "audience" "RoleKey"[],

    CONSTRAINT "SchoolDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "academicYearId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "courseId" UUID,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationRule" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "audience" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "channels" "NotificationChannel"[],
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "NotificationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "userId" UUID NOT NULL,
    "trigger" TEXT NOT NULL,
    "channels" "NotificationChannel"[],

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("userId","trigger")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "recipientId" UUID NOT NULL,
    "trigger" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "entityType" TEXT,
    "entityId" UUID,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationDelivery" (
    "id" UUID NOT NULL,
    "notificationId" UUID NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectGroup" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "academicYearId" UUID NOT NULL,
    "yearGroupId" UUID NOT NULL,
    "kind" "ProjectKind" NOT NULL,
    "settings" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "ProjectGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectCoordinator" (
    "groupId" UUID NOT NULL,
    "staffId" UUID NOT NULL,

    CONSTRAINT "ProjectCoordinator_pkey" PRIMARY KEY ("groupId","staffId")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" UUID NOT NULL,
    "groupId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "supervisorId" UUID,
    "adviserId" UUID,
    "title" TEXT,
    "subjectId" UUID,
    "researchQuestion" TEXT,
    "iaPrompt" TEXT,
    "theme" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "marks" JSONB,
    "grade" TEXT,
    "supervisionHours" DECIMAL(6,2),
    "academicHonestyFormFileId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMeeting" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "index" INTEGER NOT NULL,
    "heldAt" TIMESTAMP(3),
    "notes" JSONB,
    "lockedAt" TIMESTAMP(3),

    CONSTRAINT "ProjectMeeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectDeadline" (
    "id" UUID NOT NULL,
    "groupId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "openAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "closeAt" TIMESTAMP(3),

    CONSTRAINT "ProjectDeadline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectSubmission" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "deadlineId" UUID NOT NULL,
    "fileId" UUID,
    "submittedAt" TIMESTAMP(3),
    "similarityScore" DECIMAL(5,2),

    CONSTRAINT "ProjectSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectReflection" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "body" JSONB NOT NULL,
    "lockedAt" TIMESTAMP(3),

    CONSTRAINT "ProjectReflection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CasPortfolio" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "adviserId" UUID,

    CONSTRAINT "CasPortfolio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CasExperience" (
    "id" UUID NOT NULL,
    "portfolioId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "strands" "CasStrand"[],
    "isProject" BOOLEAN NOT NULL DEFAULT false,
    "startDate" DATE,
    "endDate" DATE,
    "hours" DECIMAL(6,2),
    "supervisorId" UUID,
    "status" TEXT,

    CONSTRAINT "CasExperience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CasEvidence" (
    "id" UUID NOT NULL,
    "experienceId" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "body" JSONB,
    "fileId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),

    CONSTRAINT "CasEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CasOutcomeAchievement" (
    "id" UUID NOT NULL,
    "portfolioId" UUID NOT NULL,
    "outcomeNo" INTEGER NOT NULL,
    "experienceId" UUID,
    "achievedAt" TIMESTAMP(3),

    CONSTRAINT "CasOutcomeAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CasInterview" (
    "id" UUID NOT NULL,
    "portfolioId" UUID NOT NULL,
    "index" INTEGER NOT NULL,
    "heldAt" TIMESTAMP(3),
    "notes" JSONB,
    "lockedAt" TIMESTAMP(3),

    CONSTRAINT "CasInterview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentComponent" (
    "id" UUID NOT NULL,
    "subjectId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "AssessmentComponentKind" NOT NULL,

    CONSTRAINT "AssessmentComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentComponentProgress" (
    "componentId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "note" TEXT,

    CONSTRAINT "StudentComponentProgress_pkey" PRIMARY KEY ("componentId","studentId")
);

-- CreateTable
CREATE TABLE "IbisRegistration" (
    "id" UUID NOT NULL,
    "yearGroupId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "session" TEXT,
    "data" JSONB,

    CONSTRAINT "IbisRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportTemplate" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "kind" "ReportKind" NOT NULL,
    "name" JSONB NOT NULL,
    "layout" JSONB NOT NULL,

    CONSTRAINT "ReportTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommentBankItem" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "category" TEXT,
    "text" JSONB NOT NULL,

    CONSTRAINT "CommentBankItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgressReport" (
    "id" UUID NOT NULL,
    "templateId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "periodId" UUID,
    "kind" "ReportKind" NOT NULL,
    "data" JSONB NOT NULL,
    "comments" JSONB,
    "fileId" UUID,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgressReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceThreshold" (
    "id" UUID NOT NULL,
    "programmeId" UUID NOT NULL,
    "metric" TEXT NOT NULL,
    "value" DECIMAL(6,2) NOT NULL,

    CONSTRAINT "PerformanceThreshold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalRef" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "source" "ExternalSource" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" UUID NOT NULL,
    "externalId" TEXT NOT NULL,
    "meta" JSONB,

    CONSTRAINT "ExternalRef_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncJob" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "source" "ExternalSource" NOT NULL,
    "direction" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "payloadFileId" UUID,
    "stats" JSONB,
    "errors" JSONB,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "SyncJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiGeneration" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "purpose" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptHash" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "accepted" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "actorId" UUID,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "School_code_key" ON "School"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Programme_schoolId_code_key" ON "Programme"("schoolId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolModuleToggle_schoolId_programmeId_moduleKey_key" ON "SchoolModuleToggle"("schoolId", "programmeId", "moduleKey");

-- CreateIndex
CREATE INDEX "User_schoolId_status_idx" ON "User"("schoolId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "User_schoolId_email_key" ON "User"("schoolId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "User_schoolId_uid_key" ON "User"("schoolId", "uid");

-- CreateIndex
CREATE UNIQUE INDEX "AuthAccount_provider_providerAccountId_key" ON "AuthAccount"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_sessionToken_key" ON "AuthSession"("sessionToken");

-- CreateIndex
CREATE INDEX "AuthSession_userId_idx" ON "AuthSession"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LoginToken_tokenHash_key" ON "LoginToken"("tokenHash");

-- CreateIndex
CREATE INDEX "LoginToken_userId_idx" ON "LoginToken"("userId");

-- CreateIndex
CREATE INDEX "RoleAssignment_userId_idx" ON "RoleAssignment"("userId");

-- CreateIndex
CREATE INDEX "RoleAssignment_role_programmeId_idx" ON "RoleAssignment"("role", "programmeId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffProfile_userId_key" ON "StaffProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_userId_key" ON "StudentProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GuardianProfile_userId_key" ON "GuardianProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentGuardian_studentId_guardianId_key" ON "StudentGuardian"("studentId", "guardianId");

-- CreateIndex
CREATE INDEX "FamilyInvite_schoolId_studentId_idx" ON "FamilyInvite"("schoolId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentAdvisor_academicYearId_studentId_staffId_key" ON "StudentAdvisor"("academicYearId", "studentId", "staffId");

-- CreateIndex
CREATE UNIQUE INDEX "FileAsset_storageKey_key" ON "FileAsset"("storageKey");

-- CreateIndex
CREATE INDEX "FileAsset_schoolId_uploadedById_idx" ON "FileAsset"("schoolId", "uploadedById");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicYear_schoolId_name_key" ON "AcademicYear"("schoolId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "GradingPeriod_academicYearId_programmeId_abbreviation_key" ON "GradingPeriod"("academicYearId", "programmeId", "abbreviation");

-- CreateIndex
CREATE UNIQUE INDEX "PeriodContribution_parentId_childId_key" ON "PeriodContribution"("parentId", "childId");

-- CreateIndex
CREATE UNIQUE INDEX "YearGroup_programmeId_graduationYear_key" ON "YearGroup"("programmeId", "graduationYear");

-- CreateIndex
CREATE UNIQUE INDEX "YearGroupYear_yearGroupId_academicYearId_key" ON "YearGroupYear"("yearGroupId", "academicYearId");

-- CreateIndex
CREATE UNIQUE INDEX "SubjectGroup_schoolId_code_key" ON "SubjectGroup"("schoolId", "code");

-- CreateIndex
CREATE INDEX "Subject_programmeId_idx" ON "Subject"("programmeId");

-- CreateIndex
CREATE INDEX "StudentGroup_academicYearId_kind_idx" ON "StudentGroup"("academicYearId", "kind");

-- CreateIndex
CREATE INDEX "Course_schoolId_academicYearId_idx" ON "Course"("schoolId", "academicYearId");

-- CreateIndex
CREATE INDEX "Course_subjectId_idx" ON "Course"("subjectId");

-- CreateIndex
CREATE INDEX "CourseEnrollment_studentId_idx" ON "CourseEnrollment"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "Criterion_subjectId_yearBand_phase_code_key" ON "Criterion"("subjectId", "yearBand", "phase", "code");

-- CreateIndex
CREATE UNIQUE INDEX "GradeBoundarySet_policyId_criteriaCount_key" ON "GradeBoundarySet"("policyId", "criteriaCount");

-- CreateIndex
CREATE UNIQUE INDEX "GradeBoundary_setId_grade_key" ON "GradeBoundary"("setId", "grade");

-- CreateIndex
CREATE UNIQUE INDEX "PercentGradeBand_policyId_grade_key" ON "PercentGradeBand"("policyId", "grade");

-- CreateIndex
CREATE UNIQUE INDEX "GradeScale_programmeId_code_key" ON "GradeScale"("programmeId", "code");

-- CreateIndex
CREATE INDEX "GradeScaleEntry_scaleId_idx" ON "GradeScaleEntry"("scaleId");

-- CreateIndex
CREATE UNIQUE INDEX "FinalGradeSetup_subjectId_gradeNumber_periodId_key" ON "FinalGradeSetup"("subjectId", "gradeNumber", "periodId");

-- CreateIndex
CREATE UNIQUE INDEX "GradingCategory_schoolId_code_key" ON "GradingCategory"("schoolId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryWeight_categoryId_periodId_courseId_key" ON "CategoryWeight"("categoryId", "periodId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "GradebookVisibilityRule_schoolId_programmeId_audience_scope_key" ON "GradebookVisibilityRule"("schoolId", "programmeId", "audience", "scope");

-- CreateIndex
CREATE INDEX "Unit_courseId_sortOrder_idx" ON "Unit"("courseId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "UnitItem_assignmentId_key" ON "UnitItem"("assignmentId");

-- CreateIndex
CREATE INDEX "LibraryItem_schoolId_kind_idx" ON "LibraryItem"("schoolId", "kind");

-- CreateIndex
CREATE INDEX "Assignment_courseId_dueAt_idx" ON "Assignment"("courseId", "dueAt");

-- CreateIndex
CREATE INDEX "Assignment_periodId_categoryId_idx" ON "Assignment"("periodId", "categoryId");

-- CreateIndex
CREATE INDEX "Assignment_dueAt_idx" ON "Assignment"("dueAt");

-- CreateIndex
CREATE INDEX "AssignmentTarget_assignmentId_idx" ON "AssignmentTarget"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentRubric_assignmentId_key" ON "AssessmentRubric"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_assignmentId_studentId_key" ON "Submission"("assignmentId", "studentId");

-- CreateIndex
CREATE INDEX "Evaluation_studentId_idx" ON "Evaluation"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "Evaluation_assignmentId_studentId_key" ON "Evaluation"("assignmentId", "studentId");

-- CreateIndex
CREATE INDEX "SubmissionComment_submissionId_idx" ON "SubmissionComment"("submissionId");

-- CreateIndex
CREATE INDEX "PeriodGrade_studentId_periodId_idx" ON "PeriodGrade"("studentId", "periodId");

-- CreateIndex
CREATE INDEX "PeriodGrade_periodId_idx" ON "PeriodGrade"("periodId");

-- CreateIndex
CREATE UNIQUE INDEX "PeriodGrade_courseId_studentId_periodId_key" ON "PeriodGrade"("courseId", "studentId", "periodId");

-- CreateIndex
CREATE INDEX "PredictedGrade_studentId_courseId_idx" ON "PredictedGrade"("studentId", "courseId");

-- CreateIndex
CREATE INDEX "ProgrammeResult_studentId_kind_idx" ON "ProgrammeResult"("studentId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "BellSlot_bellScheduleId_periodId_key" ON "BellSlot"("bellScheduleId", "periodId");

-- CreateIndex
CREATE UNIQUE INDEX "RoutineDay_routineId_dayIndex_key" ON "RoutineDay"("routineId", "dayIndex");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleDay_academicYearId_date_key" ON "ScheduleDay"("academicYearId", "date");

-- CreateIndex
CREATE INDEX "TimetableEntry_courseId_idx" ON "TimetableEntry"("courseId");

-- CreateIndex
CREATE INDEX "TimetableEntry_dayIndex_slotId_idx" ON "TimetableEntry"("dayIndex", "slotId");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceCode_schoolId_code_key" ON "AttendanceCode"("schoolId", "code");

-- CreateIndex
CREATE INDEX "AttendanceSession_date_idx" ON "AttendanceSession"("date");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceSession_entryId_date_key" ON "AttendanceSession"("entryId", "date");

-- CreateIndex
CREATE INDEX "AttendanceRecord_studentId_idx" ON "AttendanceRecord"("studentId");

-- CreateIndex
CREATE INDEX "Excusal_studentId_status_idx" ON "Excusal"("studentId", "status");

-- CreateIndex
CREATE INDEX "Announcement_schoolId_status_idx" ON "Announcement"("schoolId", "status");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "PortfolioPost_studentId_status_idx" ON "PortfolioPost"("studentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationRule_schoolId_audience_trigger_key" ON "NotificationRule"("schoolId", "audience", "trigger");

-- CreateIndex
CREATE INDEX "Notification_recipientId_readAt_idx" ON "Notification"("recipientId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectGroup_academicYearId_yearGroupId_kind_key" ON "ProjectGroup"("academicYearId", "yearGroupId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "Project_groupId_studentId_key" ON "Project"("groupId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectSubmission_projectId_deadlineId_key" ON "ProjectSubmission"("projectId", "deadlineId");

-- CreateIndex
CREATE UNIQUE INDEX "CasPortfolio_studentId_key" ON "CasPortfolio"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "CasOutcomeAchievement_portfolioId_outcomeNo_key" ON "CasOutcomeAchievement"("portfolioId", "outcomeNo");

-- CreateIndex
CREATE UNIQUE INDEX "IbisRegistration_yearGroupId_studentId_key" ON "IbisRegistration"("yearGroupId", "studentId");

-- CreateIndex
CREATE INDEX "ProgressReport_studentId_kind_idx" ON "ProgressReport"("studentId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "PerformanceThreshold_programmeId_metric_key" ON "PerformanceThreshold"("programmeId", "metric");

-- CreateIndex
CREATE INDEX "ExternalRef_entityType_entityId_idx" ON "ExternalRef"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalRef_source_entityType_externalId_key" ON "ExternalRef"("source", "entityType", "externalId");

-- CreateIndex
CREATE INDEX "AiGeneration_schoolId_userId_createdAt_idx" ON "AiGeneration"("schoolId", "userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_schoolId_entityType_createdAt_idx" ON "AuditLog"("schoolId", "entityType", "createdAt");

-- AddForeignKey
ALTER TABLE "Programme" ADD CONSTRAINT "Programme_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolModuleToggle" ADD CONSTRAINT "SchoolModuleToggle_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthAccount" ADD CONSTRAINT "AuthAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoginToken" ADD CONSTRAINT "LoginToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleAssignment" ADD CONSTRAINT "RoleAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleAssignment" ADD CONSTRAINT "RoleAssignment_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "Programme"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffProfile" ADD CONSTRAINT "StaffProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffProfile" ADD CONSTRAINT "StaffProfile_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardianProfile" ADD CONSTRAINT "GuardianProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentGuardian" ADD CONSTRAINT "StudentGuardian_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentGuardian" ADD CONSTRAINT "StudentGuardian_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "GuardianProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAdvisor" ADD CONSTRAINT "StudentAdvisor_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAdvisor" ADD CONSTRAINT "StudentAdvisor_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "StaffProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAdvisor" ADD CONSTRAINT "StudentAdvisor_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAccommodation" ADD CONSTRAINT "StudentAccommodation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFlag" ADD CONSTRAINT "StudentFlag_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherNote" ADD CONSTRAINT "TeacherNote_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFile" ADD CONSTRAINT "StudentFile_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileAsset" ADD CONSTRAINT "FileAsset_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicYear" ADD CONSTRAINT "AcademicYear_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradingPeriod" ADD CONSTRAINT "GradingPeriod_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradingPeriod" ADD CONSTRAINT "GradingPeriod_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "Programme"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeriodContribution" ADD CONSTRAINT "PeriodContribution_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "GradingPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeriodContribution" ADD CONSTRAINT "PeriodContribution_childId_fkey" FOREIGN KEY ("childId") REFERENCES "GradingPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YearGroup" ADD CONSTRAINT "YearGroup_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "Programme"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YearGroupYear" ADD CONSTRAINT "YearGroupYear_yearGroupId_fkey" FOREIGN KEY ("yearGroupId") REFERENCES "YearGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YearGroupYear" ADD CONSTRAINT "YearGroupYear_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectGroup" ADD CONSTRAINT "SubjectGroup_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "Programme"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_subjectGroupId_fkey" FOREIGN KEY ("subjectGroupId") REFERENCES "SubjectGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentGroup" ADD CONSTRAINT "StudentGroup_yearGroupId_fkey" FOREIGN KEY ("yearGroupId") REFERENCES "YearGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "StudentGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "Programme"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseGroup" ADD CONSTRAINT "CourseGroup_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseGroup" ADD CONSTRAINT "CourseGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "StudentGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseStaff" ADD CONSTRAINT "CourseStaff_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseStaff" ADD CONSTRAINT "CourseStaff_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "StaffProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseEnrollment" ADD CONSTRAINT "CourseEnrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseEnrollment" ADD CONSTRAINT "CourseEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Criterion" ADD CONSTRAINT "Criterion_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CriterionStrand" ADD CONSTRAINT "CriterionStrand_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "Criterion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CriterionDescriptor" ADD CONSTRAINT "CriterionDescriptor_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "Criterion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatasetItem" ADD CONSTRAINT "DatasetItem_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatasetItem" ADD CONSTRAINT "DatasetItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "DatasetItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectDatasetItem" ADD CONSTRAINT "SubjectDatasetItem_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectDatasetItem" ADD CONSTRAINT "SubjectDatasetItem_datasetItemId_fkey" FOREIGN KEY ("datasetItemId") REFERENCES "DatasetItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradingPolicy" ADD CONSTRAINT "GradingPolicy_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "Programme"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeBoundarySet" ADD CONSTRAINT "GradeBoundarySet_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "GradingPolicy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeBoundary" ADD CONSTRAINT "GradeBoundary_setId_fkey" FOREIGN KEY ("setId") REFERENCES "GradeBoundarySet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PercentGradeBand" ADD CONSTRAINT "PercentGradeBand_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "GradingPolicy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeScale" ADD CONSTRAINT "GradeScale_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "Programme"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeScale" ADD CONSTRAINT "GradeScale_sourceScaleId_fkey" FOREIGN KEY ("sourceScaleId") REFERENCES "GradeScale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeScaleEntry" ADD CONSTRAINT "GradeScaleEntry_scaleId_fkey" FOREIGN KEY ("scaleId") REFERENCES "GradeScale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinalGradeSetup" ADD CONSTRAINT "FinalGradeSetup_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinalGradeSetup" ADD CONSTRAINT "FinalGradeSetup_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "GradingPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinalGradeSetup" ADD CONSTRAINT "FinalGradeSetup_primaryScaleId_fkey" FOREIGN KEY ("primaryScaleId") REFERENCES "GradeScale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryWeight" ADD CONSTRAINT "CategoryWeight_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "GradingCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryWeight" ADD CONSTRAINT "CategoryWeight_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "GradingPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseGradingSettings" ADD CONSTRAINT "CourseGradingSettings_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannerTemplate" ADD CONSTRAINT "PlannerTemplate_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "Programme"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PlannerTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitCollaborator" ADD CONSTRAINT "UnitCollaborator_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitDatasetItem" ADD CONSTRAINT "UnitDatasetItem_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitDatasetItem" ADD CONSTRAINT "UnitDatasetItem_datasetItemId_fkey" FOREIGN KEY ("datasetItemId") REFERENCES "DatasetItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitItem" ADD CONSTRAINT "UnitItem_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitItem" ADD CONSTRAINT "UnitItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "UnitItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitItem" ADD CONSTRAINT "UnitItem_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitReflection" ADD CONSTRAINT "UnitReflection_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyPlanner" ADD CONSTRAINT "WeeklyPlanner_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "GradingPeriod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "GradingCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentCriterion" ADD CONSTRAINT "AssignmentCriterion_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentCriterion" ADD CONSTRAINT "AssignmentCriterion_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "Criterion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentTarget" ADD CONSTRAINT "AssignmentTarget_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentAttachment" ADD CONSTRAINT "AssignmentAttachment_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentDatasetItem" ADD CONSTRAINT "AssignmentDatasetItem_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentDatasetItem" ADD CONSTRAINT "AssignmentDatasetItem_datasetItemId_fkey" FOREIGN KEY ("datasetItemId") REFERENCES "DatasetItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentRubric" ADD CONSTRAINT "AssessmentRubric_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionFile" ADD CONSTRAINT "SubmissionFile_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CriterionEvaluation" ADD CONSTRAINT "CriterionEvaluation_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "Evaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CriterionEvaluation" ADD CONSTRAINT "CriterionEvaluation_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "Criterion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeriodGrade" ADD CONSTRAINT "PeriodGrade_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeriodGrade" ADD CONSTRAINT "PeriodGrade_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeriodGrade" ADD CONSTRAINT "PeriodGrade_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "GradingPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CriterionGrade" ADD CONSTRAINT "CriterionGrade_periodGradeId_fkey" FOREIGN KEY ("periodGradeId") REFERENCES "PeriodGrade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CriterionGrade" ADD CONSTRAINT "CriterionGrade_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "Criterion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PredictedGrade" ADD CONSTRAINT "PredictedGrade_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PredictedGrade" ADD CONSTRAINT "PredictedGrade_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BellSchedule" ADD CONSTRAINT "BellSchedule_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BellSlot" ADD CONSTRAINT "BellSlot_bellScheduleId_fkey" FOREIGN KEY ("bellScheduleId") REFERENCES "BellSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BellSlot" ADD CONSTRAINT "BellSlot_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "TimetablePeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Routine" ADD CONSTRAINT "Routine_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineDay" ADD CONSTRAINT "RoutineDay_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "Routine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineDay" ADD CONSTRAINT "RoutineDay_bellScheduleId_fkey" FOREIGN KEY ("bellScheduleId") REFERENCES "BellSchedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleDay" ADD CONSTRAINT "ScheduleDay_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleDay" ADD CONSTRAINT "ScheduleDay_bellScheduleId_fkey" FOREIGN KEY ("bellScheduleId") REFERENCES "BellSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableEntry" ADD CONSTRAINT "TimetableEntry_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableEntry" ADD CONSTRAINT "TimetableEntry_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "BellSlot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceSession" ADD CONSTRAINT "AttendanceSession_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "TimetableEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AttendanceSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES "AttendanceCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Excusal" ADD CONSTRAINT "Excusal_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementRecipient" ADD CONSTRAINT "AnnouncementRecipient_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementAttachment" ADD CONSTRAINT "AnnouncementAttachment_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageAttachment" ADD CONSTRAINT "MessageAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioPost" ADD CONSTRAINT "PortfolioPost_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioMedia" ADD CONSTRAINT "PortfolioMedia_postId_fkey" FOREIGN KEY ("postId") REFERENCES "PortfolioPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioTag" ADD CONSTRAINT "PortfolioTag_postId_fkey" FOREIGN KEY ("postId") REFERENCES "PortfolioPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioComment" ADD CONSTRAINT "PortfolioComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "PortfolioPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassDriveItem" ADD CONSTRAINT "ClassDriveItem_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassDriveItem" ADD CONSTRAINT "ClassDriveItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ClassDriveItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCoordinator" ADD CONSTRAINT "ProjectCoordinator_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ProjectGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ProjectGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMeeting" ADD CONSTRAINT "ProjectMeeting_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDeadline" ADD CONSTRAINT "ProjectDeadline_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ProjectGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSubmission" ADD CONSTRAINT "ProjectSubmission_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSubmission" ADD CONSTRAINT "ProjectSubmission_deadlineId_fkey" FOREIGN KEY ("deadlineId") REFERENCES "ProjectDeadline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectReflection" ADD CONSTRAINT "ProjectReflection_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CasPortfolio" ADD CONSTRAINT "CasPortfolio_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CasExperience" ADD CONSTRAINT "CasExperience_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "CasPortfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CasEvidence" ADD CONSTRAINT "CasEvidence_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "CasExperience"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CasOutcomeAchievement" ADD CONSTRAINT "CasOutcomeAchievement_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "CasPortfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CasInterview" ADD CONSTRAINT "CasInterview_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "CasPortfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentComponent" ADD CONSTRAINT "AssessmentComponent_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentComponentProgress" ADD CONSTRAINT "StudentComponentProgress_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "AssessmentComponent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentComponentProgress" ADD CONSTRAINT "StudentComponentProgress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressReport" ADD CONSTRAINT "ProgressReport_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ReportTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressReport" ADD CONSTRAINT "ProgressReport_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressReport" ADD CONSTRAINT "ProgressReport_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "GradingPeriod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

