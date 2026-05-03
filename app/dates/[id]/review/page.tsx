import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDateById, prisma } from "@/lib/db";
import ReviewForm from "./ReviewForm";

export const dynamic = "force-dynamic";

export default async function ReviewPage({
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

  const partnerUser = await prisma.user.findFirst({
    where: {
      role: { in: ["admin", "approved"] },
      id: { not: user.id },
    },
    orderBy: [{ partner: "desc" }, { createdAt: "asc" }],
  });

  const myReview = date.reviews.find((r) => r.userId === user.id) ?? null;
  const partnerReview = partnerUser
    ? (date.reviews.find((r) => r.userId === partnerUser.id) ?? null)
    : null;

  return (
    <ReviewForm
      date={{
        id: date.id,
        number: date.number,
        title: date.title,
        area: date.area,
        scheduledAt: date.scheduledAt,
      }}
      me={{
        id: user.id,
        nickname: user.nickname,
        emoji: user.emoji,
        role: user.role,
      }}
      partner={
        partnerUser
          ? {
              id: partnerUser.id,
              nickname: partnerUser.nickname,
              emoji: partnerUser.emoji,
            }
          : null
      }
      myReview={
        myReview
          ? { stars: myReview.stars, oneLine: myReview.oneLine }
          : null
      }
      partnerReview={
        partnerReview
          ? {
              stars: partnerReview.stars,
              oneLine: partnerReview.oneLine,
            }
          : null
      }
    />
  );
}
