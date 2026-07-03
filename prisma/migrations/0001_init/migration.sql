-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'VIP', 'USER');

-- CreateEnum
CREATE TYPE "ContestAccess" AS ENUM ('NORMAL', 'VIP');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('SINGLE_SELECT', 'MULTI_SELECT', 'TRUE_FALSE');

-- CreateEnum
CREATE TYPE "ParticipationStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "accessLevel" "ContestAccess" NOT NULL DEFAULT 'NORMAL',
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "prize" TEXT NOT NULL,
    "finalized" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 1,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Option" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Option_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "status" "ParticipationStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "score" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),

    CONSTRAINT "Participation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Answer" (
    "id" TEXT NOT NULL,
    "participationId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "selectedOptionIds" JSONB NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Answer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prize" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "prizeName" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Prize_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "Contest_accessLevel_startTime_endTime_idx" ON "Contest"("accessLevel", "startTime", "endTime");

-- CreateIndex
CREATE INDEX "Question_contestId_idx" ON "Question"("contestId");

-- CreateIndex
CREATE INDEX "Option_questionId_idx" ON "Option"("questionId");

-- CreateIndex
CREATE INDEX "Participation_contestId_status_score_idx" ON "Participation"("contestId", "status", "score");

-- CreateIndex
CREATE INDEX "Participation_userId_status_idx" ON "Participation"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Participation_userId_contestId_key" ON "Participation"("userId", "contestId");

-- CreateIndex
CREATE UNIQUE INDEX "Answer_participationId_questionId_key" ON "Answer"("participationId", "questionId");

-- CreateIndex
CREATE INDEX "Prize_userId_idx" ON "Prize"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Prize_userId_contestId_key" ON "Prize"("userId", "contestId");

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Option" ADD CONSTRAINT "Option_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participation" ADD CONSTRAINT "Participation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participation" ADD CONSTRAINT "Participation_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_participationId_fkey" FOREIGN KEY ("participationId") REFERENCES "Participation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prize" ADD CONSTRAINT "Prize_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prize" ADD CONSTRAINT "Prize_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

