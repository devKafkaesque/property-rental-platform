import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export type UserRole = "landowner" | "tenant";
export type FurnishedType = "full" | "semi" | "unfurnished";
export type PropertyType = "house" | "apartment" | "villa" | "studio";
export type PropertyCategory = "luxury" | "standard" | "budget";

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
});

export const insertBookingSchema = createInsertSchema(bookings).pick({
  propertyId: true,
  startDate: true,
  endDate: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Property = typeof properties.$inferSelect;
export type Booking = typeof bookings.$inferSelect;