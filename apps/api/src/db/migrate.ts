import "dotenv/config";
import path from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createDb } from "./db";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  const { db, close } = createDb(process.env.DATABASE_URL);
  // Works from src/db (tsx) and dist/db (compiled): both are two levels below apps/api.
  await migrate(db as never, { migrationsFolder: path.resolve(__dirname, "../../drizzle") });
  await close();
  console.log("Migrations applied");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
