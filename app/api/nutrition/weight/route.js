import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { weightLogSchema } from "../../../../lib/validation";
import { isTrustedOrigin, safeError } from "../../../../lib/security";
import { rateLimit } from "../../../../lib/rateLimit";

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }
  const limited = rateLimit(`weight:post:${session.user.id}`);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = weightLogSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { date, weight } = parsed.data;
  const userId = session.user.id;

  try {
    const saved = await prisma.weightLog.upsert({
      where: { userId_date: { userId, date } },
      update: { weight },
      create: { userId, date, weight },
    });
    return NextResponse.json({ entry: saved });
  } catch (err) {
    return NextResponse.json({ error: safeError(err) }, { status: 500 });
  }
}
