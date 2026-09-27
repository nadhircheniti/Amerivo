import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { CurrentUser, Roles, type AuthUser } from "../../auth/decorators";
import { badRequest } from "../../common/errors";
import { MarkNotificationsReadDto, SendMessageDto, StartConversationDto } from "./messaging.dto";
import { MessagingService } from "./messaging.service";

const optInt = (v?: string) => {
  if (v === undefined || v === "") return undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) throw badRequest("limit must be a number");
  return n;
};

/** Student ↔ teacher conversations. Admins are refused (403) for privacy. */
@Controller()
@Roles("student", "teacher")
export class MessagingController {
  constructor(private readonly messaging: MessagingService) {}

  @Get("conversations")
  list(@CurrentUser() user: AuthUser) {
    return this.messaging.list(user);
  }

  @Post("conversations")
  start(@CurrentUser() user: AuthUser, @Body() dto: StartConversationDto) {
    return this.messaging.start(user, dto);
  }

  @Get("conversations/:id/messages")
  messages(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string, @Query("before") before?: string, @Query("limit") limit?: string) {
    let b: Date | undefined;
    if (before) {
      b = new Date(before);
      if (Number.isNaN(b.getTime())) throw badRequest("before must be an ISO date");
    }
    return this.messaging.messages(user, id, { before: b, limit: optInt(limit) });
  }

  @Post("conversations/:id/messages") @Throttle({ default: { limit: 30, ttl: 60_000 } })
  send(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string, @Body() dto: SendMessageDto) {
    return this.messaging.send(user, id, dto.body);
  }

  @Get("messages/unread-count")
  unreadCount(@CurrentUser() user: AuthUser) {
    return this.messaging.unreadCount(user);
  }
}

/** In-app notification inbox (every role, own notifications only). */
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly messaging: MessagingService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query("limit") limit?: string) {
    return this.messaging.listNotifications(user, optInt(limit));
  }

  @Get("unread-count")
  unread(@CurrentUser() user: AuthUser) {
    return this.messaging.unreadNotifications(user);
  }

  @Post("read") @HttpCode(200)
  read(@CurrentUser() user: AuthUser, @Body() dto: MarkNotificationsReadDto) {
    return this.messaging.markNotificationsRead(user, dto.ids);
  }
}
