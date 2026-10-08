import { config } from "dotenv";

config({ path: ".env", quiet: true });

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("Configurá TELEGRAM_BOT_TOKEN en .env antes de identificar tu usuario.");
  process.exitCode = 1;
} else {
  const { TelegramHttpClient } = await import("../src/modules/telegram/client");
  try {
    const updates = await new TelegramHttpClient(token).getUpdates(undefined, AbortSignal.timeout(30_000));
    const ids = new Set(updates.flatMap(({ message }) =>
      message?.chat.type === "private" && message.chat.id === message.from?.id && message.text?.startsWith("/start")
        ? [message.from.id] : []));
    if (ids.size === 0) console.log("No encontré /start pendiente. Envialo al bot desde tu cuenta y repetí este comando.");
    else console.log(`IDs de chats privados que enviaron /start: ${[...ids].join(", ")}`);
  } catch {
    console.error("No se pudieron leer las actualizaciones. Revisá el token y que el bot no tenga un webhook activo.");
    process.exitCode = 1;
  }
}
