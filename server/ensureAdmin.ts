import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function ensureAdminExists() {
  try {
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.role, "SUPER_ADMIN"))
      .limit(1);

    if (existingAdmin.length === 0) {
      console.log("No admin account found. Creating default admin...");
      
      const adminPasswordHash = await bcrypt.hash("admin123", 10);
      
      await db.insert(users).values({
        email: "admin@example.com",
        passwordHash: adminPasswordHash,
        firstName: "Super",
        lastName: "Admin",
        role: "SUPER_ADMIN",
        status: "active",
        phone: "(555) 100-0001",
      });
      
      console.log("Default admin created: admin@example.com / admin123");
    }
  } catch (error) {
    console.error("Error ensuring admin exists:", error);
  }
}
