import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enhanced type definitions with proper enums
export const UserRole = z.enum(["landowner", "tenant"]);
export const FurnishedType = z.enum(["full", "semi", "unfurnished"]);
export const PropertyType = z.enum(["house", "apartment", "villa", "studio"]);
export const PropertyCategory = z.enum(["luxury", "standard", "budget"]);
export const ViewingStatus = z.enum(["pending", "approved", "completed", "cancelled"]);
export const ReviewStatus = z.enum(["published", "pending", "rejected"]);
export const MaintenanceType = z.enum(["repair", "renovation", "inspection", "emergency"]);
export const PropertyStatus = z.enum(["available", "rented", "maintenance", "inactive"]);

export type UserRole = z.infer<typeof UserRole>;
export type FurnishedType = z.infer<typeof FurnishedType>;
export type PropertyType = z.infer<typeof PropertyType>;
export type PropertyCategory = z.infer<typeof PropertyCategory>;
export type ViewingStatus = z.infer<typeof ViewingStatus>;
export type ReviewStatus = z.infer<typeof ReviewStatus>;
export type MaintenanceType = z.infer<typeof MaintenanceType>;
export type PropertyStatus = z.infer<typeof PropertyStatus>;

// Enhanced property table with more detailed information
export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  address: text("address").notNull(),
  type: text("type").notNull().$type<PropertyType>(),
  furnished: text("furnished").notNull().$type<FurnishedType>(),
  wifi: boolean("wifi").default(false),
  restrictions: jsonb("restrictions").default({}),
  condition: text("condition").notNull(),
  status: text("status").$type<PropertyStatus>().default("available"),
  category: text("category").notNull().$type<PropertyCategory>(),
  ownerId: integer("owner_id").notNull(),
  images: text("images").array().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  bedrooms: integer("bedrooms").notNull(),
  bathrooms: integer("bathrooms").notNull(),
  squareFootage: integer("square_footage").notNull(),
  yearBuilt: integer("year_built"),
  parkingSpaces: integer("parking_spaces").default(0),
  petsAllowed: boolean("pets_allowed").default(false),
  utilities: jsonb("utilities").default([]),
  amenities: jsonb("amenities").default([]),
  accessibility: jsonb("accessibility").default([]),
  securityFeatures: jsonb("security_features").default([]),
  maintainanceHistory: jsonb("maintainance_history").default([]),
  rentPrice: integer("rent_price").notNull(),
  depositAmount: integer("deposit_amount").notNull(),
  connectionCode: text("connection_code").unique(),
});

export const insertPropertySchema = createInsertSchema(properties).pick({
  name: true,
  description: true,
  address: true,
  type: true,
  furnished: true,
  wifi: true,
  restrictions: true,
  condition: true,
  category: true,
  images: true,
  bedrooms: true,
  bathrooms: true,
  squareFootage: true,
  rentPrice: true,
  depositAmount: true,
}).extend({
  type: PropertyType,
  furnished: FurnishedType,
  category: PropertyCategory,
  images: z.array(z.string()).default([]),
  restrictions: z.record(z.any()).default({}),
  rentPrice: z.number().min(1, "Rent price must be greater than 0"),
  depositAmount: z.number().min(1, "Deposit amount must be greater than 0"),
  bedrooms: z.number().min(1, "At least one bedroom is required"),
  bathrooms: z.number().min(1, "At least one bathroom is required"),
  squareFootage: z.number().min(1, "Square footage must be greater than 0"),
});

export const tenantContracts = pgTable("tenant_contracts", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull(),
  tenantId: integer("tenant_id").notNull(),
  landownerId: integer("landowner_id").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  rentAmount: integer("rent_amount").notNull(),
  depositPaid: boolean("deposit_paid").default(false),
  contractStatus: text("contract_status").default("active"),
  documents: text("documents").array().default([]),
  createdAt: timestamp("created_at").defaultNow(),
});

export const viewingRequests = pgTable("viewing_requests", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull(),
  tenantId: integer("tenant_id").notNull(),
  status: text("status").notNull().$type<ViewingStatus>().default("pending"),
  preferredDate: timestamp("preferred_date").notNull(),
  message: text("message"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull(),
  tenantId: integer("tenant_id").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: text("status").notNull().$type<"pending" | "approved" | "rejected">(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull(),
  tenantId: integer("tenant_id").notNull(),
  viewingId: integer("viewing_id").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment").notNull(),
  status: text("status").notNull().$type<ReviewStatus>().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().$type<UserRole>(),
  createdAt: timestamp("created_at").defaultNow(),
});


export const insertViewingRequestSchema = createInsertSchema(viewingRequests).pick({
  propertyId: true,
  preferredDate: true,
  message: true,
}).extend({
  preferredDate: z.coerce.date(),
  message: z.string().min(10).max(500).optional(),
});

export const insertReviewSchema = createInsertSchema(reviews).pick({
  propertyId: true,
  viewingId: true,
  rating: true,
  comment: true,
}).extend({
  rating: z.number().min(1).max(5),
  comment: z.string().min(10).max(500),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
  role: true,
}).extend({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  username: z.string().min(3, "Username must be at least 3 characters"),
});

export const insertBookingSchema = createInsertSchema(bookings).pick({
  propertyId: true,
  startDate: true,
  endDate: true,
});

export const insertTenantContractSchema = createInsertSchema(tenantContracts).pick({
  propertyId: true,
  tenantId: true,
  landownerId: true,
  startDate: true,
  endDate: true,
  rentAmount: true,
  documents: true,
}).extend({
  documents: z.array(z.string()).default([]),
  depositPaid: z.boolean().default(false),
  contractStatus: z.string().default("active")
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Property = typeof properties.$inferSelect;
export type ViewingRequest = typeof viewingRequests.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type InsertViewingRequest = z.infer<typeof insertViewingRequestSchema>;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Booking = typeof bookings.$inferSelect;
export type TenantContract = typeof tenantContracts.$inferSelect;
export type InsertTenantContract = z.infer<typeof insertTenantContractSchema>;
export type InsertProperty = z.infer<typeof insertPropertySchema>;

// Add new enums for maintenance requests
export const MaintenancePriority = z.enum(["low", "medium", "high", "emergency"]);
export const MaintenanceStatus = z.enum(["pending", "in_progress", "completed", "cancelled", "needs_review", "reviewed"]);

export type MaintenancePriority = z.infer<typeof MaintenancePriority>;
export type MaintenanceStatus = z.infer<typeof MaintenanceStatus>;

// Update maintenance requests table
export const maintenanceRequests = pgTable("maintenance_requests", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull(),
  tenantId: integer("tenant_id").notNull(),
  description: text("description").notNull(),
  priority: text("priority").notNull().$type<MaintenancePriority>(),
  status: text("status").notNull().$type<MaintenanceStatus>().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  images: text("images").array().default([]),
  landlordNotes: text("landlord_notes"),
  tenantReview: text("tenant_review"),
});

export const insertMaintenanceRequestSchema = createInsertSchema(maintenanceRequests).pick({
  propertyId: true,
  description: true,
  priority: true,
  images: true,
}).extend({
  description: z.string().min(10, "Description must be at least 10 characters long"),
  priority: MaintenancePriority,
  images: z.array(z.string()).default([]),
});

export type MaintenanceRequest = typeof maintenanceRequests.$inferSelect;
export type InsertMaintenanceRequest = z.infer<typeof insertMaintenanceRequestSchema>;