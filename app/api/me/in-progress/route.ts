import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handler, ok } from "@/lib/errors";
import { requireUser } from "@/lib/auth";
import { rateLimit, RateLimits } from "@/lib/rate-limit";

/**
 * GET /api/me/in-progress — contests the user joined but has not submitted yet.
 */
export const GET = handler(async (req: NextRequest) => {
  const user = await requireUser(req);
  rateLimit(req, "me:inprogress", { ...RateLimits.read, userId: user.id });

  const participations = await prisma.participation.findMany({
    where: { userId: user.id, status: "IN_PROGRESS" },
    orderBy: { startedAt: "desc" },
    select: {
      startedAt: true,
      contest: {
        select: { id: true, name: true, accessLevel: true, prize: true, startTime: true, endTime: true },
      },
    },
  });

  const now = new Date();
  return ok({
    inProgress: participations.map((p) => ({
      contest: p.contest,
      startedAt: p.startedAt,
      expired: now > p.contest.endTime, // joined but never submitted before it ended
    })),
  });
});
