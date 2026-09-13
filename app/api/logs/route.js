import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import { workoutLogBatchSchema } from "../../../lib/validation";
import { isTrustedOrigin, safeError } from "../../../lib/security";
import { rateLimit } from "../../../lib/rateLimit";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = rateLimit(`logs:get:${session.user.id}`);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const logs = await prisma.workoutLog.findMany({
      where: { userId: session.user.id }, // never trust a client-supplied userId
      select: { exercise: true, date: true, sets: true },
      orderBy: { date: "asc" },
      take: 5000, // hard cap so no single account can force an unbounded query
    });
    return NextResponse.json({ logs });
  } catch (err) {
    return NextResponse.json({ error: safeError(err) }, { status: 500 });
  }
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }
  const limited = rateLimit(`logs:post:${session.user.id}`);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = workoutLogBatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { date, entries } = parsed.data;
  const userId = session.user.id;

  try {
    await prisma.$transaction(
      entries.map((e) =>
        e.sets.length > 0
          ? prisma.workoutLog.upsert({
              where: { userId_exercise_date: { userId, exercise: e.exercise, date } },
              update: { sets: e.sets },
              create: { userId, exercise: e.exercise, date, sets: e.sets },
            })
          : // All fields for this exercise were cleared — remove the old
            // saved row instead of leaving stale data behind. deleteMany
            // (not delete) so it's a no-op if there was nothing to remove.
            prisma.workoutLog.deleteMany({
              where: { userId, exercise: e.exercise, date },
            })
      )
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: safeError(err) }, { status: 500 });
  }
}