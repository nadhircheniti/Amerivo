import "reflect-metadata";
import "dotenv/config";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { corsOrigins } from "./common/cors";

async function bootstrap() {
  // rawBody is required to verify Stripe webhook signatures.
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.use(helmet());
  app.setGlobalPrefix("api");
  app.enableCors({ origin: corsOrigins(process.env.WEB_URL ?? "http://localhost:3000"), credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.enableShutdownHooks();
  await app.listen(Number(process.env.PORT ?? 4000));
}
void bootstrap();
