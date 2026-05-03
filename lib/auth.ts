import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export const SESSION_COOKIE = "session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export async function getCurrentUser() {
  const c = await cookies();
  const token = c.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
}

export async function requireUser(allowedRoles: string[] = ["admin", "approved"]) {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  if (!allowedRoles.includes(user.role)) throw new Error("FORBIDDEN");
  return user;
}
