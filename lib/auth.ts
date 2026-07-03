import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { prisma } from "./db";
import { Errors } from "./errors";
import type { Role } from "@prisma/client";

const TOKEN_COOKIE = "token";
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET env variable is not set");
  return new TextEncoder().encode(secret);
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export async function signToken(user: AuthUser): Promise<string> {
  return new SignJWT({ role: user.role, email: user.email, name: user.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
    .sign(getSecret());
}

export function cookieOptions() {
  return {
    name: TOKEN_COOKIE,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TOKEN_TTL_SECONDS,
  };
}

/**
 * Resolves the current user from a Bearer token (Postman/API clients)
 * or the httpOnly cookie (browser). Returns null for guests.
 */
export async function getCurrentUser(req: NextRequest): Promise<AuthUser | null> {
  let token: string | undefined;

  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  } else {
    const cookieStore = await cookies();
    token = cookieStore.get(TOKEN_COOKIE)?.value;
  }
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.sub) return null;
    // Re-check against DB so revoked/deleted users lose access immediately.
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, email: true, role: true },
    });
    return user;
  } catch {
    return null;
  }
}

/** Requires a logged-in user (any role). Throws 401 for guests. */
export async function requireUser(req: NextRequest): Promise<AuthUser> {
  const user = await getCurrentUser(req);
  if (!user) throw Errors.unauthorized("Guests cannot perform this action. Please sign up and log in.");
  return user;
}

/** Requires one of the given roles. */
export async function requireRole(req: NextRequest, roles: Role[]): Promise<AuthUser> {
  const user = await requireUser(req);
  if (!roles.includes(user.role)) {
    throw Errors.forbidden(`This action requires one of the roles: ${roles.join(", ")}.`);
  }
  return user;
}

/** ADMIN and VIP can access everything; USER only NORMAL contests. */
export function canAccessContest(user: AuthUser | null, accessLevel: "NORMAL" | "VIP"): boolean {
  if (!user) return false; // guests can view listings but never participate
  if (user.role === "ADMIN" || user.role === "VIP") return true;
  return accessLevel === "NORMAL";
}
