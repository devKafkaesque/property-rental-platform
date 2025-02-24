import { IStorage } from "../storage";
import { User, Property, Booking, InsertUser } from "@shared/schema";
import { UserModel, PropertyModel, BookingModel } from "../db/models";
import session from "express-session";
import MongoStore from "connect-mongo";

export class MongoStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = MongoStore.create({
      mongoUrl: process.env.MONGODB_URI || "mongodb://localhost:27017/keyper",
      collectionName: "sessions",
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const user = await UserModel.findOne({ id });
    return user ? user.toObject() : undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const user = await UserModel.findOne({ username });
    return user ? user.toObject() : undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const lastUser = await UserModel.findOne().sort({ id: -1 });
    const newId = (lastUser?.id || 0) + 1;

    const newUser = new UserModel({
      ...user,
      id: newId,
    });
    await newUser.save();
    return newUser.toObject();
  }

  // Property operations
  async createProperty(property: Omit<Property, "id" | "createdAt">): Promise<Property> {
    const lastProperty = await PropertyModel.findOne().sort({ id: -1 });
    const newId = (lastProperty?.id || 0) + 1;

    const newProperty = new PropertyModel({
      ...property,
      id: newId,
    });
    await newProperty.save();
    return newProperty.toObject();
  }

  async getProperties(): Promise<Property[]> {
    const properties = await PropertyModel.find();
    return properties.map(prop => prop.toObject());
  }

  async getPropertyById(id: number): Promise<Property | undefined> {
    if (isNaN(id)) return undefined;
    const property = await PropertyModel.findOne({ id });
    return property ? property.toObject() : undefined;
  }

  async getPropertiesByOwner(ownerId: number): Promise<Property[]> {
    const properties = await PropertyModel.find({ ownerId });
    return properties.map(prop => prop.toObject());
  }

  async updateProperty(id: number, updates: Partial<Property>): Promise<Property> {
    const property = await PropertyModel.findOneAndUpdate(
      { id },
      { $set: updates },
      { new: true }
    );
    if (!property) throw new Error("Property not found");
    return property.toObject();
  }

  // Booking operations
  async createBooking(booking: Omit<Booking, "id" | "createdAt" | "status">): Promise<Booking> {
    const lastBooking = await BookingModel.findOne().sort({ id: -1 });
    const newId = (lastBooking?.id || 0) + 1;

    const newBooking = new BookingModel({
      ...booking,
      id: newId,
      status: "pending"
    });
    await newBooking.save();
    return newBooking.toObject();
  }

  async getBookingsByTenant(tenantId: number): Promise<Booking[]> {
    const bookings = await BookingModel.find({ tenantId });
    return bookings.map(booking => booking.toObject());
  }

  async getBookingsByProperty(propertyId: number): Promise<Booking[]> {
    const bookings = await BookingModel.find({ propertyId });
    return bookings.map(booking => booking.toObject());
  }

  async updateBookingStatus(id: number, status: Booking["status"]): Promise<Booking> {
    const booking = await BookingModel.findOneAndUpdate(
      { id },
      { $set: { status } },
      { new: true }
    );
    if (!booking) throw new Error("Booking not found");
    return booking.toObject();
  }
}