import { User, Property, ViewingRequest, Review, InsertUser } from "@shared/schema";
import session from "express-session";
export * from "./storage/mongo-storage";
import { MongoStorage } from "./storage/mongo-storage";

export interface IStorage {
  sessionStore: session.Store;
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsernameOrEmail(usernameOrEmail: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Property operations
  createProperty(property: Omit<Property, "id" | "createdAt">): Promise<Property>;
  getProperties(): Promise<Property[]>;
  getPropertyById(id: number): Promise<Property | undefined>;
  getPropertiesByOwner(ownerId: number): Promise<Property[]>;
  updateProperty(id: number, property: Partial<Property>): Promise<Property>;
  updatePropertyConnectionCode(id: number, code: string | null): Promise<Property>;

  // Viewing Request operations
  createViewingRequest(request: Omit<ViewingRequest, "id" | "createdAt" | "status">): Promise<ViewingRequest>;
  getViewingRequestsByProperty(propertyId: number): Promise<ViewingRequest[]>;
  getViewingRequestsByTenant(tenantId: number): Promise<ViewingRequest[]>;
  updateViewingStatus(id: number, status: ViewingRequest["status"]): Promise<ViewingRequest>;
  getCompletedViewings(tenantId: number, propertyId: number): Promise<ViewingRequest[]>;

  // Review operations
  createReview(review: Omit<Review, "id" | "createdAt" | "status">): Promise<Review>;
  getReviewsByProperty(propertyId: number): Promise<Review[]>;
  getReviewsByTenant(tenantId: number): Promise<Review[]>;
  updateReviewStatus(id: number, status: Review["status"]): Promise<Review>;

  // Maintenance Request operations
  createMaintenanceRequest(request: any): Promise<any>;
  getMaintenanceRequestsByProperty(propertyId: number): Promise<any[]>;
  getMaintenanceRequestsByTenant(tenantId: number): Promise<any[]>;
  getMaintenanceRequestById(id: number): Promise<any>;
  updateMaintenanceRequest(id: number, updates: any): Promise<any>;
  updateMaintenanceStatus(id: number, status: string): Promise<any>;
  updateMaintenanceNotes(id: number, notes: string): Promise<any>;
}

// Export a single instance of the storage
export const storage = new MongoStorage();