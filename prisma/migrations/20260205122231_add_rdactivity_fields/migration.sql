-- AlterTable
ALTER TABLE "RDActivity" ADD COLUMN     "aiGeneratedFields" TEXT[],
ADD COLUMN     "aiReviewHistory" JSONB,
ADD COLUMN     "anzsicCode" TEXT,
ADD COLUMN     "forCode" TEXT,
ADD COLUMN     "technicalUncertainty" TEXT;
