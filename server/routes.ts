import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import {
  insertPropertySchema,
  insertViewingRequestSchema,
  insertBookingSchema,
  insertReviewSchema,
  insertTenantContractSchema,
  insertMaintenanceRequestSchema
} from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { generatePropertyDescription, analyzePricing, compareProperties } from "./gemini";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

  app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

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

      const images = (req.files as Express.Multer.File[])?.map(file => `/uploads/${file.filename}`) || [];
      propertyData.images = images;

      const validatedData = insertPropertySchema.parse({
        ...propertyData,
      });

      const property = await storage.createProperty({
        ...validatedData,
        ownerId: req.user!.id,
        status: "available" as const,
        connectionCode: null,
        yearBuilt: null,
        parkingSpaces: 0,
        petsAllowed: false,
        utilities: [],
        amenities: [],
        accessibility: [],
        securityFeatures: [],
        maintainanceHistory: []
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
    try {
      const properties = await storage.getPropertiesByOwner(Number(req.params.id));
      console.log(`Retrieved properties for owner ${req.params.id}:`, properties);
      res.json(properties);
    } catch (error) {
      console.error('Error fetching owner properties:', error);
      res.status(500).json({ error: "Failed to fetch owner properties" });
    }
  });

  app.get("/api/tenant-contracts/tenant", ensureAuthenticated, async (req, res) => {
    try {
      if (req.user!.role !== "tenant") {
        return res.status(403).json({ error: "Access denied" });
      }
      const contracts = await storage.getTenantContractsByTenant(req.user!.id);
      console.log(`Retrieved contracts for tenant ${req.user!.id}:`, contracts);
      res.json(contracts);
    } catch (error) {
      console.error('Error fetching tenant contracts:', error);
      res.status(500).json({ error: "Failed to fetch tenant contracts" });
    }
  });

  app.get("/api/tenant-contracts/landowner", ensureAuthenticated, async (req, res) => {
    try {
      if (req.user!.role !== "landowner") {
        return res.status(403).json({ error: "Access denied" });
      }
      const contracts = await storage.getTenantContractsByLandowner(req.user!.id);
      console.log(`Retrieved contracts for landowner ${req.user!.id}:`, contracts);
      res.json(contracts);
    } catch (error) {
      console.error('Error fetching landowner contracts:', error);
      res.status(500).json({ error: "Failed to fetch landowner contracts" });
    }
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

      const properties = await storage.getProperties();
      const property = properties.find(p => p.connectionCode === code);

      if (!property) {
        return res.status(404).json({ error: "Invalid connection code" });
      }

      // Check if property is already rented
      const existingContracts = await storage.getTenantContractsByProperty(property.id);
      const hasActiveContract = existingContracts.some(c => c.contractStatus === "active");

      if (hasActiveContract) {
        return res.status(400).json({ error: "Property is already rented" });
      }

      const startDate = new Date();
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1);

      const contract = await storage.createTenantContract({
        propertyId: property.id,
        tenantId: req.user!.id,
        landownerId: property.ownerId,
        startDate,
        endDate,
        contractStatus: "active",
        depositPaid: false,
        rentAmount: property.rentPrice,
        documents: []
      });

      // Always update property status to rented when a tenant connects
      await storage.updateProperty(property.id, {
        status: "rented" as const,
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

  app.post("/api/viewing-requests", ensureAuthenticated, async (req, res) => {
    if (req.user!.role !== "tenant") {
      return res.status(403).json({ error: "Only tenants can request property viewings" });
    }

    try {
      const data = insertViewingRequestSchema.parse(req.body);

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
        message: data.message || null
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
      const requestsWithTenants = await Promise.all(requests.map(async request => {
        const tenant = await storage.getUser(request.tenantId);
        return {
          ...request,
          tenantName: tenant?.username || 'Unknown User'
        };
      }));
      res.json(requestsWithTenants);
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

  app.post("/api/maintenance-requests", ensureAuthenticated, async (req, res) => {
    if (req.user!.role !== "tenant") {
      return res.status(403).json({ error: "Only tenants can submit maintenance requests" });
    }

    try {
      const data = insertMaintenanceRequestSchema.parse(req.body);

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
        updatedAt: new Date(),
        completedAt: null,
        notes: null,
        landlordNotes: null,
        tenantReview: null
      });

      console.log('Created maintenance request:', request);
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
      const requestsWithTenants = await Promise.all(requests.map(async request => {
        const tenant = await storage.getUser(request.tenantId);
        return {
          ...request,
          tenantName: tenant?.username || 'Unknown User'
        };
      }));
      console.log('Maintenance requests with tenant details:', requestsWithTenants);
      res.json(requestsWithTenants);
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

  app.get("/api/maintenance-requests/all", ensureLandowner, async (req, res) => {
    try {
      const properties = await storage.getPropertiesByOwner(req.user!.id);

      const requests = await Promise.all(
        properties.map(async (property) => {
          const propertyRequests = await storage.getMaintenanceRequestsByProperty(property.id);
          const requestsWithTenants = await Promise.all(propertyRequests.map(async request => {
            const tenant = await storage.getUser(request.tenantId);
            return {
              ...request,
              tenantName: tenant?.username || 'Unknown User'
            };
          }));
          return {
            propertyId: property.id,
            requests: requestsWithTenants
          };
        })
      );

      const response = requests.reduce((acc, curr) => {
        acc[curr.propertyId] = curr.requests;
        return acc;
      }, {} as Record<number, any[]>);

      res.json(response);
    } catch (error) {
      console.error('Error fetching all maintenance requests:', error);
      res.status(500).json({ error: "Failed to fetch maintenance requests" });
    }
  });

  app.post("/api/maintenance-requests/:id/update", ensureLandowner, async (req, res) => {
    try {
      const { status, landlordNotes } = req.body;

      if (!["in_progress", "needs_review"].includes(status)) {
        return res.status(400).json({ error: "Invalid status update" });
      }

      const request = await storage.updateMaintenanceRequest(Number(req.params.id), {
        status,
        landlordNotes,
        updatedAt: new Date()
      });

      res.json(request);
    } catch (error) {
      console.error('Error updating maintenance request:', error);
      res.status(500).json({ error: "Failed to update maintenance request" });
    }
  });

  app.post("/api/maintenance-requests/:id/review", ensureAuthenticated, async (req, res) => {
    try {
      const request = await storage.getMaintenanceRequestById(Number(req.params.id));

      if (!request) {
        return res.status(404).json({ error: "Request not found" });
      }

      if (request.tenantId !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const { status, tenantReview } = req.body;

      if (!["completed", "cancelled"].includes(status)) {
        return res.status(400).json({ error: "Invalid status update" });
      }

      const updatedRequest = await storage.updateMaintenanceRequest(Number(req.params.id), {
        status,
        tenantReview,
        completedAt: status === "completed" ? new Date() : null,
        updatedAt: new Date()
      });

      res.json(updatedRequest);
    } catch (error) {
      console.error('Error reviewing maintenance request:', error);
      res.status(500).json({ error: "Failed to review maintenance request" });
    }
  });

  app.delete("/api/properties/:id", ensureLandowner, async (req, res) => {
    try {
      const propertyId = Number(req.params.id);
      const property = await storage.getPropertyById(propertyId);

      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }

      if (property.ownerId !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized to delete this property" });
      }

      await storage.deleteProperty(propertyId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting property:', error);
      res.status(500).json({ error: "Failed to delete property" });
    }
  });

  app.post("/api/properties/:id/disconnect", ensureAuthenticated, async (req, res) => {
    try {
      const propertyId = Number(req.params.id);

      if (req.user!.role !== "tenant") {
        return res.status(403).json({ error: "Only tenants can disconnect from properties" });
      }

      const contracts = await storage.getTenantContractsByTenant(req.user!.id);
      const activeContract = contracts.find(c =>
        c.propertyId === propertyId &&
        c.contractStatus === "active"
      );

      if (!activeContract) {
        return res.status(404).json({ error: "No active connection found" });
      }

      await storage.updateTenantContract(activeContract.id, {
        contractStatus: "terminated"
      });

      await storage.updateProperty(propertyId, {
        status: "available" as const
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error disconnecting from property:', error);
      res.status(500).json({ error: "Failed to disconnect from property" });
    }
  });

  app.post("/api/properties/:id/disconnect-tenant", ensureLandowner, async (req, res) => {
    try {
      const propertyId = Number(req.params.id);
      const { contractId, reason, type } = req.body;

      const contract = await storage.getTenantContractById(contractId);
      if (!contract) {
        return res.status(404).json({ error: "Contract not found" });
      }

      const property = await storage.getPropertyById(propertyId);
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }

      if (property.ownerId !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized to manage this property" });
      }

      if (contract.depositRequested && contract.depositReturnStatus === "pending") {
        return res.status(400).json({
          error: "Cannot disconnect tenant until deposit return request is handled",
          depositRequested: true
        });
      }

      await storage.updateTenantContract(contractId, {
        contractStatus: "terminated",
        terminationReason: reason,
        terminationType: type,
        terminatedAt: new Date()
      });

      const activeContracts = await storage.getTenantContractsByProperty(propertyId);
      const hasActiveContracts = activeContracts.some(c => 
        c.id !== contractId && c.contractStatus === "active"
      );

      if (!hasActiveContracts) {
        console.log(`No active contracts for property ${propertyId}, setting status to available`);
        await storage.updateProperty(propertyId, {
          status: "available" as const
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error disconnecting tenant:', error);
      res.status(500).json({ error: "Failed to disconnect tenant" });
    }
  });

  app.post("/api/properties/:id/handle-deposit", ensureLandowner, async (req, res) => {
    try {
      const propertyId = Number(req.params.id);
      const { contractId, status } = req.body;

      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({ error: "Invalid deposit return status" });
      }

      const contract = await storage.getTenantContractById(contractId);
      if (!contract) {
        return res.status(404).json({ error: "Contract not found" });
      }

      if (contract.propertyId !== propertyId) {
        return res.status(400).json({ error: "Contract does not match property" });
      }

      await storage.updateTenantContract(contractId, {
        depositReturnStatus: status,
        updatedAt: new Date()
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error handling deposit return:', error);
      res.status(500).json({ error: "Failed to handle deposit return" });
    }
  });

  app.post("/api/ai/description", async (req, res) => {
    try {
      const details = req.body;
      const description = await generatePropertyDescription(details);
      res.json(description);
    } catch (error) {
      console.error('Gemini API Error:', error);
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
      console.error('Gemini API Error:', error);
      res.status(500).json({
        error: "Failed to analyze pricing",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/properties/compare", ensureAuthenticated, async (req, res) => {
    try {
      const { propertyIds } = req.body;

      if (!Array.isArray(propertyIds) || propertyIds.length < 2) {
        return res.status(400).json({ error: "Please provide at least 2 property IDs to compare" });
      }

      const properties = await Promise.all(
        propertyIds.map(id => storage.getPropertyById(Number(id)))
      );

      if (properties.some(p => !p)) {
        return res.status(404).json({ error: "One or more properties not found" });
      }

      try {
        const comparison = await compareProperties(properties);
        res.json(comparison);
      } catch (error) {
        console.error('Property comparison error:', error);
        res.status(500).json({ 
          error: "Failed to compare properties",
          details: error instanceof Error ? error.message : "Unknown error"
        });
      }
    } catch (error) {
      console.error('Property comparison error:', error);
      res.status(500).json({ error: "Failed to compare properties" });
    }
  });

  app.post("/api/properties/:id/request-deposit", ensureAuthenticated, async (req, res) => {
    try {
      const propertyId = Number(req.params.id);

      if (req.user!.role !== "tenant") {
        return res.status(403).json({ error: "Only tenants can request deposit return" });
      }

      const contracts = await storage.getTenantContractsByTenant(req.user!.id);
      const activeContract = contracts.find(c =>
        c.propertyId === propertyId &&
        c.contractStatus === "active"
      );

      if (!activeContract) {
        return res.status(404).json({ error: "No active connection found" });
      }

      await storage.updateTenantContract(activeContract.id, {
        depositRequested: true,
        depositRequestDate: new Date(),
        depositReturnStatus: "pending"
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error requesting deposit:', error);
      res.status(500).json({ error: "Failed to request deposit" });
    }
  });

  app.get("/api/properties/owner/chats", ensureLandowner, async (req, res) => {
    try {
      // Ensure valid user ID
      if (!req.user) {
        console.error('No user found in request');
        return res.status(401).json({ error: "Authentication required" });
      }

      const userId = Number(req.user.id);
      if (isNaN(userId)) {
        console.error('Invalid user ID:', req.user.id);
        return res.status(400).json({ error: "Invalid user ID" });
      }

      console.log('Fetching chat properties for owner:', userId);

      // Get properties owned by the landowner
      const properties = await storage.getPropertiesByOwner(userId);
      console.log('Found landowner properties:', properties);

      if (!properties || properties.length === 0) {
        console.log('No properties found for landowner:', userId);
        return res.json([]);
      }

      // Map properties to include active tenant contract details
      const chatProperties = await Promise.all(
        properties.map(async (property) => {
          if (!property) return null;

          // Get contracts for this property
          const contracts = await storage.getTenantContractsByProperty(property.id);
          console.log(`Contracts for property ${property.id}:`, contracts);

          // Find active contract
          const activeContract = contracts.find(c => c.contractStatus === "active");
          console.log(`Active contract for property ${property.id}:`, activeContract);

          if (activeContract) {
            // Get tenant details
            const tenant = await storage.getUser(activeContract.tenantId);
            console.log('Found active contract with tenant:', {
              propertyId: property.id,
              propertyName: property.name,
              tenantId: activeContract.tenantId,
              tenantName: tenant?.username
            });

            return {
              id: property.id,
              name: property.name,
              otherPartyName: tenant?.username || "Unknown Tenant"
            };
          }
          return null;
        })
      );

      // Filter out null values (properties without active contracts)
      const activeProperties = chatProperties.filter((prop): prop is NonNullable<typeof prop> => prop !== null);
      console.log('Final chat properties:', activeProperties);

      // Send response
      res.json(activeProperties);
    } catch (error) {
      console.error('Error fetching landowner chat properties:', error);
      res.status(500).json({ error: "Failed to fetch chat properties" });
    }
  });

  app.patch("/api/properties/:id/name", ensureLandowner, async (req, res) => {
    try {
      const propertyId = Number(req.params.id);
      const { name } = req.body;

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: "Invalid property name" });
      }

      const property = await storage.getPropertyById(propertyId);

      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }

      if (property.ownerId !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized to rename this property" });
      }

      await storage.updateProperty(propertyId, { name: name.trim() });

      res.json({ success: true });
    } catch (error) {
      console.error('Error renaming property:', error);
      res.status(500).json({ error: "Failed to rename property" });
    }
  });

  return httpServer;

}