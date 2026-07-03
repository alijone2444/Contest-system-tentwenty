import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { handler, ok, Errors } from "@/lib/errors";
import { signToken, cookieOptions } from "@/lib/auth";
import { signupSchema } from "@/lib/validation";
import { rateLimit, RateLimits } from "@/lib/rate-limit";

export const POST = handler(async (req: NextRequest) => {
  rateLimit(req, "auth", RateLimits.auth);

  const body = signupSchema.parse(await req.json());
  const email = body.email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw Errors.conflict("An account with this email already exists.");

  const user = await prisma.user.create({
    data: {
      name: body.name,
      email,
      password: await bcrypt.hash(body.password, 10),
      role: "USER", // roles are elevated by an admin, never self-assigned
    },
    select: { id: true, name: true, email: true, role: true },
  });

  const token = await signToken(user);
  const res = ok({ user, token }, 201) as NextResponse;
  res.cookies.set({ ...cookieOptions(), value: token });
  return res;
});
