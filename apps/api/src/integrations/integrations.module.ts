import { Global, Module } from "@nestjs/common";
import { DailyService } from "./daily.service";
import { NotificationsService } from "./notifications.service";
import { StripeService } from "./stripe.service";

@Global()
@Module({ providers: [StripeService, DailyService, NotificationsService], exports: [StripeService, DailyService, NotificationsService] })
export class IntegrationsModule {}
