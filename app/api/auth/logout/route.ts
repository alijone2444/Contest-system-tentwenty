import { NextResponse } from "next/server";
import { handler, ok } from "@/lib/errors";
import { cookieOptions } from "@/lib/auth";

export const POST = handler(async () => {
  const res = ok({ message: "Logged out." }) as NextResponse;
  res.cookies.set({ ...cookieOptions(), value: "", maxAge: 0 });
  return res;
});
