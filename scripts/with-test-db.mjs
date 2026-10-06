import { spawn } from "node:child_process";
import path from "node:path";
import { config } from "dotenv";

config({ path: ".env" });
config({ path: ".env.test" });

const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) {
  throw new Error("Configurá TEST_DATABASE_URL en .env.test o en el entorno.");
}

const parsed = new URL(testUrl);
if (parsed.pathname !== "/gastobot_test") {
  throw new Error("TEST_DATABASE_URL debe apuntar a la base gastobot_test.");
}
if (process.env.DATABASE_URL && process.env.DATABASE_URL === testUrl) {
  throw new Error("La base de desarrollo y la de test no pueden compartir DATABASE_URL.");
}

const [binary, ...args] = process.argv.slice(2);
if (!binary || !["prisma", "vitest", "playwright", "next"].includes(binary)) {
  throw new Error("Comando de test no permitido.");
}

const command = path.resolve("node_modules", ".bin", binary);
const child = spawn(command, args, {
  env: { ...process.env, DATABASE_URL: testUrl },
  stdio: "inherit",
});
child.on("error", (error) => {
  console.error(error);
  process.exitCode = 1;
});
child.on("exit", (code, signal) => {
  process.exitCode = signal ? 1 : (code ?? 1);
});
