import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handler, ok, Errors } from "@/lib/errors";
import { requireUser, canAccessContest } from "@/lib/auth";
import { rateLimit, RateLimits } from "@/lib/rate-limit";

/**
 * POST /api/contests/:id/join — join a contest (creates an IN_PROGRESS participation).
 */
export const POST = handler(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const { id } = await ctx.params;
    const user = await requireUser(req);
    rateLimit(req, "contests:join", { ...RateLimits.write, userId: user.id });

    const contest = await prisma.contest.findUnique({ where: { id } });
    if (!contest) throw Errors.notFound("Contest not found.");

    if (!canAccessContest(user, contest.accessLevel)) {
      throw Errors.forbidden("This is a VIP contest. Only VIP users can participate.");
    }

    const now = new Date();
    if (now < contest.startTime) throw Errors.badRequest("Contest has not started yet.");
    if (now > contest.endTime) throw Errors.badRequest("Contest has already ended.");

    const existing = await prisma.participation.findUnique({
      where: { userId_contestId: { userId: user.id, contestId: id } },
    });
    if (existing) {
      if (existing.status === "SUBMITTED")
        throw Errors.conflict("You have already submitted this contest.");
      return ok({ participation: existing, message: "Already joined — contest in progress." });
    }

    const participation = await prisma.participation.create({
      data: { userId: user.id, contestId: id },
    });

    return ok({ participation, message: "Joined contest. Good luck!" }, 201);
  }
);
