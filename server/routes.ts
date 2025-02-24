import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { getPropertyRecommendations, generatePropertyDescription } from "./openai";
import { insertPropertySchema, insertBookingSchema } from "@shared/schema";

function ensureAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) return next();
  res.status(401).end();
}

function ensureLandowner(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && req.user.role === "landowner") return next();
  res.status(403).end();
}

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Property routes
  app.post("/api/properties", ensureLandowner, async (req, res) => {
    const data = insertPropertySchema.parse(req.body);
    const property = await storage.createProperty({
      ...data,
      ownerId: req.user!.id,
      available: true,
    });
    res.json(property);
  });

  app.get("/api/properties", async (req, res) => {
    const properties = await storage.getProperties();
    res.json(properties);
  });

  app.get("/api/properties/:id", async (req, res) => {
    const property = await storage.getPropertyById(Number(req.params.id));
    if (!property) return res.status(404).end();
    res.json(property);
  });

  app.get("/api/properties/owner/:id", async (req, res) => {
    const properties = await storage.getPropertiesByOwner(Number(req.params.id));
    res.json(properties);
  });

  // Booking routes
  app.post("/api/bookings", ensureAuthenticated, async (req, res) => {
    const data = insertBookingSchema.parse(req.body);
    const booking = await storage.createBooking({
      ...data,
      tenantId: req.user!.id,
    });
    res.json(booking);
  });

  app.get("/api/bookings/tenant", ensureAuthenticated, async (req, res) => {
    const bookings = await storage.getBookingsByTenant(req.user!.id);
    res.json(bookings);
  });

  app.get("/api/bookings/property/:id", ensureLandowner, async (req, res) => {
    const bookings = await storage.getBookingsByProperty(Number(req.params.id));
    res.json(bookings);
  });

  app.post("/api/bookings/:id/status", ensureLandowner, async (req, res) => {
    const booking = await storage.updateBookingStatus(
      Number(req.params.id),
      req.body.status
    );
    res.json(booking);
  });

  // AI routes
  app.post("/api/ai/recommendations", ensureAuthenticated, async (req, res) => {
    const recommendations = await getPropertyRecommendations(req.body);
    res.json(recommendations);
  });

  app.post("/api/ai/description", ensureLandowner, async (req, res) => {
    const description = await generatePropertyDescription(req.body);
    res.json({ description });
  });

  const httpServer = createServer(app);
  return httpServer;
}