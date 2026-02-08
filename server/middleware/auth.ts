import type { RequestHandler } from "express";
import { storage } from "../services/storage";

export const requireAuth: RequestHandler = async (req: any, res, next) => {
  if (req.session?.userId) {
    req.userId = req.session.userId;
    return next();
  }
  return res.status(401).json({ message: "Non autorisé" });
};

export const requireAdmin: RequestHandler = async (req: any, res, next) => {
  const userId = req.session?.userId;
  if (!userId) {
    return res.status(401).json({ message: "Non autorisé" });
  }
  const user = await storage.getUser(userId);
  if (!user?.isAdmin) {
    return res.status(403).json({ message: "Accès administrateur requis" });
  }
  req.userId = userId;
  next();
};

export const requireRestaurantAccess: RequestHandler = async (req: any, res, next) => {
  const userId = req.session?.userId;
  if (!userId) {
    return res.status(401).json({ message: "Non autorisé" });
  }

  const restaurantId = parseInt(req.params.id || req.params.restaurantId);
  if (isNaN(restaurantId)) {
    return res.status(400).json({ message: "Identifiant de restaurant invalide" });
  }

  const restaurant = await storage.getRestaurant(restaurantId);
  if (!restaurant) {
    return res.status(404).json({ message: "Restaurant introuvable" });
  }

  // Owner has access
  if (restaurant.ownerId === userId) {
    req.userId = userId;
    req.restaurant = restaurant;
    return next();
  }

  // Team member has access
  const teamAccess = await storage.getRestaurantUsers(restaurantId);
  const hasAccess = teamAccess.some(u => u.userId === userId);
  if (hasAccess) {
    req.userId = userId;
    req.restaurant = restaurant;
    return next();
  }

  // Admin has access
  const user = await storage.getUser(userId);
  if (user?.isAdmin) {
    req.userId = userId;
    req.restaurant = restaurant;
    return next();
  }

  return res.status(403).json({ message: "Non autorisé pour ce restaurant" });
};
