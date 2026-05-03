import { cookies } from "next/headers";
import { redirect } from "next/navigation";
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

/**
 * 페이지 가드. 컴포넌트 최상단에서 호출.
 * - 비로그인 → /login
 * - pending → /pending
 * - rejected → /login?error=rejected (세션도 폐기)
 * - admin/approved → 통과
 */
export async function requireApproved() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "pending") redirect("/pending");
  if (user.role === "rejected") {
    const c = await cookies();
    const token = c.get(SESSION_COOKIE)?.value;
    if (token) {
      await prisma.session.deleteMany({ where: { token } }).catch(() => {});
    }
    c.delete(SESSION_COOKIE);
    redirect("/login?error=rejected");
  }
  return user;
}
