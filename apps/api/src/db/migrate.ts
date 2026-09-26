import "dotenv/config";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createDb } from "./db";

async function main() {
  const { db, close } = createDb(process.env.DATABASE_URL!);
  await migrate(db as never, { migrationsFolder: "drizzle" });
  await close();
  console.log("Migrations applied");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
