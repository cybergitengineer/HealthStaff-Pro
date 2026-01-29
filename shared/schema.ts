import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const tenantTypeEnum = pgEnum("tenant_type", ["LTC", "Homecare", "Clinic"]);
export const tenantStatusEnum = pgEnum("tenant_status", ["pending", "approved", "suspended"]);
export const userRoleEnum = pgEnum("user_role", ["SUPER_ADMIN", "FACILITY_ADMIN", "WORKER"]);
export const userStatusEnum = pgEnum("user_status", ["pending", "active", "suspended"]);
export const shiftStatusEnum = pgEnum("shift_status", ["open", "offered", "filled", "completed", "cancelled"]);
export const applicationStatusEnum = pgEnum("application_status", ["pending", "accepted", "rejected", "withdrawn"]);
export const payoutStatusEnum = pgEnum("payout_status", ["pending", "processing", "completed"]);
export const licenseTypeEnum = pgEnum("license_type", ["RN", "LPN", "CNA", "HCA", "PSW"]);
export const urgencyEnum = pgEnum("urgency", ["low", "normal", "high", "critical"]);

// Tenant table
export const tenants = pgTable("tenants", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: tenantTypeEnum("type").notNull().default("LTC"),
  rules: jsonb("rules").$type<{
    cancellationWindow: number;
    autoApprove: boolean;
  }>().default({ cancellationWindow: 24, autoApprove: false }),
  pricing: jsonb("pricing").$type<{
    markup: number;
    flatFee: number;
  }>().default({ markup: 15, flatFee: 0 }),
  status: tenantStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Users table
export const users = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default("WORKER"),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => tenants.id),
  status: userStatusEnum("status").notNull().default("pending"),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Worker Profiles table
export const workerProfiles = pgTable("worker_profiles", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().unique().references(() => users.id),
  licenseType: licenseTypeEnum("license_type").notNull(),
  licenseNumber: text("license_number").notNull(),
  licenseExpiry: timestamp("license_expiry").notNull(),
  specialties: text("specialties").array().default(sql`ARRAY[]::text[]`),
  availability: jsonb("availability").$type<{
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  }>().default({
    monday: true, tuesday: true, wednesday: true, thursday: true,
    friday: true, saturday: false, sunday: false
  }),
  reliabilityScore: integer("reliability_score").default(100),
  verified: boolean("verified").default(false),
  bio: text("bio"),
});

// Shifts table
export const shifts = pgTable("shifts", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id", { length: 36 }).notNull().references(() => tenants.id),
  title: text("title").notNull(),
  description: text("description"),
  requiredLicense: licenseTypeEnum("required_license").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  payRate: integer("pay_rate").notNull(),
  urgency: urgencyEnum("urgency").notNull().default("normal"),
  status: shiftStatusEnum("status").notNull().default("open"),
  location: text("location"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Applications table
export const applications = pgTable("applications", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  shiftId: varchar("shift_id", { length: 36 }).notNull().references(() => shifts.id),
  workerId: varchar("worker_id", { length: 36 }).notNull().references(() => users.id),
  status: applicationStatusEnum("status").notNull().default("pending"),
  message: text("message"),
  appliedAt: timestamp("applied_at").defaultNow().notNull(),
});

// Assignments table
export const assignments = pgTable("assignments", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  shiftId: varchar("shift_id", { length: 36 }).notNull().references(() => shifts.id),
  workerId: varchar("worker_id", { length: 36 }).notNull().references(() => users.id),
  checkIn: timestamp("check_in"),
  checkOut: timestamp("check_out"),
  approved: boolean("approved").default(false),
  payoutStatus: payoutStatusEnum("payout_status").notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas
export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertWorkerProfileSchema = createInsertSchema(workerProfiles).omit({
  id: true,
});

export const insertShiftSchema = createInsertSchema(shifts, {
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
}).omit({
  id: true,
  createdAt: true,
});


export const insertApplicationSchema = createInsertSchema(applications).omit({
  id: true,
  appliedAt: true,
});

export const insertAssignmentSchema = createInsertSchema(assignments).omit({
  id: true,
  createdAt: true,
});

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  role: z.enum(["FACILITY_ADMIN", "WORKER"]),
});

// Types
export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type WorkerProfile = typeof workerProfiles.$inferSelect;
export type InsertWorkerProfile = z.infer<typeof insertWorkerProfileSchema>;

export type Shift = typeof shifts.$inferSelect;
export type InsertShift = z.infer<typeof insertShiftSchema>;

export type Application = typeof applications.$inferSelect;
export type InsertApplication = z.infer<typeof insertApplicationSchema>;

export type Assignment = typeof assignments.$inferSelect;
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

// Extended types for frontend
export type ShiftWithDetails = Shift & {
  tenant?: Tenant;
  applicationsCount?: number;
};

export type ApplicationWithDetails = Application & {
  shift?: Shift;
  worker?: User;
  workerProfile?: WorkerProfile;
};

export type AssignmentWithDetails = Assignment & {
  shift?: Shift;
  worker?: User;
};

export type UserWithProfile = User & {
  workerProfile?: WorkerProfile;
  tenant?: Tenant;
};
