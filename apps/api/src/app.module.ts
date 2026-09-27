import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AuthGuard } from "./auth/auth.guard";
import { CLOCK, systemClock } from "./common/clock";
import { DbModule } from "./db/db.module";
import { IntegrationsModule } from "./integrations/integrations.module";
import { AccountsService } from "./modules/accounts/accounts.service";
import { AdminService } from "./modules/admin/admin.service";
import { AdminSpaceController } from "./modules/admin-space/admin-space.controller";
import { AdminSpaceService } from "./modules/admin-space/admin-space.service";
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
import { AdminDisputesController, BookingDisputesController } from "./modules/disputes/disputes.controller";
import { DisputesService } from "./modules/disputes/disputes.service";
import { EarningsService } from "./modules/earnings/earnings.service";
import { MessagingController, NotificationsController } from "./modules/messaging/messaging.controller";
import { MessagingService } from "./modules/messaging/messaging.service";
import { LessonsService } from "./modules/lessons/lessons.service";
import { StudentsService } from "./modules/students/students.service";
import { StudentAccountController, StudentSpaceController } from "./modules/student-space/student-space.controller";
import { StudentSpaceService } from "./modules/student-space/student-space.service";
import { ApplicationsService } from "./modules/teachers/applications.service";
import { TeachersService } from "./modules/teachers/teachers.service";
import { FilesController } from "./modules/files/files.controller";
import { FilesService } from "./modules/files/files.service";
import { TeacherDashboardController } from "./modules/teacher-space/teacher-space.controller";
import { TeacherSpaceService } from "./modules/teacher-space/teacher-space.service";

export const services = [AccountsService, AdminService, ApplicationsService, BookingsService, EarningsService, LessonsService, StudentsService, TeachersService, StudentSpaceService, MessagingService, AdminSpaceService, DisputesService, FilesService, TeacherSpaceService];

@Module({
  imports: [DbModule, IntegrationsModule, ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }])],
  controllers: [HealthController, AccountsController, TeachersController, TeacherSpaceController, StudentController, StudentSpaceController, StudentAccountController, BookingsController, AdminController, WebhooksController, MessagingController, NotificationsController, AdminSpaceController, BookingDisputesController, AdminDisputesController, FilesController, TeacherDashboardController],
  providers: [{ provide: CLOCK, useValue: systemClock }, { provide: APP_GUARD, useClass: ThrottlerGuard }, { provide: APP_GUARD, useClass: AuthGuard }, ...services],
})
export class AppModule {}
