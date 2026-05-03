import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE } from "@/lib/auth";
import { publicOrigin } from "@/lib/origin";

export async function POST(req: Request) {
  const c = await cookies();
  const token = c.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { token } }).catch(() => {});
  }
  c.delete(SESSION_COOKIE);
  return NextResponse.redirect(new URL("/login", publicOrigin(req)), {
    status: 303,
  });
}

export async function GET(req: Request) {
  return POST(req);
}
