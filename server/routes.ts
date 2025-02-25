import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertViewingRequestSchema } from "@shared/schema";

export function ensureAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) return next();
  res.status(401).end();
}

export function ensureLandowner(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && req.user.role === "landowner") return next();
  res.status(403).end();
}

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);
  const httpServer = createServer(app);

  // Viewing Request routes
  app.post("/api/viewing-requests", ensureAuthenticated, async (req, res) => {
    // Ensure only tenants can request viewings
    if (req.user!.role !== "tenant") {
      return res.status(403).json({ error: "Only tenants can request property viewings" });
    }

    const data = insertViewingRequestSchema.parse(req.body);

    // Check if tenant has made a request for this property in the last month
    const existingRequests = await storage.getViewingRequestsByTenant(req.user!.id);
    const hasRecentRequest = existingRequests.some(request => {
      const requestDate = new Date(request.createdAt);
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      // Only check for pending or approved requests from this tenant
      return request.propertyId === data.propertyId && 
             request.tenantId === req.user!.id && 
             request.status !== 'cancelled' &&
             request.status !== 'completed' &&
             requestDate > oneMonthAgo;
    });

    if (hasRecentRequest) {
      return res.status(403).json({
        error: "You already have an active viewing request for this property. Please wait for it to be completed or cancelled before making another request."
      });
    }

    const request = await storage.createViewingRequest({
      ...data,
      tenantId: req.user!.id,
    });
    res.json(request);
  });

  // Get viewing requests for a specific property and tenant
  app.get("/api/viewing-requests/tenant/:propertyId", ensureAuthenticated, async (req, res) => {
    if (req.user!.role !== "tenant") {
      return res.status(403).json({ error: "Access denied" });
    }

    const propertyId = Number(req.params.propertyId);
    console.log(`Tenant ${req.user!.id} requesting viewing requests for property ${propertyId}`);

    const requests = await storage.getViewingRequestsByTenantAndProperty(req.user!.id, propertyId);
    console.log(`Found ${requests.length} requests for tenant ${req.user!.id} and property ${propertyId}`);

    res.json(requests);
  });

  return httpServer;
}