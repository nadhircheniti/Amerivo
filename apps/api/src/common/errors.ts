import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";

export const notFound = (what: string) => new NotFoundException(`${what} not found`);
export const badRequest = (msg: string) => new BadRequestException(msg);
export const conflict = (msg: string) => new ConflictException(msg);
export const forbidden = (msg = "You don't have access to this resource") => new ForbiddenException(msg);
