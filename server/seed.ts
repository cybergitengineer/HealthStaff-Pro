import { db } from "./db";
import { tenants, users, workerProfiles, shifts } from "@shared/schema";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("Seeding database...");

  // Create demo tenant
  const [sunriseLTC] = await db
    .insert(tenants)
    .values({
      name: "Sunrise Senior Care",
      type: "LTC",
      status: "approved",
      rules: { cancellationWindow: 24, autoApprove: false },
      pricing: { markup: 15, flatFee: 0 },
    })
    .returning();

  console.log("Created tenant:", sunriseLTC.name);

  // Create demo users
  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  const facilityPasswordHash = await bcrypt.hash("facility123", 10);
  const workerPasswordHash = await bcrypt.hash("worker123", 10);

  // Super Admin
  const [adminUser] = await db
    .insert(users)
    .values({
      email: "admin@example.com",
      passwordHash: adminPasswordHash,
      firstName: "Super",
      lastName: "Admin",
      role: "SUPER_ADMIN",
      status: "active",
      phone: "(555) 100-0001",
    })
    .returning();

  console.log("Created admin user:", adminUser.email);

  // Facility Admin
  const [facilityUser] = await db
    .insert(users)
    .values({
      email: "facility@example.com",
      passwordHash: facilityPasswordHash,
      firstName: "Sarah",
      lastName: "Johnson",
      role: "FACILITY_ADMIN",
      status: "active",
      tenantId: sunriseLTC.id,
      phone: "(555) 200-0002",
    })
    .returning();

  console.log("Created facility user:", facilityUser.email);

  // Worker
  const [workerUser] = await db
    .insert(users)
    .values({
      email: "worker@example.com",
      passwordHash: workerPasswordHash,
      firstName: "Emily",
      lastName: "Chen",
      role: "WORKER",
      status: "active",
      phone: "(555) 300-0003",
    })
    .returning();

  console.log("Created worker user:", workerUser.email);

  // Create worker profile
  const [workerProfile] = await db
    .insert(workerProfiles)
    .values({
      userId: workerUser.id,
      licenseType: "RN",
      licenseNumber: "RN-2024-12345",
      licenseExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      specialties: ["Geriatric Care", "Wound Care", "Medication Administration"],
      availability: {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: false,
        sunday: false,
      },
      reliabilityScore: 98,
      verified: true,
      bio: "Experienced RN with 5+ years in long-term care settings. Passionate about providing compassionate care to seniors.",
    })
    .returning();

  console.log("Created worker profile for:", workerUser.email);

  // Create sample shifts
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(7, 0, 0, 0);

  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setHours(15, 0, 0, 0);

  const [shift1] = await db
    .insert(shifts)
    .values({
      tenantId: sunriseLTC.id,
      title: "Morning RN - Unit A",
      description: "Provide nursing care for residents in Unit A. Responsibilities include medication administration, wound care, and vital sign monitoring.",
      requiredLicense: "RN",
      startTime: tomorrow,
      endTime: tomorrowEnd,
      payRate: 45,
      urgency: "normal",
      status: "open",
      location: "Unit A, Floor 2",
      notes: "Familiarity with geriatric care preferred.",
    })
    .returning();

  console.log("Created shift:", shift1.title);

  const eveningStart = new Date();
  eveningStart.setDate(eveningStart.getDate() + 2);
  eveningStart.setHours(15, 0, 0, 0);

  const eveningEnd = new Date(eveningStart);
  eveningEnd.setHours(23, 0, 0, 0);

  const [shift2] = await db
    .insert(shifts)
    .values({
      tenantId: sunriseLTC.id,
      title: "Evening LPN - Memory Care",
      description: "Assist with evening care routines in memory care unit. Experience with dementia patients required.",
      requiredLicense: "LPN",
      startTime: eveningStart,
      endTime: eveningEnd,
      payRate: 35,
      urgency: "high",
      status: "open",
      location: "Memory Care Wing",
      notes: "Must have experience with dementia patients.",
    })
    .returning();

  console.log("Created shift:", shift2.title);

  const weekendStart = new Date();
  weekendStart.setDate(weekendStart.getDate() + 5);
  weekendStart.setHours(7, 0, 0, 0);

  const weekendEnd = new Date(weekendStart);
  weekendEnd.setHours(19, 0, 0, 0);

  const [shift3] = await db
    .insert(shifts)
    .values({
      tenantId: sunriseLTC.id,
      title: "Weekend CNA - Assisted Living",
      description: "Provide personal care assistance to residents. Help with ADLs, meals, and activities.",
      requiredLicense: "CNA",
      startTime: weekendStart,
      endTime: weekendEnd,
      payRate: 25,
      urgency: "critical",
      status: "open",
      location: "Assisted Living Building B",
      notes: "Weekend shift bonus available.",
    })
    .returning();

  console.log("Created shift:", shift3.title);

  console.log("\n✅ Database seeded successfully!");
  console.log("\n📧 Demo accounts:");
  console.log("   Super Admin: admin@example.com / admin123");
  console.log("   Facility Admin: facility@example.com / facility123");
  console.log("   Worker: worker@example.com / worker123");
}

seed()
  .then(() => {
    console.log("\nSeed completed.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
