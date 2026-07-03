import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handler, ok, Errors } from "@/lib/errors";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit, RateLimits } from "@/lib/rate-limit";

/**
 * GET /api/contests/:id/leaderboard — ranking by score (ties broken by
 * earlier submission). Public: guests can view.
 */
export const GET = handler(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const { id } = await ctx.params;
    const user = await getCurrentUser(req);
    rateLimit(req, "leaderboard", { ...RateLimits.read, userId: user?.id });

    const contest = await prisma.contest.findUnique({
      where: { id },
      select: { id: true, name: true, prize: true, endTime: true, finalized: true },
    });
    if (!contest) throw Errors.notFound("Contest not found.");

    const limit = Math.min(Number(req.nextUrl.searchParams.get("limit")) || 50, 100);

    const entries = await prisma.participation.findMany({
      where: { contestId: id, status: "SUBMITTED" },
      orderBy: [{ score: "desc" }, { submittedAt: "asc" }],
      take: limit,
      select: {
        score: true,
        submittedAt: true,
        user: { select: { id: true, name: true, role: true } },
      },
    });

    const leaderboard = entries.map((e, i) => ({
      rank: i + 1,
      userId: e.user.id,
      name: e.user.name,
      role: e.user.role,
      score: e.score,
      submittedAt: e.submittedAt,
      isYou: user?.id === e.user.id,
    }));

    return ok({ contest, leaderboard });
  }
);
