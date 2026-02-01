import { Request } from "express";
import { Restaurant } from "@shared/schema";

export interface AuthenticatedRequest extends Request {
  localUserId: string;
  restaurant?: Restaurant;
  session: Request["session"] & { userId?: string };
}
