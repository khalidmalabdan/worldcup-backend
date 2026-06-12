import prisma from "../prisma";
import crypto from "crypto";

/* ---------------------------------------------------
   Generate Invite Code
--------------------------------------------------- */
export function generateLeagueCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

/* ---------------------------------------------------
   Create League (creator becomes ADMIN)
--------------------------------------------------- */
export async function createLeague(userId: string, name: string) {
  const code = generateLeagueCode();

  return prisma.league.create({
    data: {
      name,
      code,
      logo: null,
      isPrivate: false,
      members: {
        create: {
          userId,
          role: "ADMIN",
        },
      },
    },
    include: {
      members: { include: { user: true } },
    },
  });
}

/* ---------------------------------------------------
   Join League via Invite Code
--------------------------------------------------- */
export async function joinLeague(userId: string, code: string) {
  const league = await prisma.league.findUnique({
    where: { code },
  });

  if (!league) throw new Error("League not found");

  // Check if already joined
  const exists = await prisma.leagueMember.findUnique({
    where: {
      userId_leagueId: {
        userId,
        leagueId: league.id,
      },
    },
  });

  if (exists) return league;

  await prisma.leagueMember.create({
    data: {
      userId,
      leagueId: league.id,
      role: "MEMBER",
    },
  });

  return league;
}

/* ---------------------------------------------------
   League Leaderboard
--------------------------------------------------- */
export async function getLeagueLeaderboard(leagueId: string) {
  return prisma.leagueMember.findMany({
    where: { leagueId },
    include: { user: true },
    orderBy: { points: "desc" },
  });
}

/* ---------------------------------------------------
   Helper: Check Admin
--------------------------------------------------- */
async function requireAdmin(userId: string, leagueId: string) {
  const member = await prisma.leagueMember.findUnique({
    where: {
      userId_leagueId: { userId, leagueId },
    },
  });

  if (!member || member.role !== "ADMIN") {
    throw new Error("Not authorized");
  }
}

/* ---------------------------------------------------
   Admin: Kick Member
--------------------------------------------------- */
export async function kickMember(
  adminId: string,
  leagueId: string,
  memberId: string
) {
  await requireAdmin(adminId, leagueId);

  if (adminId === memberId) {
    throw new Error("Admin cannot kick themselves");
  }

  return prisma.leagueMember.delete({
    where: {
      userId_leagueId: {
        userId: memberId,
        leagueId,
      },
    },
  });
}

/* ---------------------------------------------------
   Admin: Promote / Demote
--------------------------------------------------- */
export async function updateMemberRole(
  adminId: string,
  leagueId: string,
  memberId: string,
  role: string
) {
  await requireAdmin(adminId, leagueId);

  if (!["ADMIN", "MEMBER"].includes(role)) {
    throw new Error("Invalid role");
  }

  // Prevent demoting the last admin
  if (role === "MEMBER") {
    const adminCount = await prisma.leagueMember.count({
      where: { leagueId, role: "ADMIN" },
    });

    const isTargetAdmin = await prisma.leagueMember.findUnique({
      where: { userId_leagueId: { userId: memberId, leagueId } },
    });

    if (isTargetAdmin?.role === "ADMIN" && adminCount <= 1) {
      throw new Error("Cannot demote the last admin");
    }
  }

  return prisma.leagueMember.update({
    where: {
      userId_leagueId: {
        userId: memberId,
        leagueId,
      },
    },
    data: { role },
  });
}

/* ---------------------------------------------------
   Admin: Rename League
--------------------------------------------------- */
export async function renameLeague(
  adminId: string,
  leagueId: string,
  name: string
) {
  await requireAdmin(adminId, leagueId);

  return prisma.league.update({
    where: { id: leagueId },
    data: { name },
  });
}

/* ---------------------------------------------------
   Admin: Regenerate Invite Code
--------------------------------------------------- */
export async function regenerateLeagueCode(
  adminId: string,
  leagueId: string
) {
  await requireAdmin(adminId, leagueId);

  const newCode = generateLeagueCode();

  return prisma.league.update({
    where: { id: leagueId },
    data: { code: newCode },
  });
}

/* ---------------------------------------------------
   Settings: Leave League
--------------------------------------------------- */
export async function leaveLeague(userId: string, leagueId: string) {
  await prisma.leagueMember.delete({
    where: {
      userId_leagueId: { userId, leagueId },
    },
  });

  // If no members left → delete league
  const remaining = await prisma.leagueMember.count({
    where: { leagueId },
  });

  if (remaining === 0) {
    await prisma.league.delete({ where: { id: leagueId } });
  }

  return { success: true };
}

/* ---------------------------------------------------
   Admin: Delete League
--------------------------------------------------- */
export async function deleteLeague(adminId: string, leagueId: string) {
  await requireAdmin(adminId, leagueId);

  // Delete trophies
  await (prisma as any).weeklyTrophy.deleteMany({
    where: { leagueId },
  });

  // Delete members
  await prisma.leagueMember.deleteMany({
    where: { leagueId },
  });

  // Delete league
  return prisma.league.delete({
    where: { id: leagueId },
  });
}
