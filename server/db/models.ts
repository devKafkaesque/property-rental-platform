import mongoose, { Schema, Document } from "mongoose";
import { User, Property, Booking } from "@shared/schema";

// User Schema
export interface UserDocument extends Omit<User, "id">, Document {
  id: number;  // Override the id type to match our schema
}

const userSchema = new Schema({
  id: { type: Number, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true, enum: ["landowner", "tenant"] },
  createdAt: { type: Date, default: Date.now },
});

// Property Schema
export interface PropertyDocument extends Omit<Property, "id">, Document {
  id: number;  // Override the id type to match our schema
}

const propertySchema = new Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  address: { type: String, required: true },
  type: { type: String, required: true, enum: ["house", "apartment", "villa", "studio"] },
  furnished: { type: String, required: true, enum: ["full", "semi", "unfurnished"] },
  wifi: { type: Boolean, default: false },
  restrictions: { type: Schema.Types.Mixed },
  condition: { type: String, required: true },
  status: { type: String, default: "available" },
  category: { type: String, required: true, enum: ["luxury", "standard", "budget"] },
  ownerId: { type: Number, required: true },
  images: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
});

// Booking Schema
export interface BookingDocument extends Omit<Booking, "id">, Document {
  id: number;  // Override the id type to match our schema
}

const bookingSchema = new Schema({
  id: { type: Number, required: true, unique: true },
  propertyId: { type: Number, required: true },
  tenantId: { type: Number, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: { 
    type: String, 
    required: true, 
    enum: ["pending", "approved", "rejected"],
    default: "pending"
  },
  createdAt: { type: Date, default: Date.now },
});

// Create and export models
export const UserModel = mongoose.model<UserDocument>("User", userSchema);
export const PropertyModel = mongoose.model<PropertyDocument>("Property", propertySchema);
export const BookingModel = mongoose.model<BookingDocument>("Booking", bookingSchema);