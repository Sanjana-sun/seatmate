// Runs once when the Next.js server boots. Starts the match scheduler, which
// automatically runs the matcher a bit before each showtime so the theater
// doesn't have to press a button. Node.js runtime only (not Edge).

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const g = globalThis as unknown as { __seatmateScheduler?: NodeJS.Timeout };
  if (g.__seatmateScheduler) return; // survive hot-reload without stacking timers

  const { runDueMatches } = await import("./lib/store");

  const tick = () => {
    try {
      const ran = runDueMatches();
      if (ran.length) console.log(`[scheduler] auto-matched showtimes: ${ran.join(", ")}`);
    } catch (err) {
      console.error("[scheduler] tick failed", err);
    }
  };

  g.__seatmateScheduler = setInterval(tick, 10_000);
  tick(); // run once on boot
  console.log("[scheduler] started (10s interval)");
}
