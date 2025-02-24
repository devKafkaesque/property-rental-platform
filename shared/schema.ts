import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Existing type definitions
export type UserRole = "landowner" | "tenant";
export type FurnishedType = "full" | "semi" | "unfurnished";
export type PropertyType = "house" | "apartment" | "villa" | "studio";
export type PropertyCategory = "luxury" | "standard" | "budget";
export type ViewingStatus = "pending" | "approved" | "completed" | "cancelled";
export type ReviewStatus = "published" | "pending" | "rejected";

// Existing tables remain unchanged
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().$type<UserRole>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  address: text("address").notNull(),
  type: text("type").notNull().$type<PropertyType>(),
  furnished: text("furnished").notNull().$type<FurnishedType>(),
  wifi: boolean("wifi").default(false),
  restrictions: jsonb("restrictions"),
  condition: text("condition").notNull(),
  status: text("status").default("available"),
  category: text("category").notNull().$type<PropertyCategory>(),
  ownerId: integer("owner_id").notNull(),
  images: text("images").array().default([]),
  createdAt: timestamp("created_at").defaultNow(),
});

// Add viewing requests table
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
  viewingId: integer("viewing_id").notNull(), // Link to the completed viewing
  rating: integer("rating").notNull(),
  comment: text("comment").notNull(),
  status: text("status").notNull().$type<ReviewStatus>().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Add viewing request schema
export const insertViewingRequestSchema = createInsertSchema(viewingRequests).pick({
  propertyId: true,
  preferredDate: true,
  message: true,
}).extend({
  preferredDate: z.coerce.date(), // Use coerce.date() to handle date string conversion
  message: z.string().min(10).max(500).optional(),
});

// Update review schema to require viewing
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
  password: true,
  role: true,
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
});

export const insertBookingSchema = createInsertSchema(bookings).pick({
  propertyId: true,
  startDate: true,
  endDate: true,
});


// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Property = typeof properties.$inferSelect;
export type ViewingRequest = typeof viewingRequests.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type InsertViewingRequest = z.infer<typeof insertViewingRequestSchema>;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Booking = typeof bookings.$inferSelect;