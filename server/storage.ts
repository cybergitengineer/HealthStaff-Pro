import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "./db";
import {
  tenants,
  users,
  workerProfiles,
  shifts,
  applications,
  assignments,
  type Tenant,
  type InsertTenant,
  type User,
  type InsertUser,
  type WorkerProfile,
  type InsertWorkerProfile,
  type Shift,
  type InsertShift,
  type Application,
  type InsertApplication,
  type Assignment,
  type InsertAssignment,
  type UserWithProfile,
  type ShiftWithDetails,
  type ApplicationWithDetails,
  type AssignmentWithDetails,
} from "@shared/schema";

export interface IStorage {
  // Tenants
  getTenants(): Promise<Tenant[]>;
  getTenant(id: string): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  updateTenant(id: string, data: Partial<InsertTenant>): Promise<Tenant | undefined>;

  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserWithProfile(id: string): Promise<UserWithProfile | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;
  getWorkers(): Promise<UserWithProfile[]>;

  // Worker Profiles
  getWorkerProfile(userId: string): Promise<WorkerProfile | undefined>;
  createWorkerProfile(profile: InsertWorkerProfile): Promise<WorkerProfile>;
  updateWorkerProfile(userId: string, data: Partial<InsertWorkerProfile>): Promise<WorkerProfile | undefined>;

  // Shifts
  getShifts(tenantId?: string): Promise<ShiftWithDetails[]>;
  getShift(id: string): Promise<Shift | undefined>;
  createShift(shift: InsertShift): Promise<Shift>;
  updateShift(id: string, data: Partial<InsertShift>): Promise<Shift | undefined>;

  // Applications
  getApplications(userId: string, role: string, tenantId?: string): Promise<ApplicationWithDetails[]>;
  getApplication(id: string): Promise<Application | undefined>;
  getApplicationByShiftAndWorker(shiftId: string, workerId: string): Promise<Application | undefined>;
  createApplication(application: InsertApplication): Promise<Application>;
  updateApplication(id: string, data: Partial<InsertApplication>): Promise<Application | undefined>;

  // Assignments
  getAssignments(userId: string, role: string, tenantId?: string): Promise<AssignmentWithDetails[]>;
  getAssignment(id: string): Promise<Assignment | undefined>;
  createAssignment(assignment: InsertAssignment): Promise<Assignment>;
  updateAssignment(id: string, data: Partial<InsertAssignment>): Promise<Assignment | undefined>;

  // Stats
  getDashboardStats(userId: string, role: string, tenantId?: string): Promise<Record<string, number>>;
}

export class DatabaseStorage implements IStorage {
  // Tenants
  async getTenants(): Promise<Tenant[]> {
    return db.select().from(tenants).orderBy(desc(tenants.createdAt));
  }

  async getTenant(id: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant;
  }

  async createTenant(tenant: InsertTenant): Promise<Tenant> {
    const [created] = await db.insert(tenants).values(tenant).returning();
    return created;
  }

  async updateTenant(id: string, data: Partial<InsertTenant>): Promise<Tenant | undefined> {
    const [updated] = await db.update(tenants).set(data).where(eq(tenants.id, id)).returning();
    return updated;
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserWithProfile(id: string): Promise<UserWithProfile | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (!user) return undefined;

    const [profile] = await db.select().from(workerProfiles).where(eq(workerProfiles.userId, id));
    const [tenant] = user.tenantId
      ? await db.select().from(tenants).where(eq(tenants.id, user.tenantId))
      : [undefined];

    return {
      ...user,
      workerProfile: profile,
      tenant,
    };
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updated;
  }

  async getWorkers(): Promise<UserWithProfile[]> {
    const workerUsers = await db
      .select()
      .from(users)
      .where(eq(users.role, "WORKER"))
      .orderBy(desc(users.createdAt));

    const result: UserWithProfile[] = [];
    for (const user of workerUsers) {
      const [profile] = await db.select().from(workerProfiles).where(eq(workerProfiles.userId, user.id));
      result.push({ ...user, workerProfile: profile });
    }
    return result;
  }

  // Worker Profiles
  async getWorkerProfile(userId: string): Promise<WorkerProfile | undefined> {
    const [profile] = await db.select().from(workerProfiles).where(eq(workerProfiles.userId, userId));
    return profile;
  }

  async createWorkerProfile(profile: InsertWorkerProfile): Promise<WorkerProfile> {
    const [created] = await db.insert(workerProfiles).values(profile).returning();
    return created;
  }

  async updateWorkerProfile(userId: string, data: Partial<InsertWorkerProfile>): Promise<WorkerProfile | undefined> {
    const [updated] = await db
      .update(workerProfiles)
      .set(data)
      .where(eq(workerProfiles.userId, userId))
      .returning();
    return updated;
  }

  // Shifts
  async getShifts(tenantId?: string): Promise<ShiftWithDetails[]> {
    const query = tenantId
      ? db.select().from(shifts).where(eq(shifts.tenantId, tenantId)).orderBy(desc(shifts.createdAt))
      : db.select().from(shifts).orderBy(desc(shifts.createdAt));

    const shiftList = await query;
    const result: ShiftWithDetails[] = [];

    for (const shift of shiftList) {
      const [tenant] = await db.select().from(tenants).where(eq(tenants.id, shift.tenantId));
      const appCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(applications)
        .where(eq(applications.shiftId, shift.id));

      result.push({
        ...shift,
        tenant,
        applicationsCount: Number(appCount[0]?.count ?? 0),
      });
    }
    return result;
  }

  async getShift(id: string): Promise<Shift | undefined> {
    const [shift] = await db.select().from(shifts).where(eq(shifts.id, id));
    return shift;
  }

  async createShift(shift: InsertShift): Promise<Shift> {
    const [created] = await db.insert(shifts).values(shift).returning();
    return created;
  }

  async updateShift(id: string, data: Partial<InsertShift>): Promise<Shift | undefined> {
    const [updated] = await db.update(shifts).set(data).where(eq(shifts.id, id)).returning();
    return updated;
  }

  // Applications
  async getApplications(userId: string, role: string, tenantId?: string): Promise<ApplicationWithDetails[]> {
    let applicationList: Application[];

    if (role === "WORKER") {
      applicationList = await db
        .select()
        .from(applications)
        .where(eq(applications.workerId, userId))
        .orderBy(desc(applications.appliedAt));
    } else if (role === "FACILITY_ADMIN" && tenantId) {
      const tenantShifts = await db.select().from(shifts).where(eq(shifts.tenantId, tenantId));
      const shiftIds = tenantShifts.map((s) => s.id);
      if (shiftIds.length === 0) return [];
      
      applicationList = await db
        .select()
        .from(applications)
        .orderBy(desc(applications.appliedAt));
      applicationList = applicationList.filter((a) => shiftIds.includes(a.shiftId));
    } else {
      applicationList = await db.select().from(applications).orderBy(desc(applications.appliedAt));
    }

    const result: ApplicationWithDetails[] = [];
    for (const app of applicationList) {
      const [shift] = await db.select().from(shifts).where(eq(shifts.id, app.shiftId));
      const [worker] = await db.select().from(users).where(eq(users.id, app.workerId));
      const [workerProfile] = await db.select().from(workerProfiles).where(eq(workerProfiles.userId, app.workerId));
      result.push({ ...app, shift, worker, workerProfile });
    }
    return result;
  }

  async getApplication(id: string): Promise<Application | undefined> {
    const [application] = await db.select().from(applications).where(eq(applications.id, id));
    return application;
  }

  async getApplicationByShiftAndWorker(shiftId: string, workerId: string): Promise<Application | undefined> {
    const [application] = await db
      .select()
      .from(applications)
      .where(and(eq(applications.shiftId, shiftId), eq(applications.workerId, workerId)));
    return application;
  }

  async createApplication(application: InsertApplication): Promise<Application> {
    const [created] = await db.insert(applications).values(application).returning();
    return created;
  }

  async updateApplication(id: string, data: Partial<InsertApplication>): Promise<Application | undefined> {
    const [updated] = await db.update(applications).set(data).where(eq(applications.id, id)).returning();
    return updated;
  }

  // Assignments
  async getAssignments(userId: string, role: string, tenantId?: string): Promise<AssignmentWithDetails[]> {
    let assignmentList: Assignment[];

    if (role === "WORKER") {
      assignmentList = await db
        .select()
        .from(assignments)
        .where(eq(assignments.workerId, userId))
        .orderBy(desc(assignments.createdAt));
    } else if (role === "FACILITY_ADMIN" && tenantId) {
      const tenantShifts = await db.select().from(shifts).where(eq(shifts.tenantId, tenantId));
      const shiftIds = tenantShifts.map((s) => s.id);
      if (shiftIds.length === 0) return [];
      
      assignmentList = await db.select().from(assignments).orderBy(desc(assignments.createdAt));
      assignmentList = assignmentList.filter((a) => shiftIds.includes(a.shiftId));
    } else {
      assignmentList = await db.select().from(assignments).orderBy(desc(assignments.createdAt));
    }

    const result: AssignmentWithDetails[] = [];
    for (const assignment of assignmentList) {
      const [shift] = await db.select().from(shifts).where(eq(shifts.id, assignment.shiftId));
      const [worker] = await db.select().from(users).where(eq(users.id, assignment.workerId));
      result.push({ ...assignment, shift, worker });
    }
    return result;
  }

  async getAssignment(id: string): Promise<Assignment | undefined> {
    const [assignment] = await db.select().from(assignments).where(eq(assignments.id, id));
    return assignment;
  }

  async createAssignment(assignment: InsertAssignment): Promise<Assignment> {
    const [created] = await db.insert(assignments).values(assignment).returning();
    return created;
  }

  async updateAssignment(id: string, data: Partial<InsertAssignment>): Promise<Assignment | undefined> {
    const [updated] = await db.update(assignments).set(data).where(eq(assignments.id, id)).returning();
    return updated;
  }

  // Dashboard Stats
  async getDashboardStats(userId: string, role: string, tenantId?: string): Promise<Record<string, number>> {
    const stats: Record<string, number> = {};

    if (role === "SUPER_ADMIN") {
      const [tenantCount] = await db.select({ count: sql<number>`count(*)` }).from(tenants);
      const [approvedTenantCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(tenants)
        .where(eq(tenants.status, "approved"));
      const [workerCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(eq(users.role, "WORKER"));
      const verifiedProfiles = await db.select().from(workerProfiles).where(eq(workerProfiles.verified, true));
      const [openShifts] = await db
        .select({ count: sql<number>`count(*)` })
        .from(shifts)
        .where(eq(shifts.status, "open"));
      const [filledShifts] = await db
        .select({ count: sql<number>`count(*)` })
        .from(shifts)
        .where(eq(shifts.status, "filled"));
      const [completedShifts] = await db
        .select({ count: sql<number>`count(*)` })
        .from(shifts)
        .where(eq(shifts.status, "completed"));

      stats.totalTenants = Number(tenantCount?.count ?? 0);
      stats.approvedTenants = Number(approvedTenantCount?.count ?? 0);
      stats.totalWorkers = Number(workerCount?.count ?? 0);
      stats.verifiedWorkers = verifiedProfiles.length;
      stats.openShifts = Number(openShifts?.count ?? 0);
      stats.filledShifts = Number(filledShifts?.count ?? 0);
      stats.completedShifts = Number(completedShifts?.count ?? 0);
      stats.totalShifts = stats.openShifts + stats.filledShifts + stats.completedShifts;
    } else if (role === "FACILITY_ADMIN" && tenantId) {
      const [openShifts] = await db
        .select({ count: sql<number>`count(*)` })
        .from(shifts)
        .where(and(eq(shifts.tenantId, tenantId), eq(shifts.status, "open")));
      const [filledShifts] = await db
        .select({ count: sql<number>`count(*)` })
        .from(shifts)
        .where(and(eq(shifts.tenantId, tenantId), eq(shifts.status, "filled")));
      const [completedShifts] = await db
        .select({ count: sql<number>`count(*)` })
        .from(shifts)
        .where(and(eq(shifts.tenantId, tenantId), eq(shifts.status, "completed")));

      const tenantShifts = await db.select().from(shifts).where(eq(shifts.tenantId, tenantId));
      const shiftIds = tenantShifts.map((s) => s.id);
      let pendingApps = 0;
      if (shiftIds.length > 0) {
        const allApps = await db.select().from(applications).where(eq(applications.status, "pending"));
        pendingApps = allApps.filter((a) => shiftIds.includes(a.shiftId)).length;
      }

      stats.openShifts = Number(openShifts?.count ?? 0);
      stats.filledShifts = Number(filledShifts?.count ?? 0);
      stats.completedShifts = Number(completedShifts?.count ?? 0);
      stats.pendingApplications = pendingApps;
      stats.totalShifts = stats.openShifts + stats.filledShifts + stats.completedShifts;
    } else if (role === "WORKER") {
      const [openShifts] = await db
        .select({ count: sql<number>`count(*)` })
        .from(shifts)
        .where(eq(shifts.status, "open"));
      const [myApps] = await db
        .select({ count: sql<number>`count(*)` })
        .from(applications)
        .where(and(eq(applications.workerId, userId), eq(applications.status, "pending")));
      const [myAssignments] = await db
        .select({ count: sql<number>`count(*)` })
        .from(assignments)
        .where(eq(assignments.workerId, userId));

      const [profile] = await db.select().from(workerProfiles).where(eq(workerProfiles.userId, userId));

      stats.openShifts = Number(openShifts?.count ?? 0);
      stats.myApplications = Number(myApps?.count ?? 0);
      stats.myAssignments = Number(myAssignments?.count ?? 0);
      stats.reliabilityScore = profile?.reliabilityScore ?? 100;
    }

    return stats;
  }
}

export const storage = new DatabaseStorage();
