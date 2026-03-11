import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { ensureAdminExists } from "./ensureAdmin";
import { db } from "./db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

// DATABASE REPAIR FUNCTION
async function runRepair() {
  try {
    log(">>> STARTING DATABASE REPAIR...");
    const workers = await db
      .select()
      .from(users)
      .where(eq(users.role, "WORKER"));

    for (const w of workers) {
      let updates: any = {};

      // 1. Fix Last Name (Clear out accidental +1)
      if (w.lastName === "+1") {
        updates.lastName = "";
      }

      // 2. Fix Phone Number (Add country prefixes if missing)
      if (w.phone && !w.phone.startsWith("+")) {
        let prefix = "+1";
        if (w.firstName?.includes("Anesu")) prefix = "+263";
        if (w.firstName?.includes("Queen")) prefix = "+250";
        updates.phone = `${prefix}${w.phone}`.replace(/[\s-()]/g, "");
      }

      if (Object.keys(updates).length > 0) {
        await db.update(users).set(updates).where(eq(users.id, w.id));
      }
    }
    log(`>>> REPAIR COMPLETE: Checked ${workers.length} users.`);
  } catch (err) {
    console.error("Repair failed:", err);
  }
}

(async () => {
  // Run data cleanup on start
  await runRepair();

  await ensureAdminExists();
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
