const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || new URL(databaseUrl).pathname !== "/gastobot_test") {
  throw new Error("Los tests de integración requieren la base gastobot_test.");
}
