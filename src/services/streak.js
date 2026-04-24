import LogEntry from "../models/LogEntry.js";
import { daysBetween, parseDateString } from "../utils/validation.js";

// Computes the consecutive-day streak ending at `endDate` for the given client.
// "Consecutive" = logs exist for every day from some start up through endDate.
export async function computeStreak(clientId, endDate) {
  // Pull recent logs descending so we can walk back from endDate
  const logs = await LogEntry.find({ clientId })
    .sort({ date: -1 })
    .select("date")
    .limit(400)
    .lean();

  if (!logs.length) return 0;

  const end = parseDateString(endDate);
  if (!end) return 0;

  let streak = 0;
  let cursor = endDate;

  const dateSet = new Set(logs.map((l) => l.date));

  while (dateSet.has(cursor)) {
    streak += 1;
    // Step cursor back one day
    const d = parseDateString(cursor);
    d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    cursor = `${y}-${m}-${day}`;
  }

  return streak;
}
