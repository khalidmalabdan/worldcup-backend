-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "points" INTEGER,
    CONSTRAINT "Prediction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Prediction_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Prediction" ("assisters", "awayScore", "doublePoint", "homeScore", "id", "matchId", "points", "scorers", "userId") SELECT "assisters", "awayScore", "doublePoint", "homeScore", "id", "matchId", "points", "scorers", "userId" FROM "Prediction";
DROP TABLE "Prediction";
ALTER TABLE "new_Prediction" RENAME TO "Prediction";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
