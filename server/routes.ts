import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { loginSchema, registerSchema, insertShiftSchema, insertTenantSchema, insertApplicationSchema } from "@shared/schema";
import { z } from "zod";

const JWT_SECRET = process.env.SESSION_SECRET || "healthstaff-secret-key-2024";

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    tenantId: string | null;
  };
}

// Authentication middleware
function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      role: string;
      tenantId: string | null;
    };
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
}

// Role-based authorization middleware
function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Auth routes
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      const user = await storage.getUserByEmail(email);

      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      if (user.status === "suspended") {
        return res.status(403).json({ message: "Account suspended" });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, tenantId: user.tenantId },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      const userWithProfile = await storage.getUserWithProfile(user.id);
      res.json({ token, user: userWithProfile });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const data = registerSchema.parse(req.body);
      const existingUser = await storage.getUserByEmail(data.email);

      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const passwordHash = await bcrypt.hash(data.password, 10);
      const user = await storage.createUser({
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: data.role,
        status: "pending",
        tenantId: null,
      });

      // If worker, create profile
      if (data.role === "WORKER") {
        await storage.createWorkerProfile({
          userId: user.id,
          licenseType: "RN",
          licenseNumber: "",
          licenseExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          verified: false,
        });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, tenantId: user.tenantId },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      const userWithProfile = await storage.getUserWithProfile(user.id);
      res.json({ token, user: userWithProfile });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Register error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/auth/me", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const userWithProfile = await storage.getUserWithProfile(req.user.id);
      if (!userWithProfile) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ user: userWithProfile });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const stats = await storage.getDashboardStats(req.user.id, req.user.role, req.user.tenantId ?? undefined);
      res.json(stats);
    } catch (error) {
      console.error("Stats error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Tenants routes
  app.get("/api/tenants", authenticateToken, requireRole("SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
    try {
      const tenants = await storage.getTenants();
      res.json(tenants);
    } catch (error) {
      console.error("Get tenants error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/tenants", authenticateToken, requireRole("SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
    try {
      const data = insertTenantSchema.parse(req.body);
      const tenant = await storage.createTenant({
        ...data,
        status: "pending",
      });
      res.json(tenant);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Create tenant error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/tenants/:id", authenticateToken, requireRole("SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const tenant = await storage.updateTenant(id, req.body);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }
      res.json(tenant);
    } catch (error) {
      console.error("Update tenant error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Workers routes
  app.get("/api/workers", authenticateToken, requireRole("SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
    try {
      const workers = await storage.getWorkers();
      res.json(workers);
    } catch (error) {
      console.error("Get workers error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/workers/:id/verify", authenticateToken, requireRole("SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const profile = await storage.updateWorkerProfile(id, { verified: true });
      await storage.updateUser(id, { status: "active" });
      if (!profile) {
        return res.status(404).json({ message: "Worker profile not found" });
      }
      res.json({ message: "Worker verified successfully" });
    } catch (error) {
      console.error("Verify worker error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/workers/:id/suspend", authenticateToken, requireRole("SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      await storage.updateUser(id, { status: "suspended" });
      res.json({ message: "Worker suspended" });
    } catch (error) {
      console.error("Suspend worker error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Shifts routes
  app.get("/api/shifts", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      let shifts;
      if (req.user.role === "SUPER_ADMIN") {
        shifts = await storage.getShifts();
      } else if (req.user.role === "FACILITY_ADMIN" && req.user.tenantId) {
        shifts = await storage.getShifts(req.user.tenantId);
      } else if (req.user.role === "WORKER") {
        // Workers see all open shifts they're eligible for
        shifts = await storage.getShifts();
        shifts = shifts.filter((s) => s.status === "open" || s.status === "offered");
      } else {
        shifts = [];
      }
      res.json(shifts);
    } catch (error) {
      console.error("Get shifts error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/shifts", authenticateToken, requireRole("SUPER_ADMIN", "FACILITY_ADMIN"), async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const data = insertShiftSchema.parse(req.body);
      const tenantId = req.user.role === "FACILITY_ADMIN" ? req.user.tenantId : data.tenantId;

      if (!tenantId) {
        return res.status(400).json({ message: "Tenant ID required" });
      }

      const shift = await storage.createShift({
        ...data,
        tenantId,
        status: "open",
      });
      res.json(shift);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Create shift error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/shifts/:id", authenticateToken, requireRole("SUPER_ADMIN", "FACILITY_ADMIN"), async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const shift = await storage.getShift(id);

      if (!shift) {
        return res.status(404).json({ message: "Shift not found" });
      }

      // Check if shift can be edited (not after acceptance)
      if (shift.status === "filled" || shift.status === "completed") {
        return res.status(400).json({ message: "Cannot edit shift after acceptance" });
      }

      const updated = await storage.updateShift(id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Update shift error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Applications routes
  app.get("/api/applications", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const applications = await storage.getApplications(
        req.user.id,
        req.user.role,
        req.user.tenantId ?? undefined
      );
      res.json(applications);
    } catch (error) {
      console.error("Get applications error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/applications", authenticateToken, requireRole("WORKER"), async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { shiftId, message } = req.body;

      // Check if shift exists and is open
      const shift = await storage.getShift(shiftId);
      if (!shift) {
        return res.status(404).json({ message: "Shift not found" });
      }
      if (shift.status !== "open") {
        return res.status(400).json({ message: "Shift is not open for applications" });
      }

      // Check if already applied
      const existingApp = await storage.getApplicationByShiftAndWorker(shiftId, req.user.id);
      if (existingApp) {
        return res.status(400).json({ message: "You have already applied to this shift" });
      }

      // Check if worker is verified
      const profile = await storage.getWorkerProfile(req.user.id);
      if (!profile?.verified) {
        return res.status(400).json({ message: "Your profile must be verified before applying" });
      }

      const application = await storage.createApplication({
        shiftId,
        workerId: req.user.id,
        message,
        status: "pending",
      });
      res.json(application);
    } catch (error) {
      console.error("Create application error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/applications/:id", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { id } = req.params;
      const { status } = req.body;
      const application = await storage.getApplication(id);

      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      // Workers can only withdraw their own applications
      if (req.user.role === "WORKER") {
        if (application.workerId !== req.user.id) {
          return res.status(403).json({ message: "Not authorized" });
        }
        if (status !== "withdrawn") {
          return res.status(400).json({ message: "Workers can only withdraw applications" });
        }
      }

      const updated = await storage.updateApplication(id, { status });

      // If accepted, create assignment and update shift status
      if (status === "accepted") {
        await storage.createAssignment({
          shiftId: application.shiftId,
          workerId: application.workerId,
          approved: false,
          payoutStatus: "pending",
        });
        await storage.updateShift(application.shiftId, { status: "filled" });

        // Reject all other pending applications for this shift
        const allApps = await storage.getApplications(req.user.id, "SUPER_ADMIN");
        for (const app of allApps) {
          if (app.shiftId === application.shiftId && app.id !== id && app.status === "pending") {
            await storage.updateApplication(app.id, { status: "rejected" });
          }
        }
      }

      res.json(updated);
    } catch (error) {
      console.error("Update application error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Assignments routes
  app.get("/api/assignments", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const assignments = await storage.getAssignments(
        req.user.id,
        req.user.role,
        req.user.tenantId ?? undefined
      );
      res.json(assignments);
    } catch (error) {
      console.error("Get assignments error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/assignments/:id/checkin", authenticateToken, requireRole("WORKER"), async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { id } = req.params;
      const assignment = await storage.getAssignment(id);

      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      if (assignment.workerId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized" });
      }
      if (assignment.checkIn) {
        return res.status(400).json({ message: "Already checked in" });
      }

      const updated = await storage.updateAssignment(id, { checkIn: new Date() });
      res.json(updated);
    } catch (error) {
      console.error("Check in error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/assignments/:id/checkout", authenticateToken, requireRole("WORKER"), async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { id } = req.params;
      const assignment = await storage.getAssignment(id);

      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      if (assignment.workerId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized" });
      }
      if (!assignment.checkIn) {
        return res.status(400).json({ message: "Must check in first" });
      }
      if (assignment.checkOut) {
        return res.status(400).json({ message: "Already checked out" });
      }

      const updated = await storage.updateAssignment(id, { checkOut: new Date() });
      res.json(updated);
    } catch (error) {
      console.error("Check out error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/assignments/:id/approve", authenticateToken, requireRole("SUPER_ADMIN", "FACILITY_ADMIN"), async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const assignment = await storage.getAssignment(id);

      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      if (!assignment.checkOut) {
        return res.status(400).json({ message: "Worker must check out first" });
      }
      if (assignment.approved) {
        return res.status(400).json({ message: "Already approved" });
      }

      await storage.updateAssignment(id, { approved: true, payoutStatus: "processing" });
      await storage.updateShift(assignment.shiftId, { status: "completed" });

      res.json({ message: "Assignment approved and shift completed" });
    } catch (error) {
      console.error("Approve assignment error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Profile routes
  app.patch("/api/profile", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { firstName, lastName, phone, licenseType, licenseNumber, licenseExpiry, bio, availability } = req.body;

      // Update user
      await storage.updateUser(req.user.id, { firstName, lastName, phone });

      // Update worker profile if applicable
      if (req.user.role === "WORKER") {
        const profile = await storage.getWorkerProfile(req.user.id);
        if (profile) {
          await storage.updateWorkerProfile(req.user.id, {
            licenseType,
            licenseNumber,
            licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : undefined,
            bio,
            availability,
          });
        }
      }

      const updatedUser = await storage.getUserWithProfile(req.user.id);
      res.json(updatedUser);
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  return httpServer;
}
