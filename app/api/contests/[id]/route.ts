import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handler, ok, Errors } from "@/lib/errors";
import { getCurrentUser, canAccessContest } from "@/lib/auth";
import { rateLimit, RateLimits } from "@/lib/rate-limit";

/**
 * GET /api/contests/:id — contest details.
 * Everyone (including guests) can view basic details.
 * Questions are included only for users who joined the contest — and the
 * correct answers are never exposed.
 */
export const GET = handler(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const { id } = await ctx.params;
    const user = await getCurrentUser(req);
    rateLimit(req, "contests:detail", { ...RateLimits.read, userId: user?.id });

    const contest = await prisma.contest.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        accessLevel: true,
        startTime: true,
        endTime: true,
        prize: true,
        finalized: true,
        _count: { select: { questions: true, participations: true } },
      },
    });
    if (!contest) throw Errors.notFound("Contest not found.");

    const now = new Date();
    const status = now < contest.startTime ? "UPCOMING" : now > contest.endTime ? "ENDED" : "ACTIVE";
    const canParticipate = canAccessContest(user, contest.accessLevel) && status === "ACTIVE";

    let participation = null;
    let questions: unknown = null;

    if (user) {
      participation = await prisma.participation.findUnique({
        where: { userId_contestId: { userId: user.id, contestId: id } },
        select: { id: true, status: true, score: true, startedAt: true, submittedAt: true },
      });

      // Questions are visible once the user has joined (options without isCorrect).
      if (participation && canAccessContest(user, contest.accessLevel)) {
        questions = await prisma.question.findMany({
          where: { contestId: id },
          orderBy: { order: "asc" },
          select: {
            id: true,
            text: true,
            type: true,
            points: true,
            options: { select: { id: true, text: true } },
          },
        });
      }
    }

    return ok({
      contest: {
        ...contest,
        questionCount: contest._count.questions,
        participantCount: contest._count.participations,
        _count: undefined,
        status,
        canParticipate,
      },
      participation,
      questions,
    });
  }
);
