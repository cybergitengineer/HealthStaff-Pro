import { Router } from "express";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/api/export-workers", async (req, res) => {
  const allWorkers = await db
    .select()
    .from(users)
    .where(eq(users.role, "WORKER"));

  let csv = "Full Name,Email,Phone\n";
  allWorkers.forEach((u) => {
    const fullName = `${u.firstName} ${u.lastName || ""}`.trim();
    csv += `${fullName},${u.email},${u.phone || "N/A"}\n`;
  });

  res.setHeader("Content-Type", "text/csv");
  res.attachment("workers_export.csv");
  return res.send(csv);
});

export default router;
