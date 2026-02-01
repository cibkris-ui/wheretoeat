import type { RequestHandler } from "express";
import { storage } from "./storage";
import type { AuthenticatedRequest } from "./types";

/**
 * Combined authentication middleware - checks both session-based and Replit OIDC auth.
 */
export const isAuthenticatedCombined: RequestHandler = async (req: any, res, next) => {
  if (req.session?.userId) {
    req.localUserId = req.session.userId;
    return next();
  }

  if (req.isAuthenticated?.() && req.user?.claims?.sub) {
    req.localUserId = req.user.claims.sub;
    return next();
  }

  return res.status(401).json({ message: "Non autorisé" });
};

/**
 * Middleware that verifies the authenticated user owns the restaurant specified by :id param.
 * Sets req.restaurant on success. Must be used after isAuthenticatedCombined.
 */
export const requireRestaurantOwner: RequestHandler = async (req: any, res, next) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ message: "Identifiant de restaurant invalide" });
  }

  const restaurant = await storage.getRestaurant(id);
  if (!restaurant) {
    return res.status(404).json({ message: "Restaurant introuvable" });
  }

  const userId = req.localUserId;
  if (restaurant.ownerId !== userId) {
    return res.status(403).json({ message: "Non autorisé pour ce restaurant" });
  }

  req.restaurant = restaurant;
  next();
};

/**
 * Admin-only middleware. Checks user is authenticated and has isAdmin flag.
 */
export const isAdmin: RequestHandler = async (req: any, res, next) => {
  const userId = req.session?.userId || req.user?.claims?.sub;
  if (!userId) {
    return res.status(401).json({ message: "Non autorisé" });
  }
  const user = await storage.getUser(userId);
  if (!user?.isAdmin) {
    return res.status(403).json({ message: "Accès administrateur requis" });
  }
  req.localUserId = userId;
  next();
};
