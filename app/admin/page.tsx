import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import AdminClient from "./AdminClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/");

  const [pending, approved, rejected] = await Promise.all([
    prisma.user.findMany({
      where: { role: "pending" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: { role: { in: ["admin", "approved"] } },
      orderBy: [{ role: "desc" }, { lastLoginAt: "desc" }],
    }),
    prisma.user.findMany({
      where: { role: "rejected" },
      orderBy: { rejectedAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <AdminClient
      pending={pending.map(serializeUser)}
      approved={approved.map(serializeUser)}
      rejected={rejected.map(serializeUser)}
      currentAdminId={user.id}
    />
  );
}

function serializeUser(u: {
  id: string;
  kakaoId: string;
  nickname: string;
  emoji: string | null;
  profileImage: string | null;
  role: string;
  createdAt: Date;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  lastLoginAt: Date | null;
}) {
  return {
    id: u.id,
    kakaoId: u.kakaoId,
    nickname: u.nickname,
    emoji: u.emoji,
    profileImage: u.profileImage,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
    approvedAt: u.approvedAt?.toISOString() ?? null,
    rejectedAt: u.rejectedAt?.toISOString() ?? null,
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
  };
}

export type AdminUser = ReturnType<typeof serializeUser>;
