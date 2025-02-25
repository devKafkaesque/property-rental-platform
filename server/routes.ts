import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { getPropertyRecommendations, generatePropertyDescription, analyzePricing } from "./openai";
import { insertPropertySchema, insertBookingSchema, insertReviewSchema, insertViewingRequestSchema, insertTenantContractSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function ensureAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) return next();
  res.status(401).end();
}

function ensureLandowner(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && req.user.role === "landowner") return next();
  res.status(403).end();
}

// Configure multer for image uploads
const multerStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: multerStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Property routes
  app.post("/api/properties", ensureLandowner, async (req, res) => {
    const data = insertPropertySchema.parse(req.body);
    const property = await storage.createProperty({
      ...data,
      ownerId: req.user!.id,
      status: "available",
      maintainanceHistory: [], // Initialize empty maintenance history
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

  app.patch("/api/properties/:id", ensureLandowner, async (req, res) => {
    const property = await storage.getPropertyById(Number(req.params.id));
    if (!property) return res.status(404).end();
    if (property.ownerId !== req.user!.id) return res.status(403).end();

    const data = insertPropertySchema.partial().parse(req.body);
    const updatedProperty = await storage.updateProperty(Number(req.params.id), {
      ...data,
      status: property.status, // Preserve the existing status
    });
    res.json(updatedProperty);
  });

  // Image upload route
  app.post("/api/upload", ensureAuthenticated, upload.array('images', 10), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      const urls = files.map(file => `/uploads/${file.filename}`);
      res.json({ urls });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Failed to upload files' });
    }
  });

  // Serve uploaded files
  app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

  // Tenant Contract routes
  app.post("/api/tenant-contracts", ensureLandowner, async (req, res) => {
    const data = insertTenantContractSchema.parse(req.body);

    // Ensure the property belongs to the landowner
    const property = await storage.getPropertyById(data.propertyId);
    if (!property || property.ownerId !== req.user!.id) {
      return res.status(403).json({ error: "You can only create contracts for your own properties" });
    }

    const contract = await storage.createTenantContract({
      ...data,
      landownerId: req.user!.id,
    });

    // Update property status to rented
    await storage.updateProperty(data.propertyId, { status: "rented" });

    res.json(contract);
  });

  app.get("/api/tenant-contracts/property/:id", ensureLandowner, async (req, res) => {
    const property = await storage.getPropertyById(Number(req.params.id));
    if (!property || property.ownerId !== req.user!.id) {
      return res.status(403).json({ error: "Access denied" });
    }
    const contracts = await storage.getTenantContractsByProperty(Number(req.params.id));
    res.json(contracts);
  });

  app.get("/api/tenant-contracts/tenant", ensureAuthenticated, async (req, res) => {
    if (req.user!.role !== "tenant") {
      return res.status(403).json({ error: "Access denied" });
    }
    const contracts = await storage.getTenantContractsByTenant(req.user!.id);
    res.json(contracts);
  });

  app.get("/api/tenant-contracts/landowner", ensureLandowner, async (req, res) => {
    const contracts = await storage.getTenantContractsByLandowner(req.user!.id);
    res.json(contracts);
  });

  app.patch("/api/tenant-contracts/:id", ensureLandowner, async (req, res) => {
    const contract = await storage.getTenantContractsByProperty(Number(req.params.id));
    if (!contract || contract[0].landownerId !== req.user!.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    const updates = insertTenantContractSchema.partial().parse(req.body);
    const updatedContract = await storage.updateTenantContract(Number(req.params.id), updates);
    res.json(updatedContract);
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
    try {
      const description = await generatePropertyDescription(req.body);
      res.json(description);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: errorMessage });
    }
  });

  app.post("/api/ai/pricing", ensureLandowner, async (req, res) => {
    try {
      const pricing = await analyzePricing(req.body);
      res.json(pricing);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: errorMessage });
    }
  });

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
      return request.propertyId === data.propertyId && requestDate > oneMonthAgo;
    });

    if (hasRecentRequest) {
      return res.status(403).json({
        error: "You can only request one viewing per property per month"
      });
    }

    const request = await storage.createViewingRequest({
      ...data,
      tenantId: req.user!.id,
    });
    res.json(request);
  });

  app.get("/api/viewing-requests/property/:id", ensureLandowner, async (req, res) => {
    const requests = await storage.getViewingRequestsByProperty(Number(req.params.id));
    res.json(requests);
  });

  app.get("/api/viewing-requests/tenant", ensureAuthenticated, async (req, res) => {
    if (req.user!.role !== "tenant") {
      return res.status(403).json({ error: "Access denied" });
    }
    const requests = await storage.getViewingRequestsByTenant(req.user!.id);
    res.json(requests);
  });

  app.post("/api/viewing-requests/:id/status", ensureLandowner, async (req, res) => {
    const request = await storage.updateViewingStatus(
      Number(req.params.id),
      req.body.status
    );
    res.json(request);
  });

  // Review routes - Updated to require completed viewing
  app.post("/api/reviews", ensureAuthenticated, async (req, res) => {
    // Ensure only tenants can submit reviews
    if (req.user!.role !== "tenant") {
      return res.status(403).json({ error: "Only tenants can submit reviews" });
    }

    const data = insertReviewSchema.parse(req.body);

    // Check if the viewing exists and is completed
    const completedViewings = await storage.getCompletedViewings(req.user!.id, data.propertyId);
    const validViewing = completedViewings.find(v => v.id === data.viewingId);

    if (!validViewing) {
      return res.status(403).json({
        error: "You can only review properties after completing a viewing"
      });
    }

    const review = await storage.createReview({
      ...data,
      tenantId: req.user!.id,
    });
    res.json(review);
  });

  app.get("/api/reviews/property/:id", async (req, res) => {
    const reviews = await storage.getReviewsByProperty(Number(req.params.id));
    res.json(reviews);
  });

  app.get("/api/reviews/tenant", ensureAuthenticated, async (req, res) => {
    if (req.user!.role !== "tenant") {
      return res.status(403).json({ error: "Access denied" });
    }
    const reviews = await storage.getReviewsByTenant(req.user!.id);
    res.json(reviews);
  });

  app.post("/api/reviews/:id/status", ensureLandowner, async (req, res) => {
    const review = await storage.updateReviewStatus(
      Number(req.params.id),
      req.body.status
    );
    res.json(review);
  });

  // Generate new connection code for a property
  app.post("/api/properties/:id/connection-code", ensureLandowner, async (req, res) => {
    try {
      const property = await storage.getPropertyById(Number(req.params.id));
      if (!property) return res.status(404).json({ error: "Property not found" });
      if (property.ownerId !== req.user!.id) return res.status(403).json({ error: "Not authorized" });

      // Generate a unique 8-character code
      const connectionCode = crypto.randomBytes(4).toString('hex');

      const updatedProperty = await storage.updateProperty(Number(req.params.id), {
        connectionCode,
        status: property.status // preserve existing status
      });

      console.log('Generated connection code:', connectionCode); // Debug log
      res.json({ connectionCode });
    } catch (error) {
      console.error('Error generating connection code:', error);
      res.status(500).json({ error: "Failed to generate connection code" });
    }
  });

  // Connect tenant to property using code
  app.post("/api/properties/connect/:code", ensureAuthenticated, async (req, res) => {
    try {
      if (req.user!.role !== "tenant") {
        return res.status(403).json({ error: "Only tenants can connect to properties" });
      }

      // Try both direct ID and connection code lookup
      let property = null;
      const propertyId = Number(req.params.code);

      if (!isNaN(propertyId)) {
        property = await storage.getPropertyById(propertyId);
      }

      if (!property) {
        const allProperties = await storage.getProperties();
        property = allProperties.find(p => p.connectionCode === req.params.code);
      }

      if (!property) {
        console.log('No property found for code:', req.params.code); // Debug log
        return res.status(404).json({ error: "Invalid connection code" });
      }

      console.log('Found property:', property); // Debug log

      if (property.status !== "available") {
        return res.status(400).json({ error: "This property is not available for connection" });
      }

      // Create a tenant contract
      const contract = await storage.createTenantContract({
        propertyId: property.id,
        tenantId: req.user!.id,
        landownerId: property.ownerId,
        startDate: new Date(),
        endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)), // Default 1 year
        rentAmount: property.rentPrice,
        documents: [],
        depositPaid: false,
        contractStatus: "active"
      });

      // Update property status to rented and clear connection code
      await storage.updateProperty(property.id, {
        status: "rented",
        connectionCode: null, // Clear the code after successful connection
      });

      res.json({ contract });
    } catch (error) {
      console.error('Error connecting to property:', error);
      res.status(500).json({ error: "Failed to establish connection" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}