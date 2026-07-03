import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handler, ok } from "@/lib/errors";
import { requireUser } from "@/lib/auth";
import { rateLimit, RateLimits } from "@/lib/rate-limit";

/**
 * GET /api/me/prizes — every prize the user has won.
 */
export const GET = handler(async (req: NextRequest) => {
  const user = await requireUser(req);
  rateLimit(req, "me:prizes", { ...RateLimits.read, userId: user.id });

  const prizes = await prisma.prize.findMany({
    where: { userId: user.id },
    orderBy: { awardedAt: "desc" },
    select: {
      id: true,
      prizeName: true,
      score: true,
      awardedAt: true,
      contest: { select: { id: true, name: true, accessLevel: true } },
    },
  });

  return ok({ prizes });
});
