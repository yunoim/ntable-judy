import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDateById } from "@/lib/db";
import EditClient from "./EditClient";

export const dynamic = "force-dynamic";

export default async function EditDatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!["admin", "approved"].includes(user.role)) redirect("/");

  const { id } = await params;
  const date = await getDateById(id);
  if (!date) notFound();

  const canDelete = user.role === "admin" || true; // approved 도 자신 것 삭제 가능 — 서버에서 재검증

  return <EditClient date={date} canDelete={canDelete} />;
}
