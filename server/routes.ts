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
  res.status(401).end();
}

export function ensureLandowner(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && req.user.role === "landowner") return next();
  res.status(403).end();
}

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);
  const httpServer = createServer(app);

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

  app.post("/api/properties", ensureLandowner, upload.single('image'), async (req, res) => {
    try {
      const data = insertPropertySchema.parse({...req.body, image: req.file?.filename});
      const property = await storage.createProperty({
        ...data,
        ownerId: req.user!.id,
        status: "available"
      });
      res.json(property);
    } catch (error) {
      console.error('Error creating property:', error);
      res.status(500).json({ error: "Failed to create property" });
    }
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

  app.post("/api/properties/:id/connection-code", ensureLandowner, async (req, res) => {
    try {
      const propertyId = Number(req.params.id);
      const property = await storage.getPropertyById(propertyId);

      if (!property) {
        res.status(404);
        res.json({ error: "Property not found" });
        return;
      }

      if (property.ownerId !== req.user!.id) {
        res.status(403);
        res.json({ error: "Not authorized" });
        return;
      }

      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      await storage.updatePropertyConnectionCode(propertyId, code);

      res.json({ connectionCode: code });
    } catch (err) {
      console.error('Error:', err);
      res.status(500);
      res.json({ error: "Server error" });
    }
  });


  app.post("/api/properties/connect/:code", ensureAuthenticated, async (req, res) => {
    try {
      if (req.user!.role !== "tenant") {
        res.status(403);
        return res.json({ error: "Only tenants can connect to properties" });
      }

      const code = req.params.code.toUpperCase();

      // Find property with matching connection code
      const properties = await storage.getProperties();
      const property = properties.find(p => p.connectionCode === code);

      if (!property) {
        res.status(404);
        return res.json({ error: "Invalid connection code" });
      }

      if (property.status !== "available") {
        res.status(400);
        return res.json({ error: "Property is not available for connection" });
      }

      // Create tenant contract
      const contract = await storage.createTenantContract({
        propertyId: property.id,
        tenantId: req.user!.id,
        landownerId: property.ownerId,
        startDate: new Date(),
        endDate: null,
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
      console.error('Error:', err);
      res.status(500);
      res.json({ error: "Server error" });
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

  // Serve uploaded files
  app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

  return httpServer;
}