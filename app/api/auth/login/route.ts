import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { handler, ok, Errors } from "@/lib/errors";
import { signToken, cookieOptions } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import { rateLimit, RateLimits } from "@/lib/rate-limit";

export const POST = handler(async (req: NextRequest) => {
  rateLimit(req, "auth", RateLimits.auth);

  const body = loginSchema.parse(await req.json());
  const user = await prisma.user.findUnique({
    where: { email: body.email.toLowerCase() },
  });

  // Same message for wrong email and wrong password (no user enumeration).
  if (!user || !(await bcrypt.compare(body.password, user.password))) {
    throw Errors.unauthorized("Invalid email or password.");
  }

  const safeUser = { id: user.id, name: user.name, email: user.email, role: user.role };
  const token = await signToken(safeUser);
  const res = ok({ user: safeUser, token }) as NextResponse;
  res.cookies.set({ ...cookieOptions(), value: token });
  return res;
});
