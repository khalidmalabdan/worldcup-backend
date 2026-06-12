/*
  Warnings:

  - Added the required column `externalId` to the `Match` table without a default value. This is not possible if the table is not empty.
  - Added the required column `matchDate` to the `Match` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Match" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalId" INTEGER NOT NULL,
    "homeTeam" TEXT NOT NULL,
    "awayTeam" TEXT NOT NULL,
    "homeScore" INTEGER,
    "awayScore" INTEGER,
    "kickoffTime" DATETIME NOT NULL,
    "matchDate" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "scored" BOOLEAN NOT NULL DEFAULT false,
    "homeLogo" TEXT,
    "awayLogo" TEXT,
    "homeFlag" TEXT,
    "awayFlag" TEXT,
    "events" TEXT NOT NULL DEFAULT '',
    "homePlayers" TEXT NOT NULL DEFAULT '',
    "awayPlayers" TEXT NOT NULL DEFAULT ''
);
INSERT INTO "new_Match" ("awayScore", "awayTeam", "homeScore", "homeTeam", "id", "kickoffTime", "scored", "status") SELECT "awayScore", "awayTeam", "homeScore", "homeTeam", "id", "kickoffTime", "scored", "status" FROM "Match";
DROP TABLE "Match";
ALTER TABLE "new_Match" RENAME TO "Match";
CREATE UNIQUE INDEX "Match_externalId_key" ON "Match"("externalId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
