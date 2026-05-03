import { requireApproved } from "@/lib/auth";
import ProfileClient from "./ProfileClient";

export const dynamic = "force-dynamic";

const EMOJIS = [
  "🦊", "🐰", "🐻", "🐱", "🐶", "🐯",
  "🦝", "🐼", "🐨", "🐺", "🦄", "🐹",
  "🐧", "🦋", "🌱", "✨",
];

export default async function ProfileSettingsPage() {
  const user = await requireApproved();

  return (
    <ProfileClient
      user={{
        id: user.id,
        nickname: user.nickname,
        emoji: user.emoji,
        profileImage: user.profileImage,
        role: user.role,
        birthday: user.birthday ? user.birthday.toISOString().slice(0, 10) : null,
        birthTime: user.birthTime,
      }}
      emojis={EMOJIS}
    />
  );
}
