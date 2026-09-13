import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { nutritionSettingsSchema } from "../../../../lib/validation";
import { computeTargets } from "../../../../lib/plan";
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
  const limited = rateLimit(`nutrition:settings:${session.user.id}`);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = nutritionSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { weight, activity, goal } = parsed.data;
  // Targets are always derived server-side from the shared formula — a
  // tampered client request can't plant arbitrary calorie/protein numbers.
  const targets = computeTargets(weight, activity, goal);
  const userId = session.user.id;

  try {
    const saved = await prisma.nutritionSettings.upsert({
      where: { userId },
      update: { weight, activity, goal, ...targets },
      create: { userId, weight, activity, goal, ...targets },
    });
    return NextResponse.json({ settings: saved });
  } catch (err) {
    return NextResponse.json({ error: safeError(err) }, { status: 500 });
  }
}
