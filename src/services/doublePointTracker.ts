// Track double-point usage per user per week
interface DoublePointUsage {
  [userId: string]: {
    weekStart: number;   // timestamp for Sunday 00:00
    count: number;       // how many times used this week
  };
}

const usage: DoublePointUsage = {};

// Helper: get Sunday 00:00 timestamp for current week
function getWeekStart(): number {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday, 1 = Monday, ... 6 = Saturday

  // Move back to Sunday
  const diff = -day; // If today is Sunday (0), diff = 0

  const sunday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + diff,
    0, 0, 0, 0
  );

  return sunday.getTime();
}

export function canUseDoublePoint(userId: string): boolean {
  const weekStart = getWeekStart();

  if (!usage[userId]) {
    usage[userId] = { weekStart, count: 0 };
    return true;
  }

  // Reset if new week
  if (usage[userId].weekStart !== weekStart) {
    usage[userId] = { weekStart, count: 0 };
    return true;
  }

  return usage[userId].count < 2;
}

export function recordDoublePointUse(userId: string) {
  const weekStart = getWeekStart();

  if (!usage[userId] || usage[userId].weekStart !== weekStart) {
    usage[userId] = { weekStart, count: 1 };
  } else {
    usage[userId].count += 1;
  }
}

// ⭐ NEW — return remaining Double Point uses
export function getRemainingDoublePoints(userId: string): number {
  const weekStart = getWeekStart();

  if (!usage[userId] || usage[userId].weekStart !== weekStart) {
    return 2; // full reset
  }

  return Math.max(0, 2 - usage[userId].count);
}
