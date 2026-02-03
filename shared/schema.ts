import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const tenantTypeEnum = pgEnum("tenant_type", ["LTC", "Homecare", "Clinic"]);
export const tenantStatusEnum = pgEnum("tenant_status", ["pending", "approved", "suspended"]);
export const userRoleEnum = pgEnum("user_role", ["SUPER_ADMIN", "TENANT_ADMIN", "FACILITY_ADMIN", "WORKER"]);
export const userStatusEnum = pgEnum("user_status", ["pending", "active", "suspended"]);
export const shiftStatusEnum = pgEnum("shift_status", ["open", "offered", "filled", "completed", "cancelled"]);
export const applicationStatusEnum = pgEnum("application_status", ["pending", "accepted", "rejected", "withdrawn"]);
export const payoutStatusEnum = pgEnum("payout_status", ["pending", "processing", "completed"]);
export const urgencyEnum = pgEnum("urgency", ["low", "normal", "high", "critical"]);

// New enums for worker profiles and shifts
export const ageGroupEnum = pgEnum("age_group", ["below_30", "30_to_50", "above_50"]);
export const experienceLevelEnum = pgEnum("experience_level", ["beginner", "professional", "expert"]);
export const professionEnum = pgEnum("profession", ["nurse", "care_worker", "med_tech"]);
export const environmentTypeEnum = pgEnum("environment_type", ["care_home", "old_age_home", "one_on_one", "hospital"]);

// Skills mapping by profession
export const PROFESSION_SKILLS = {
  nurse: ["ICU", "Wound Care", "IV Therapy", "ACLS", "Pediatric Care", "Emergency Care"],
  care_worker: ["ADLs", "Patient Transfers", "Dementia Care", "Basic First Aid", "Mobility Assistance", "Nutrition Support"],
  med_tech: ["Medication Dispensing", "Lab Sampling", "Pharmacy Software", "Vital Signs Monitoring", "Medical Records", "Equipment Maintenance"],
} as const;

// Tenant table (parent organization)
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

// Facilities table (child of tenant)
export const facilities = pgTable("facilities", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id", { length: 36 }).notNull().references(() => tenants.id),
  name: text("name").notNull(),
  address: text("address"),
  phone: text("phone"),
  environmentType: environmentTypeEnum("environment_type").notNull().default("care_home"),
  status: userStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Users table
export const users = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default("WORKER"),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => tenants.id),
  facilityId: varchar("facility_id", { length: 36 }).references(() => facilities.id),
  status: userStatusEnum("status").notNull().default("pending"),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Worker Profiles table with enhanced fields
export const workerProfiles = pgTable("worker_profiles", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().unique().references(() => users.id),
  profession: professionEnum("profession").notNull().default("care_worker"),
  ageGroup: ageGroupEnum("age_group").notNull().default("30_to_50"),
  experienceLevel: experienceLevelEnum("experience_level").notNull().default("beginner"),
  skills: text("skills").array().default(sql`ARRAY[]::text[]`),
  additionalCertifications: text("additional_certifications").array().default(sql`ARRAY[]::text[]`),
  licenseNumber: text("license_number"),
  licenseExpiry: timestamp("license_expiry"),
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

// Shifts table with enhanced matching fields
export const shifts = pgTable("shifts", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id", { length: 36 }).notNull().references(() => tenants.id),
  facilityId: varchar("facility_id", { length: 36 }).references(() => facilities.id),
  title: text("title").notNull(),
  description: text("description"),
  requiredProfession: professionEnum("required_profession").notNull().default("care_worker"),
  requiredAgeGroup: ageGroupEnum("required_age_group"),
  requiredExperience: experienceLevelEnum("required_experience"),
  requiredSkills: text("required_skills").array().default(sql`ARRAY[]::text[]`),
  environmentType: environmentTypeEnum("environment_type").notNull().default("care_home"),
  patientLoad: integer("patient_load").default(1),
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

export const insertFacilitySchema = createInsertSchema(facilities).omit({
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
  role: z.enum(["TENANT_ADMIN", "FACILITY_ADMIN", "WORKER"]),
  tenantId: z.string().optional(),
});

// Worker registration schema with profile data
export const workerRegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  profession: z.enum(["nurse", "care_worker", "med_tech"]),
  ageGroup: z.enum(["below_30", "30_to_50", "above_50"]),
  experienceLevel: z.enum(["beginner", "professional", "expert"]),
  skills: z.array(z.string()).default([]),
  additionalCertifications: z.array(z.string()).default([]),
  licenseNumber: z.string().optional(),
  licenseExpiry: z.coerce.date().optional(),
  tenantId: z.string().optional(),
});

// Types
export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;

export type Facility = typeof facilities.$inferSelect;
export type InsertFacility = z.infer<typeof insertFacilitySchema>;

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
export type WorkerRegisterInput = z.infer<typeof workerRegisterSchema>;

// Extended types for frontend
export type ShiftWithDetails = Shift & {
  tenant?: Tenant;
  facility?: Facility;
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
  facility?: Facility;
};

export type FacilityWithDetails = Facility & {
  tenant?: Tenant;
};
