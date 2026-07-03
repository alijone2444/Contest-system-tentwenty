import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(60),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const submitAnswersSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1),
        selectedOptionIds: z.array(z.string().min(1)).max(20),
      })
    )
    .min(1, "At least one answer is required")
    .max(200),
});

export const createContestSchema = z.object({
  name: z.string().min(3).max(120),
  description: z.string().min(1).max(2000),
  accessLevel: z.enum(["NORMAL", "VIP"]),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  prize: z.string().min(1).max(200),
  questions: z
    .array(
      z.object({
        text: z.string().min(1).max(1000),
        type: z.enum(["SINGLE_SELECT", "MULTI_SELECT", "TRUE_FALSE"]),
        points: z.number().int().min(1).max(100).default(1),
        options: z
          .array(
            z.object({
              text: z.string().min(1).max(500),
              isCorrect: z.boolean(),
            })
          )
          .min(2)
          .max(10),
      })
    )
    .min(1)
    .max(100),
});
