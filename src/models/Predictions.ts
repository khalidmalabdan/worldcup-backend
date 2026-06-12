import prisma from "../prisma";

/* ---------------------------------------------------
   ⭐ TYPES
--------------------------------------------------- */
export interface PredictionModel {
  id: string;
  userId: string;
  matchId: string;
  homeScore: number;
  awayScore: number;
  scorers: string[];
  assisters: string[];
  goalMinutes: number[];
  doublePoint: boolean;
  points: number | null;
}

/* ---------------------------------------------------
   ⭐ HELPERS FOR ARRAY ↔ STRING
--------------------------------------------------- */
function toDbArray(arr: string[] | number[] | undefined | null): string {
  if (!arr || arr.length === 0) return "";
  return arr.join(",");
}

function fromDbArray(str: string | null | undefined): string[] {
  if (!str || str.trim() === "") return [];
  return str.split(",").map((s) => s.trim());
}

function fromDbNumberArray(str: string | null | undefined): number[] {
  if (!str || str.trim() === "") return [];
  return str.split(",").map((n) => Number(n));
}

function safeGoalMinutes(row: any): string {
  return typeof row.goalMinutes === "string" ? row.goalMinutes : "";
}

/* ---------------------------------------------------
   ⭐ GET SINGLE PREDICTION
--------------------------------------------------- */
export async function getPrediction(
  userId: string,
  matchId: string
): Promise<PredictionModel | null> {
  const row = await prisma.prediction.findFirst({
    where: { userId, matchId },
  });

  if (!row) return null;

  return {
    ...row,
    scorers: fromDbArray(row.scorers),
    assisters: fromDbArray(row.assisters),
    goalMinutes: fromDbNumberArray(safeGoalMinutes(row)),
  };
}

/* ---------------------------------------------------
   ⭐ GET ALL PREDICTIONS FOR MATCH
--------------------------------------------------- */
export async function getPredictionsForMatch(
  matchId: string
): Promise<PredictionModel[]> {
  const rows = await prisma.prediction.findMany({
    where: { matchId },
  });

  return rows.map((row) => ({
    ...row,
    scorers: fromDbArray(row.scorers),
    assisters: fromDbArray(row.assisters),
    goalMinutes: fromDbNumberArray(safeGoalMinutes(row)),
  }));
}

/* ---------------------------------------------------
   ⭐ USED BY SCORING ENGINE
--------------------------------------------------- */
export async function getPredictionsByMatch(
  matchId: string
): Promise<PredictionModel[]> {
  const rows = await prisma.prediction.findMany({
    where: { matchId },
  });

  return rows.map((row) => ({
    ...row,
    scorers: fromDbArray(row.scorers),
    assisters: fromDbArray(row.assisters),
    goalMinutes: fromDbNumberArray(safeGoalMinutes(row)),
  }));
}

/* ---------------------------------------------------
   ⭐ INTERNAL — GET OR CREATE PREDICTION ID
--------------------------------------------------- */
async function getOrCreatePredictionId(userId: string, matchId: string) {
  const existing = await prisma.prediction.findFirst({
    where: { userId, matchId },
  });

  if (existing) return existing.id;

  const created = await prisma.prediction.create({
    data: {
      userId,
      matchId,
      homeScore: 0,
      awayScore: 0,
      scorers: "",
      assisters: "",
      goalMinutes: "",
      doublePoint: false,
    },
  });

  return created.id;
}

/* ---------------------------------------------------
   ⭐ UPSERT PREDICTION (MAIN FUNCTION)
--------------------------------------------------- */
export async function upsertPrediction(data: {
  userId: string;
  matchId: string;
  homeScore: number;
  awayScore: number;
  scorers: string[];
  assisters: string[];
  goalMinutes: number[];
  doublePoint?: boolean;
}): Promise<PredictionModel> {
  const id = await getOrCreatePredictionId(data.userId, data.matchId);

  const updated = await prisma.prediction.update({
    where: { id },
    data: {
      homeScore: data.homeScore,
      awayScore: data.awayScore,
      scorers: toDbArray(data.scorers),
      assisters: toDbArray(data.assisters),
      goalMinutes: toDbArray(data.goalMinutes),
      doublePoint: data.doublePoint ?? false,
      points: null, // reset points so scoring engine recalculates
    },
  });

  return {
    ...updated,
    scorers: fromDbArray(updated.scorers),
    assisters: fromDbArray(updated.assisters),
    goalMinutes: fromDbNumberArray(safeGoalMinutes(updated)),
  };
}

/* ---------------------------------------------------
   ⭐ UPDATE PREDICTION (LEGACY SUPPORT)
--------------------------------------------------- */
export async function updatePrediction(
  userId: string,
  matchId: string,
  update: Partial<{
    homeScore: number;
    awayScore: number;
    scorers: string[];
    assisters: string[];
    goalMinutes: number[];
    doublePoint: boolean;
  }>
): Promise<PredictionModel | null> {
  const existing = await prisma.prediction.findFirst({
    where: { userId, matchId },
  });

  if (!existing) return null;

  const updated = await prisma.prediction.update({
    where: { id: existing.id },
    data: {
      homeScore: update.homeScore ?? existing.homeScore,
      awayScore: update.awayScore ?? existing.awayScore,
      scorers: update.scorers ? toDbArray(update.scorers) : existing.scorers,
      assisters: update.assisters ? toDbArray(update.assisters) : existing.assisters,
      goalMinutes: update.goalMinutes
        ? toDbArray(update.goalMinutes)
        : safeGoalMinutes(existing),
      doublePoint: update.doublePoint ?? existing.doublePoint,
    },
  });

  return {
    ...updated,
    scorers: fromDbArray(updated.scorers),
    assisters: fromDbArray(updated.assisters),
    goalMinutes: fromDbNumberArray(safeGoalMinutes(updated)),
  };
}

/* ---------------------------------------------------
   ⭐ UPDATE POINTS AFTER SCORING
--------------------------------------------------- */
export async function updatePredictionPoints(
  predictionId: string,
  points: number | null
): Promise<PredictionModel> {
  const updated = await prisma.prediction.update({
    where: { id: predictionId },
    data: { points },
  });

  return {
    ...updated,
    scorers: fromDbArray(updated.scorers),
    assisters: fromDbArray(updated.assisters),
    goalMinutes: fromDbNumberArray(safeGoalMinutes(updated)),
  };
}

/* ---------------------------------------------------
   ⭐ CLEAR ALL POINTS FOR A MATCH
--------------------------------------------------- */
export async function clearPredictionPointsByMatch(matchId: string) {
  await prisma.prediction.updateMany({
    where: { matchId },
    data: { points: null },
  });
}
