import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { verifyToken } from "@clerk/backend";
import { eq } from "drizzle-orm";
import { DB, type Db } from "../db/db";
import { users } from "../db/schema";
import { forbidden } from "../common/errors";
import { ALLOW_UNREGISTERED, IS_PUBLIC, ROLES, type AuthUser, type Role } from "./decorators";

/**
 * Global guard: verifies the Clerk session token (Authorization: Bearer <jwt>),
 * loads the Amerivo user and enforces @Roles(). Blocked users are rejected.
 * Local development can set DEV_AUTH=1 and send `x-dev-user: <clerkId>` instead.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(DB) private readonly db: Db,
  ) {}

  async canActivate(ctx: ExecutionContext) {
    const targets = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;

    const req = ctx.switchToHttp().getRequest<{ headers: Record<string, string | undefined>; clerkId?: string; user?: AuthUser }>();
    const clerkId = await this.resolveClerkId(req);
    req.clerkId = clerkId;
    const [row] = await this.db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);
    if (!row && this.reflector.getAllAndOverride<boolean>(ALLOW_UNREGISTERED, targets)) return true;
    if (!row) throw new UnauthorizedException("No Amerivo account for this session");
    if (row.status === "blocked" || row.status === "deleted") throw forbidden("This account is disabled");

    const user: AuthUser = { id: row.id, clerkId: row.clerkId, role: row.role, status: row.status, timezone: row.timezone, firstName: row.firstName };
    req.user = user;

    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES, targets);
    if (roles?.length && !roles.includes(user.role)) throw forbidden();
    return true;
  }

  private async resolveClerkId(req: { headers: Record<string, string | undefined> }) {
    const devUser = req.headers["x-dev-user"];
    if (devUser && process.env.DEV_AUTH === "1" && process.env.NODE_ENV !== "production") return devUser;

    const header = req.headers.authorization ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : undefined;
    if (!token) throw new UnauthorizedException("Missing session token");
    try {
      const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
      return payload.sub;
    } catch {
      throw new UnauthorizedException("Invalid session token");
    }
  }
}
