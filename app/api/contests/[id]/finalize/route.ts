import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handler, ok, Errors } from "@/lib/errors";
import { requireRole } from "@/lib/auth";
import { rateLimit, RateLimits } from "@/lib/rate-limit";

/**
 * POST /api/contests/:id/finalize — ADMIN only.
 * After a contest ends, awards the prize to the highest scorer
 * (ties broken by earliest submission) and marks the contest finalized.
 */
export const POST = handler(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const { id } = await ctx.params;
    const admin = await requireRole(req, ["ADMIN"]);
    rateLimit(req, "finalize", { ...RateLimits.write, userId: admin.id });

    const contest = await prisma.contest.findUnique({ where: { id } });
    if (!contest) throw Errors.notFound("Contest not found.");
    if (contest.finalized) throw Errors.conflict("Contest is already finalized.");
    if (new Date() < contest.endTime)
      throw Errors.badRequest("Contest has not ended yet — cannot finalize.");

    const winner = await prisma.participation.findFirst({
      where: { contestId: id, status: "SUBMITTED" },
      orderBy: [{ score: "desc" }, { submittedAt: "asc" }],
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    const result = await prisma.$transaction(async (tx) => {
      let prize = null;
      if (winner) {
        prize = await tx.prize.create({
          data: {
            userId: winner.userId,
            contestId: id,
            prizeName: contest.prize,
            score: winner.score,
          },
        });
      }
      await tx.contest.update({ where: { id }, data: { finalized: true } });
      return prize;
    });

    return ok({
      message: winner
        ? `Prize "${contest.prize}" awarded to ${winner.user.name} (score ${winner.score}).`
        : "Contest finalized. No submissions, so no prize was awarded.",
      winner: winner ? { ...winner.user, score: winner.score } : null,
      prize: result,
    });
  }
);
