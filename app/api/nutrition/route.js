import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import { safeError } from "../../../lib/security";
import { rateLimit } from "../../../lib/rateLimit";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const limited = rateLimit(`nutrition:get:${session.user.id}`);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const userId = session.user.id;
  try {
    const [settings, weightLogs, checklistEntries] = await Promise.all([
      prisma.nutritionSettings.findUnique({ where: { userId } }),
      prisma.weightLog.findMany({
        where: { userId },
        orderBy: { date: "asc" },
        take: 2000,
      }),
      prisma.checklistEntry.findMany({
        where: { userId },
        orderBy: { date: "asc" },
        take: 2000,
      }),
    ]);
    return NextResponse.json({ settings, weightLogs, checklistEntries });
  } catch (err) {
    return NextResponse.json({ error: safeError(err) }, { status: 500 });
  }
}
