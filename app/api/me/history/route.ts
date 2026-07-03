import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handler, ok } from "@/lib/errors";
import { requireUser } from "@/lib/auth";
import { rateLimit, RateLimits } from "@/lib/rate-limit";

/**
 * GET /api/me/history — contests the user participated in (submitted),
 * with score and any prize won.
 */
export const GET = handler(async (req: NextRequest) => {
  const user = await requireUser(req);
  rateLimit(req, "me:history", { ...RateLimits.read, userId: user.id });

  const participations = await prisma.participation.findMany({
    where: { userId: user.id, status: "SUBMITTED" },
    orderBy: { submittedAt: "desc" },
    select: {
      score: true,
      submittedAt: true,
      contest: {
        select: { id: true, name: true, accessLevel: true, prize: true, endTime: true, finalized: true },
      },
    },
  });

  const prizes = await prisma.prize.findMany({
    where: { userId: user.id },
    select: { contestId: true, prizeName: true },
  });
  const prizeByContest = new Map(prizes.map((p) => [p.contestId, p.prizeName]));

  return ok({
    history: participations.map((p) => ({
      contest: p.contest,
      score: p.score,
      submittedAt: p.submittedAt,
      prizeWon: prizeByContest.get(p.contest.id) ?? null,
    })),
  });
});
