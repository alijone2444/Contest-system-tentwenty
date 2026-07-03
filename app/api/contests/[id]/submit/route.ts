import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handler, ok, Errors } from "@/lib/errors";
import { requireUser, canAccessContest } from "@/lib/auth";
import { submitAnswersSchema } from "@/lib/validation";
import { rateLimit, RateLimits } from "@/lib/rate-limit";

/**
 * POST /api/contests/:id/submit — submit answers, calculate and store the score.
 *
 * Scoring rules:
 *  - Correct answer  -> + question points
 *  - Incorrect/blank -> 0 (no negative marking)
 *  - MULTI_SELECT is correct only when the selected set exactly matches the
 *    correct set (no partial credit).
 */
export const POST = handler(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const { id } = await ctx.params;
    const user = await requireUser(req);
    rateLimit(req, "contests:submit", { ...RateLimits.write, userId: user.id });

    const body = submitAnswersSchema.parse(await req.json());

    const contest = await prisma.contest.findUnique({
      where: { id },
      include: { questions: { include: { options: true } } },
    });
    if (!contest) throw Errors.notFound("Contest not found.");
    if (!canAccessContest(user, contest.accessLevel)) {
      throw Errors.forbidden("You do not have access to this contest.");
    }

    const participation = await prisma.participation.findUnique({
      where: { userId_contestId: { userId: user.id, contestId: id } },
    });
    if (!participation) throw Errors.badRequest("Join the contest before submitting answers.");
    if (participation.status === "SUBMITTED")
      throw Errors.conflict("You have already submitted this contest.");
    if (new Date() > contest.endTime)
      throw Errors.badRequest("Contest has ended. Submissions are closed.");

    const questionById = new Map(contest.questions.map((q) => [q.id, q]));

    // Validate every submitted answer references a real question (no duplicates).
    const seen = new Set<string>();
    for (const a of body.answers) {
      const q = questionById.get(a.questionId);
      if (!q) throw Errors.badRequest(`Question ${a.questionId} does not belong to this contest.`);
      if (seen.has(a.questionId))
        throw Errors.badRequest(`Duplicate answer for question ${a.questionId}.`);
      seen.add(a.questionId);

      const validOptionIds = new Set(q.options.map((o) => o.id));
      for (const optId of a.selectedOptionIds) {
        if (!validOptionIds.has(optId))
          throw Errors.badRequest(`Option ${optId} does not belong to question ${a.questionId}.`);
      }
      if (q.type !== "MULTI_SELECT" && a.selectedOptionIds.length > 1) {
        throw Errors.badRequest(
          `Question "${q.text}" is ${q.type} — only one option can be selected.`
        );
      }
    }

    // Grade
    let score = 0;
    const graded = body.answers.map((a) => {
      const q = questionById.get(a.questionId)!;
      const correctIds = q.options.filter((o) => o.isCorrect).map((o) => o.id);
      const selected = new Set(a.selectedOptionIds);
      const isCorrect =
        selected.size === correctIds.length && correctIds.every((cid) => selected.has(cid));
      if (isCorrect) score += q.points;
      return { questionId: a.questionId, selectedOptionIds: a.selectedOptionIds, isCorrect };
    });

    const updated = await prisma.$transaction(async (tx) => {
      await tx.answer.createMany({
        data: graded.map((g) => ({
          participationId: participation.id,
          questionId: g.questionId,
          selectedOptionIds: g.selectedOptionIds,
          isCorrect: g.isCorrect,
        })),
      });
      return tx.participation.update({
        where: { id: participation.id },
        data: { status: "SUBMITTED", score, submittedAt: new Date() },
      });
    });

    const totalPoints = contest.questions.reduce((s, q) => s + q.points, 0);
    return ok({
      score,
      totalPoints,
      correctAnswers: graded.filter((g) => g.isCorrect).length,
      totalQuestions: contest.questions.length,
      participation: updated,
    });
  }
);
