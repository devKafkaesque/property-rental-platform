import mongoose, { Schema, Document } from "mongoose";
import { User, Property, ViewingRequest, Review, Booking, TenantContract } from "@shared/schema";

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

// Enhanced Property Schema
export interface PropertyDocument extends Omit<Property, "id">, Document {
  id: number;
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
  status: { type: String, default: "available", enum: ["available", "rented", "maintenance", "inactive"] },
  category: { type: String, required: true, enum: ["luxury", "standard", "budget"] },
  ownerId: { type: Number, required: true },
  images: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
  // New detailed property fields
  bedrooms: { type: Number, required: true },
  bathrooms: { type: Number, required: true },
  squareFootage: { type: Number, required: true },
  yearBuilt: { type: Number },
  parkingSpaces: { type: Number, default: 0 },
  petsAllowed: { type: Boolean, default: false },
  utilities: { type: [String], default: [] },
  amenities: { type: [String], default: [] },
  accessibility: { type: [String], default: [] },
  securityFeatures: { type: [String], default: [] },
  maintainanceHistory: { type: [Object], default: [] },
  rentPrice: { type: Number, required: true },
  depositAmount: { type: Number, required: true },
  connectionCode: { type: String, default: null }, // Added connectionCode field
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

// Add Viewing Request Schema
export interface ViewingRequestDocument extends Omit<ViewingRequest, "id">, Document {
  id: number;
}

const viewingRequestSchema = new Schema({
  id: { type: Number, required: true, unique: true },
  propertyId: { type: Number, required: true },
  tenantId: { type: Number, required: true },
  status: {
    type: String,
    required: true,
    enum: ["pending", "approved", "completed", "cancelled"],
    default: "pending"
  },
  preferredDate: { type: Date, required: true },
  message: { type: String },
  createdAt: { type: Date, default: Date.now },
});

// Update Review Schema to include viewingId
export interface ReviewDocument extends Omit<Review, "id">, Document {
  id: number;
}

const reviewSchema = new Schema({
  id: { type: Number, required: true, unique: true },
  propertyId: { type: Number, required: true },
  tenantId: { type: Number, required: true },
  viewingId: { type: Number, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true },
  status: {
    type: String,
    required: true,
    enum: ["published", "pending", "rejected"],
    default: "pending"
  },
  createdAt: { type: Date, default: Date.now },
});

// Add Tenant Contract Schema
export interface TenantContractDocument extends Omit<TenantContract, "id">, Document {
  id: number;
}

const tenantContractSchema = new Schema({
  id: { type: Number, required: true, unique: true },
  propertyId: { type: Number, required: true },
  tenantId: { type: Number, required: true },
  landownerId: { type: Number, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  rentAmount: { type: Number, required: true },
  depositPaid: { type: Boolean, default: false },
  contractStatus: { type: String, default: "active" },
  documents: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
});

// Create and export models
export const UserModel = mongoose.model<UserDocument>("User", userSchema);
export const PropertyModel = mongoose.model<PropertyDocument>("Property", propertySchema);
export const BookingModel = mongoose.model<BookingDocument>("Booking", bookingSchema);
export const ViewingRequestModel = mongoose.model<ViewingRequestDocument>("ViewingRequest", viewingRequestSchema);
export const ReviewModel = mongoose.model<ReviewDocument>("Review", reviewSchema);
export const TenantContractModel = mongoose.model<TenantContractDocument>("TenantContract", tenantContractSchema);