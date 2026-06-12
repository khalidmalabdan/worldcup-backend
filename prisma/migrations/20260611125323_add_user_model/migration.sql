/*
  Warnings:

  - You are about to drop the column `rank` on the `LeagueMember` table. All the data in the column will be lost.
  - Added the required column `code` to the `League` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `League` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_League" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_League" ("id", "name") SELECT "id", "name" FROM "League";
DROP TABLE "League";
ALTER TABLE "new_League" RENAME TO "League";
CREATE UNIQUE INDEX "League_code_key" ON "League"("code");
CREATE TABLE "new_LeagueMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "points" INTEGER NOT NULL DEFAULT 0,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeagueMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LeagueMember_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_LeagueMember" ("id", "leagueId", "points", "userId") SELECT "id", "leagueId", "points", "userId" FROM "LeagueMember";
DROP TABLE "LeagueMember";
ALTER TABLE "new_LeagueMember" RENAME TO "LeagueMember";
CREATE UNIQUE INDEX "LeagueMember_userId_leagueId_key" ON "LeagueMember"("userId", "leagueId");
CREATE TABLE "new_Prediction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "homeScore" INTEGER NOT NULL,
    "awayScore" INTEGER NOT NULL,
    "scorers" TEXT NOT NULL,
    "assisters" TEXT NOT NULL,
    "goalMinutes" TEXT NOT NULL DEFAULT '',
    "doublePoint" BOOLEAN NOT NULL DEFAULT false,
    "points" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Prediction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Prediction_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Prediction" ("assisters", "awayScore", "doublePoint", "goalMinutes", "homeScore", "id", "matchId", "points", "scorers", "userId") SELECT "assisters", "awayScore", "doublePoint", "goalMinutes", "homeScore", "id", "matchId", coalesce("points", 0) AS "points", "scorers", "userId" FROM "Prediction";
DROP TABLE "Prediction";
ALTER TABLE "new_Prediction" RENAME TO "Prediction";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
