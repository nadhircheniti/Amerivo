import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AuthGuard } from "./auth/auth.guard";
import { CLOCK, systemClock } from "./common/clock";
import { DbModule } from "./db/db.module";
import { IntegrationsModule } from "./integrations/integrations.module";
import { AccountsService } from "./modules/accounts/accounts.service";
import { AdminService } from "./modules/admin/admin.service";
import { BookingsService } from "./modules/bookings/bookings.service";
import {
  AccountsController,
  AdminController,
  BookingsController,
  HealthController,
  StudentController,
  TeacherSpaceController,
  TeachersController,
  WebhooksController,
} from "./modules/controllers";
import { EarningsService } from "./modules/earnings/earnings.service";
import { LessonsService } from "./modules/lessons/lessons.service";
import { StudentsService } from "./modules/students/students.service";
import { ApplicationsService } from "./modules/teachers/applications.service";
import { TeachersService } from "./modules/teachers/teachers.service";

export const services = [AccountsService, AdminService, ApplicationsService, BookingsService, EarningsService, LessonsService, StudentsService, TeachersService];

@Module({
  imports: [DbModule, IntegrationsModule, ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }])],
  controllers: [HealthController, AccountsController, TeachersController, TeacherSpaceController, StudentController, BookingsController, AdminController, WebhooksController],
  providers: [{ provide: CLOCK, useValue: systemClock }, { provide: APP_GUARD, useClass: ThrottlerGuard }, { provide: APP_GUARD, useClass: AuthGuard }, ...services],
})
export class AppModule {}
