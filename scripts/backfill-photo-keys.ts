// scripts/backfill-photo-keys.ts
// 기존 DatePhoto.url에서 R2_PUBLIC_URL prefix를 떼어내 key를 백필.
// 멱등 (이미 key 있으면 skip), URL prefix 안 맞으면 skip + log.
//
// 실행: pnpm tsx scripts/backfill-photo-keys.ts

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const publicUrl = process.env.R2_PUBLIC_URL;
  if (!publicUrl) {
    console.error("R2_PUBLIC_URL env 누락");
    process.exit(1);
  }
  const prefix = publicUrl.replace(/\/$/, "") + "/";

  const photos = await prisma.datePhoto.findMany({
    where: { key: null },
    select: { id: true, url: true },
  });
  console.log(`[backfill] key 미설정 row: ${photos.length}개`);

  let updated = 0;
  let skipped = 0;
  for (const p of photos) {
    if (!p.url.startsWith(prefix)) {
      console.log(
        `[skip id=${p.id}] URL prefix 미일치: ${p.url.slice(0, 80)}...`,
      );
      skipped++;
      continue;
    }
    const key = p.url.slice(prefix.length);
    await prisma.datePhoto.update({ where: { id: p.id }, data: { key } });
    updated++;
  }

  console.log(`[backfill] updated=${updated} skipped=${skipped}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
