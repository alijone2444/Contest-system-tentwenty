import { NextRequest } from "next/server";
import { handler, ok } from "@/lib/errors";
import { getCurrentUser } from "@/lib/auth";

export const GET = handler(async (req: NextRequest) => {
  const user = await getCurrentUser(req);
  return ok({ user, role: user?.role ?? "GUEST" });
});
