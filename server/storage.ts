import { User, Property, Booking, InsertUser } from "@shared/schema";
import session from "express-session";
export * from "./storage/mongo-storage";
import { MongoStorage } from "./storage/mongo-storage";

export interface IStorage {
  sessionStore: session.Store;
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  // Property operations
  createProperty(property: Omit<Property, "id" | "createdAt">): Promise<Property>;
  getProperties(): Promise<Property[]>;
  getPropertyById(id: number): Promise<Property | undefined>;
  getPropertiesByOwner(ownerId: number): Promise<Property[]>;
  updateProperty(id: number, property: Partial<Property>): Promise<Property>;
  // Booking operations
  createBooking(booking: Omit<Booking, "id" | "createdAt" | "status">): Promise<Booking>;
  getBookingsByTenant(tenantId: number): Promise<Booking[]>;
  getBookingsByProperty(propertyId: number): Promise<Booking[]>;
  updateBookingStatus(id: number, status: Booking["status"]): Promise<Booking>;
}


// Export a single instance of the storage
export const storage = new MongoStorage();