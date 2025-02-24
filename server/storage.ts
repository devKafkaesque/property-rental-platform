import { User, Property, Booking, InsertUser } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private properties: Map<number, Property>;
  private bookings: Map<number, Booking>;
  sessionStore: session.Store;
  private userId: number = 1;
  private propertyId: number = 1;
  private bookingId: number = 1;

  constructor() {
    this.users = new Map();
    this.properties = new Map();
    this.bookings = new Map();
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const now = new Date();
    const user: User = {
      id,
      username: insertUser.username,
      password: insertUser.password,
      role: insertUser.role as "landowner" | "tenant",
      createdAt: now
    };
    this.users.set(id, user);
    return user;
  }

  async createProperty(property: Omit<Property, "id" | "createdAt">): Promise<Property> {
    const id = this.propertyId++;
    const now = new Date();
    const newProperty: Property = { ...property, id, createdAt: now };
    this.properties.set(id, newProperty);
    return newProperty;
  }

  async getProperties(): Promise<Property[]> {
    return Array.from(this.properties.values());
  }

  async getPropertyById(id: number): Promise<Property | undefined> {
    return this.properties.get(id);
  }

  async getPropertiesByOwner(ownerId: number): Promise<Property[]> {
    return Array.from(this.properties.values()).filter(
      (property) => property.ownerId === ownerId,
    );
  }

  async updateProperty(id: number, updates: Partial<Property>): Promise<Property> {
    const property = this.properties.get(id);
    if (!property) throw new Error("Property not found");
    
    const updatedProperty = { ...property, ...updates };
    this.properties.set(id, updatedProperty);
    return updatedProperty;
  }

  async createBooking(booking: Omit<Booking, "id" | "createdAt" | "status">): Promise<Booking> {
    const id = this.bookingId++;
    const now = new Date();
    const newBooking: Booking = { 
      ...booking, 
      id, 
      createdAt: now,
      status: "pending" 
    };
    this.bookings.set(id, newBooking);
    return newBooking;
  }

  async getBookingsByTenant(tenantId: number): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(
      (booking) => booking.tenantId === tenantId,
    );
  }

  async getBookingsByProperty(propertyId: number): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(
      (booking) => booking.propertyId === propertyId,
    );
  }

  async updateBookingStatus(id: number, status: Booking["status"]): Promise<Booking> {
    const booking = this.bookings.get(id);
    if (!booking) throw new Error("Booking not found");
    
    const updatedBooking = { ...booking, status };
    this.bookings.set(id, updatedBooking);
    return updatedBooking;
  }
}

export const storage = new MemStorage();