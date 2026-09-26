import { Global, Inject, Module, type OnApplicationShutdown } from "@nestjs/common";
import { createDb, DB } from "./db";

const handle = { close: async () => {} };

@Global()
@Module({
  providers: [
    {
      provide: DB,
      useFactory: () => {
        const url = process.env.DATABASE_URL;
        if (!url) throw new Error("DATABASE_URL is not set");
        const { db, close } = createDb(url);
        handle.close = close;
        return db;
      },
    },
  ],
  exports: [DB],
})
export class DbModule implements OnApplicationShutdown {
  constructor(@Inject(DB) _db: unknown) {}
  async onApplicationShutdown() {
    await handle.close();
  }
}
