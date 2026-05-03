import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import ProfileClient from "./ProfileClient";

export const dynamic = "force-dynamic";

const EMOJIS = [
  "🦊", "🐰", "🐻", "🐱", "🐶", "🐯",
  "🦝", "🐼", "🐨", "🐺", "🦄", "🐹",
  "🐧", "🦋", "🌱", "✨",
];

export default async function ProfileSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <ProfileClient
      user={{
        id: user.id,
        nickname: user.nickname,
        emoji: user.emoji,
        profileImage: user.profileImage,
        role: user.role,
      }}
      emojis={EMOJIS}
    />
  );
}
