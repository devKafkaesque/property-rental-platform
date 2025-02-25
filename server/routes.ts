import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import {
  insertPropertySchema,
  insertViewingRequestSchema,
  insertBookingSchema,
  insertReviewSchema,
  insertTenantContractSchema
} from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { generatePropertyDescription, analyzePricing } from "./openai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

export function ensureAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: "Authentication required" });
}

export function ensureLandowner(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && req.user.role === "landowner") return next();
  res.status(403).json({ error: "Access denied" });
}

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);
  const httpServer = createServer(app);

  // Serve uploaded files first
  app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

  // Property routes
  app.get("/api/properties", async (req, res) => {
    try {
      const properties = await storage.getProperties();
      console.log('Retrieved properties:', properties);
      res.json(properties);
    } catch (error) {
      console.error('Error getting properties:', error);
      res.status(500).json({ error: "Failed to get properties" });
    }
  });

  app.post("/api/properties", ensureLandowner, upload.array('image', 5), async (req, res) => {
    try {
      let propertyData;
      try {
        propertyData = JSON.parse(req.body.data);
      } catch (error) {
        console.error('Error parsing property data:', error);
        return res.status(400).json({ error: "Invalid property data format" });
      }

      // Add image paths if images were uploaded
      const images = (req.files as Express.Multer.File[])?.map(file => `/uploads/${file.filename}`) || [];
      propertyData.images = images;

      // Validate the data
      const validatedData = insertPropertySchema.parse({
        ...propertyData,
        yearBuilt: null,
        parkingSpaces: 0,
        petsAllowed: false,
        utilities: [],
        amenities: [],
        accessibility: [],
        securityFeatures: [],
        maintainanceHistory: []
      });

      // Create the property
      const property = await storage.createProperty({
        ...validatedData,
        ownerId: req.user!.id,
        status: "available",
        connectionCode: null
      });

      res.json(property);
    } catch (error) {
      console.error('Error creating property:', error);
      if (error instanceof Error) {
        res.status(400).json({
          error: "Failed to create property",
          details: error.message
        });
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  app.get("/api/properties/:id", async (req, res) => {
    const property = await storage.getPropertyById(Number(req.params.id));
    if (!property) return res.status(404).json({error: "Property not found"});
    res.json(property);
  });

  app.get("/api/properties/owner/:id", async (req, res) => {
    const properties = await storage.getPropertiesByOwner(Number(req.params.id));
    res.json(properties);
  });

  app.post("/api/properties/:id/connection-code", ensureLandowner, async (req, res) => {
    try {
      const propertyId = Number(req.params.id);
      const property = await storage.getPropertyById(propertyId);

      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }

      if (property.ownerId !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      await storage.updatePropertyConnectionCode(propertyId, code);

      res.json({ connectionCode: code });
    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ error: "Server error" });
    }
  });


  app.post("/api/properties/connect/:code", ensureAuthenticated, async (req, res) => {
    try {
      if (req.user!.role !== "tenant") {
        return res.status(403).json({ error: "Only tenants can connect to properties" });
      }

      const code = req.params.code.toUpperCase();

      // Find property with matching connection code
      const properties = await storage.getProperties();
      const property = properties.find(p => p.connectionCode === code);

      if (!property) {
        return res.status(404).json({ error: "Invalid connection code" });
      }

      if (property.status !== "available") {
        return res.status(400).json({ error: "Property is not available for connection" });
      }

      // Calculate end date (1 year from start)
      const startDate = new Date();
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1);

      // Create tenant contract
      const contract = await storage.createTenantContract({
        propertyId: property.id,
        tenantId: req.user!.id,
        landownerId: property.ownerId,
        startDate,
        endDate,
        contractStatus: "active",
        depositPaid: false,
        rentAmount: property.rentPrice,
        depositAmount: property.depositAmount
      });

      // Update property status
      await storage.updateProperty(property.id, {
        status: "rented",
        connectionCode: null
      });

      res.json({ success: true, propertyId: property.id });
    } catch (err) {
      console.error('Error connecting to property:', err);
      if (err instanceof Error) {
        return res.status(400).json({ error: err.message });
      }
      return res.status(500).json({ error: "Failed to connect to property" });
    }
  });

  // Viewing Request routes
  app.post("/api/viewing-requests", ensureAuthenticated, async (req, res) => {
    if (req.user!.role !== "tenant") {
      return res.status(403).json({ error: "Only tenants can request property viewings" });
    }

    try {
      const data = insertViewingRequestSchema.parse(req.body);

      // Check if tenant has an active request for this property
      const existingRequests = await storage.getViewingRequestsByTenant(req.user!.id);
      const hasActiveRequest = existingRequests.some(request => {
        return request.propertyId === data.propertyId &&
               request.tenantId === req.user!.id &&
               request.status !== 'cancelled' &&
               request.status !== 'completed';
      });

      if (hasActiveRequest) {
        return res.status(403).json({
          error: "You already have an active viewing request for this property. Please wait for it to be completed or cancelled before making another request."
        });
      }

      const request = await storage.createViewingRequest({
        ...data,
        tenantId: req.user!.id,
      });
      res.json(request);
    } catch (error) {
      console.error('Error creating viewing request:', error);
      res.status(500).json({ error: "Failed to create viewing request" });
    }
  });

  app.get("/api/viewing-requests/tenant/:propertyId", ensureAuthenticated, async (req, res) => {
    if (req.user!.role !== "tenant") {
      return res.status(403).json({ error: "Access denied" });
    }

    const propertyId = Number(req.params.propertyId);
    console.log(`Tenant ${req.user!.id} requesting viewing requests for property ${propertyId}`);

    try {
      const requests = await storage.getViewingRequestsByTenantAndProperty(req.user!.id, propertyId);
      console.log(`Found ${requests.length} requests for tenant ${req.user!.id} and property ${propertyId}`);
      res.json(requests);
    } catch (error) {
      console.error('Error fetching viewing requests:', error);
      res.status(500).json({ error: "Failed to fetch viewing requests" });
    }
  });

  app.get("/api/viewing-requests/property/:id", ensureLandowner, async (req, res) => {
    try {
      const requests = await storage.getViewingRequestsByProperty(Number(req.params.id));
      res.json(requests);
    } catch (error) {
      console.error('Error fetching property viewing requests:', error);
      res.status(500).json({ error: "Failed to fetch viewing requests" });
    }
  });

  app.put("/api/viewing-requests/:id/status", ensureLandowner, async (req, res) => {
    try {
      const request = await storage.updateViewingStatus(
        Number(req.params.id),
        req.body.status
      );
      res.json(request);
    } catch (error) {
      console.error('Error updating viewing request status:', error);
      res.status(500).json({ error: "Failed to update viewing request status" });
    }
  });

  app.post("/api/viewing-requests/:id/status", ensureLandowner, async (req, res) => {
    try {
      const request = await storage.updateViewingStatus(
        Number(req.params.id),
        req.body.status
      );
      res.json(request);
    } catch (error) {
      console.error('Error updating viewing request status:', error);
      res.status(500).json({ error: "Failed to update viewing request status" });
    }
  });

  // Add Maintenance Request routes
  app.post("/api/maintenance-requests", ensureAuthenticated, async (req, res) => {
    if (req.user!.role !== "tenant") {
      return res.status(403).json({ error: "Only tenants can submit maintenance requests" });
    }

    try {
      const data = insertMaintenanceRequestSchema.parse(req.body);

      // Verify tenant is connected to the property
      const contracts = await storage.getTenantContractsByTenant(req.user!.id);
      const isConnected = contracts.some(contract =>
        contract.propertyId === data.propertyId &&
        contract.contractStatus === "active"
      );

      if (!isConnected) {
        return res.status(403).json({
          error: "You can only submit maintenance requests for properties you are connected to"
        });
      }

      const request = await storage.createMaintenanceRequest({
        ...data,
        tenantId: req.user!.id,
      });
      res.json(request);
    } catch (error) {
      console.error('Error creating maintenance request:', error);
      res.status(500).json({ error: "Failed to create maintenance request" });
    }
  });

  app.get("/api/maintenance-requests/tenant/:propertyId", ensureAuthenticated, async (req, res) => {
    if (req.user!.role !== "tenant") {
      return res.status(403).json({ error: "Access denied" });
    }

    try {
      const propertyId = Number(req.params.propertyId);
      const requests = await storage.getMaintenanceRequestsByTenant(req.user!.id);
      const propertyRequests = requests.filter(request => request.propertyId === propertyId);
      res.json(propertyRequests);
    } catch (error) {
      console.error('Error fetching maintenance requests:', error);
      res.status(500).json({ error: "Failed to fetch maintenance requests" });
    }
  });

  app.get("/api/maintenance-requests/property/:id", ensureLandowner, async (req, res) => {
    try {
      const requests = await storage.getMaintenanceRequestsByProperty(Number(req.params.id));
      res.json(requests);
    } catch (error) {
      console.error('Error fetching property maintenance requests:', error);
      res.status(500).json({ error: "Failed to fetch maintenance requests" });
    }
  });

  app.post("/api/maintenance-requests/:id/status", ensureLandowner, async (req, res) => {
    try {
      const request = await storage.updateMaintenanceStatus(
        Number(req.params.id),
        req.body.status
      );
      res.json(request);
    } catch (error) {
      console.error('Error updating maintenance request status:', error);
      res.status(500).json({ error: "Failed to update maintenance request status" });
    }
  });

  app.post("/api/maintenance-requests/:id/notes", ensureLandowner, async (req, res) => {
    try {
      const request = await storage.updateMaintenanceNotes(
        Number(req.params.id),
        req.body.notes
      );
      res.json(request);
    } catch (error) {
      console.error('Error updating maintenance request notes:', error);
      res.status(500).json({ error: "Failed to update maintenance request notes" });
    }
  });

  // AI routes
  app.post("/api/ai/description", async (req, res) => {
    try {
      const details = req.body;
      const description = await generatePropertyDescription(details);
      res.json(description);
    } catch (error) {
      console.error('OpenAI API Error:', error);
      res.status(500).json({
        error: "Failed to generate description",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/ai/pricing", async (req, res) => {
    try {
      const details = req.body;
      const pricing = await analyzePricing(details);
      res.json(pricing);
    } catch (error) {
      console.error('OpenAI API Error:', error);
      res.status(500).json({
        error: "Failed to analyze pricing",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  return httpServer;
}