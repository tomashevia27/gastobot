import type { ExpenseStore } from "@/modules/expenses/application/types";
import type { TelegramClient } from "./client";
import { processTelegramUpdate } from "./processor";

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve();
    const timeout = setTimeout(done, ms);
    function done() {
      clearTimeout(timeout);
      signal.removeEventListener("abort", done);
      resolve();
    }
    signal.addEventListener("abort", done, { once: true });
  });
}

export async function runTelegramPoller(
  client: TelegramClient,
  allowedUserId: number,
  store: ExpenseStore,
  signal: AbortSignal,
): Promise<void> {
  const { id: botId } = await client.getMe();
  let offset: number | undefined;
  let retryDelay = 1000;
  while (!signal.aborted) {
    try {
      const requestSignal = AbortSignal.any([signal, AbortSignal.timeout(35_000)]);
      const updates = await client.getUpdates(offset, requestSignal);
      // The offset call confirms the previous batch. Without pending updates,
      // let Telegram choose its next oldest update (IDs can reset after long idle periods).
      if (updates.length === 0) offset = undefined;
      for (const update of updates) {
        if (signal.aborted) break;
        await processTelegramUpdate(update, botId, allowedUserId, client, store);
        offset = update.update_id + 1;
      }
      retryDelay = 1000;
    } catch {
      if (signal.aborted) break;
      console.error("No se pudo procesar una actualización de Telegram. Se reintentará.");
      await delay(retryDelay, signal);
      retryDelay = Math.min(retryDelay * 2, 30_000);
    }
  }
}
