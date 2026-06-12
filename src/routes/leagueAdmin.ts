import { Router } from "express";
import prisma from "../prisma";
import requireAuth, { AuthRequest } from "../middleware/authMiddleware";

const router = Router();

/* ---------------------------------------------------
   ⭐ Helper: check if user is league admin
--------------------------------------------------- */
async function isLeagueAdmin(leagueId: string, userId: string) {
  const member = await prisma.leagueMember.findFirst({
    where: { leagueId, userId },
  });

  return member?.role === "ADMIN";
}

/* ---------------------------------------------------
   ⭐ Promote/demote member role
   POST /league-admin/:leagueId/members/:userId/role
   body: { role: "ADMIN" | "MEMBER" }
--------------------------------------------------- */
router.post(
  "/:leagueId/members/:userId/role",
  requireAuth,
  async (req: AuthRequest, res) => {
    const { leagueId, userId } = req.params as {
      leagueId: string;
      userId: string;
    };

    const role = req.body.role as "ADMIN" | "MEMBER";
    const requesterId = req.user!.id;

    if (!["ADMIN", "MEMBER"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const isAdmin = await isLeagueAdmin(leagueId, requesterId);
    if (!isAdmin) {
      return res.status(403).json({ error: "Not a league admin" });
    }

    try {
      // Prevent demoting the last admin
      if (role === "MEMBER") {
        const adminCount = await prisma.leagueMember.count({
          where: { leagueId, role: "ADMIN" },
        });

        const target = await prisma.leagueMember.findFirst({
          where: { leagueId, userId },
        });

        if (target?.role === "ADMIN" && adminCount <= 1) {
          return res
            .status(400)
            .json({ error: "Cannot demote the last admin" });
        }
      }

      const updated = await prisma.leagueMember.updateMany({
        where: { leagueId, userId },
        data: { role },
      });

      res.json({ updated: updated.count });
    } catch (err) {
      console.error("Error updating league member role:", err);
      res.status(500).json({ error: "Failed to update role" });
    }
  }
);

/* ---------------------------------------------------
   ⭐ Update league settings
   PATCH /league-admin/:leagueId/settings
   body: { name?: string; logo?: string; isPrivate?: boolean }
--------------------------------------------------- */
router.patch(
  "/:leagueId/settings",
  requireAuth,
  async (req: AuthRequest, res) => {
    const { leagueId } = req.params as { leagueId: string };
    const { name, logo, isPrivate } = req.body as {
      name?: string;
      logo?: string;
      isPrivate?: boolean;
    };

    const requesterId = req.user!.id;

    const isAdmin = await isLeagueAdmin(leagueId, requesterId);
    if (!isAdmin) {
      return res.status(403).json({ error: "Not a league admin" });
    }

    try {
      const updated = await prisma.league.update({
        where: { id: leagueId },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(logo !== undefined ? { logo } : {}),
          ...(isPrivate !== undefined ? { isPrivate } : {}),
        },
      });

      res.json(updated);
    } catch (err) {
      console.error("Error updating league settings:", err);
      res.status(500).json({ error: "Failed to update league settings" });
    }
  }
);

/* ---------------------------------------------------
   ⭐ Admin-only league deletion
   DELETE /league-admin/:leagueId
--------------------------------------------------- */
router.delete(
  "/:leagueId",
  requireAuth,
  async (req: AuthRequest, res) => {
    const { leagueId } = req.params as { leagueId: string };
    const requesterId = req.user!.id;

    const isAdmin = await isLeagueAdmin(leagueId, requesterId);
    if (!isAdmin) {
      return res.status(403).json({ error: "Not a league admin" });
    }

    try {
      // Delete members first (FK constraint safety)
      await prisma.leagueMember.deleteMany({
        where: { leagueId },
      });

      // Delete trophies
      await (prisma as any).weeklyTrophy.deleteMany({
        where: { leagueId },
      });

      // Delete league
      await prisma.league.delete({
        where: { id: leagueId },
      });

      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting league:", err);
      res.status(500).json({ error: "Failed to delete league" });
    }
  }
);

export default router;
