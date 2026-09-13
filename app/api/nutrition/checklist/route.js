import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { checklistSchema } from "../../../../lib/validation";
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
  const limited = rateLimit(`checklist:post:${session.user.id}`);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = checklistSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { date, protein, calories, creatine, water } = parsed.data;
  const userId = session.user.id;

  try {
    const saved = await prisma.checklistEntry.upsert({
      where: { userId_date: { userId, date } },
      update: { protein, calories, creatine, water },
      create: { userId, date, protein, calories, creatine, water },
    });
    return NextResponse.json({ entry: saved });
  } catch (err) {
    return NextResponse.json({ error: safeError(err) }, { status: 500 });
  }
}
