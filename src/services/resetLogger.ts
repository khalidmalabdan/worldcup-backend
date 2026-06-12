interface ResetLogEntry {
  timestamp: string;
  type: "weekly" | "monthly";
  message: string;
}

const resetLogs: ResetLogEntry[] = [];

export function logReset(type: "weekly" | "monthly", message: string) {
  resetLogs.push({
    timestamp: new Date().toISOString(),
    type,
    message,
  });
}

export function getResetLogs() {
  return resetLogs.slice().reverse(); // newest first
}
