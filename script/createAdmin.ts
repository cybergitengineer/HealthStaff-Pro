import { db } from "../server/db";
import { users } from "../shared/schema";
import bcrypt from "bcryptjs";

async function main() {
  const hashedPassword = await bcrypt.hash("admin123", 10);

  await db.insert(users).values({
    username: "superadmin",
    passwordHash: hashedPassword,
    email: "admin@example.com",
    firstName: "Super",
    lastName: "Admin",
    role: "ADMIN"
  }).onConflictDoUpdate({
    target: [users.username],
    set: { passwordHash: hashedPassword }
  });

  console.log("Admin account created/updated: admin@example.com / admin123");
}

main().catch(console.error);