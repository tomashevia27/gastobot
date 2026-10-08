import { config } from "dotenv";

config({ path: ".env", quiet: true });

const token = process.env.TELEGRAM_BOT_TOKEN;
const userId = process.env.TELEGRAM_ALLOWED_USER_ID;
if (!token || !userId || !/^[1-9]\d*$/.test(userId) || !Number.isSafeInteger(Number(userId))) {
  console.error("Configurá TELEGRAM_BOT_TOKEN y TELEGRAM_ALLOWED_USER_ID en .env.");
  process.exitCode = 1;
} else {
  const [{ prismaExpenseStore }, { TelegramHttpClient }, { runTelegramPoller }] = await Promise.all([
    import("../src/modules/expenses/infrastructure/prisma-expense-store"),
    import("../src/modules/telegram/client"),
    import("../src/modules/telegram/poller"),
  ]);
  const controller = new AbortController();
  process.once("SIGINT", () => controller.abort());
  process.once("SIGTERM", () => controller.abort());
  console.log("GastoBot Telegram iniciado. Escuchando mensajes del usuario autorizado.");
  runTelegramPoller(new TelegramHttpClient(token), Number(userId), prismaExpenseStore, controller.signal)
    .catch(() => {
      console.error("No se pudo iniciar el proceso de Telegram. Revisá el token y la conexión.");
      process.exitCode = 1;
    });
}
