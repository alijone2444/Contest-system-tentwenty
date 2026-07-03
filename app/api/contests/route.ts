import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handler, ok } from "@/lib/errors";
import { getCurrentUser, requireRole, canAccessContest } from "@/lib/auth";
import { createContestSchema } from "@/lib/validation";
import { rateLimit, RateLimits } from "@/lib/rate-limit";
import { Errors } from "@/lib/errors";

/**
 * GET /api/contests — list contests.
 * Guests can VIEW every contest but cannot participate.
 * `canParticipate` tells the client what the current user may do.
 */
export const GET = handler(async (req: NextRequest) => {
  const user = await getCurrentUser(req);
  rateLimit(req, "contests:list", { ...RateLimits.read, userId: user?.id });

  const contests = await prisma.contest.findMany({
    orderBy: { startTime: "desc" },
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

  const now = new Date();
  const data = contests.map((c) => ({
    ...c,
    questionCount: c._count.questions,
    participantCount: c._count.participations,
    _count: undefined,
    status: now < c.startTime ? "UPCOMING" : now > c.endTime ? "ENDED" : "ACTIVE",
    canParticipate: canAccessContest(user, c.accessLevel) && now >= c.startTime && now <= c.endTime,
  }));

  return ok({ role: user?.role ?? "GUEST", contests: data });
});

/**
 * POST /api/contests — create a contest with questions (ADMIN only).
 */
export const POST = handler(async (req: NextRequest) => {
  const admin = await requireRole(req, ["ADMIN"]);
  rateLimit(req, "contests:create", { ...RateLimits.write, userId: admin.id });

  const body = createContestSchema.parse(await req.json());
  if (body.endTime <= body.startTime) {
    throw Errors.badRequest("endTime must be after startTime.");
  }

  for (const [i, q] of body.questions.entries()) {
    const correct = q.options.filter((o) => o.isCorrect).length;
    if (correct === 0) throw Errors.badRequest(`Question ${i + 1} has no correct option.`);
    if (q.type !== "MULTI_SELECT" && correct > 1)
      throw Errors.badRequest(`Question ${i + 1} (${q.type}) must have exactly one correct option.`);
    if (q.type === "TRUE_FALSE" && q.options.length !== 2)
      throw Errors.badRequest(`Question ${i + 1} (TRUE_FALSE) must have exactly 2 options.`);
  }

  const contest = await prisma.contest.create({
    data: {
      name: body.name,
      description: body.description,
      accessLevel: body.accessLevel,
      startTime: body.startTime,
      endTime: body.endTime,
      prize: body.prize,
      questions: {
        create: body.questions.map((q, order) => ({
          text: q.text,
          type: q.type,
          points: q.points,
          order,
          options: { create: q.options },
        })),
      },
    },
    include: { questions: { include: { options: true } } },
  });

  return ok({ contest }, 201);
});
