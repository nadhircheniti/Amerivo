import { createParamDecorator, SetMetadata, type ExecutionContext } from "@nestjs/common";

export type Role = "student" | "teacher" | "admin";
export interface AuthUser {
  id: string;
  clerkId: string;
  role: Role;
  status: string;
  timezone: string;
  firstName: string;
}

export const IS_PUBLIC = "isPublic";
export const ROLES = "roles";
export const ALLOW_UNREGISTERED = "allowUnregistered";
export const ALLOW_WITHOUT_TERMS = "allowWithoutTerms";

/** Route is reachable without a session. */
export const Public = () => SetMetadata(IS_PUBLIC, true);
/** Valid Clerk session required, but no Amerivo account yet (sign-up completion). */
export const AllowUnregistered = () => SetMetadata(ALLOW_UNREGISTERED, true);
/** Reachable by a signed-in user who hasn't accepted the current Terms of Service yet (GET /me, POST /me/terms). */
export const AllowWithoutTerms = () => SetMetadata(ALLOW_WITHOUT_TERMS, true);
/** Restrict a route to some roles. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES, roles);
/** Inject the signed-in user. */
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser => ctx.switchToHttp().getRequest().user);
/** Clerk user id of the session (available on @AllowUnregistered routes). */
export const ClerkId = createParamDecorator((_: unknown, ctx: ExecutionContext): string => ctx.switchToHttp().getRequest().clerkId);
