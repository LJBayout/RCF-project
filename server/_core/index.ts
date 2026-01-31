import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import restRouter from "../routers/rest";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  
  // Swagger / OpenAPI configuration
  const defaultPortStr = process.env.PORT || "3000";
  const baseUrl =
    process.env.NODE_ENV === "production"
      ? process.env.API_BASE_URL || "https://api.cfrdata.com"
      : `http://localhost:${defaultPortStr}`;

  const swaggerOptions: swaggerJsdoc.Options = {
    definition: {
      openapi: "3.0.3",
      info: {
        title: "CFR Data Platform API",
        version: "1.0.0",
        description: [
          "REST API for the **Code of Federal Regulations (CFR)** — the codification of U.S. federal regulations.",
          "",
          "**Capabilities:**",
          "- **Full-text search** across all 50 CFR titles (section subjects and content)",
          "- **Title & part metadata** — list titles by year, get parts and sections",
          "- **Diagnostics** — coverage stats (titles, parts, sections) and data health",
          "",
          "Data is loaded via the CFR ingestion pipeline; use `/api/diagnostics/coverage` to see what is available.",
        ].join("\n"),
        termsOfService: "#",
        contact: {
          name: "CFR Data Platform",
          url: "https://github.com/your-org/cfr_data_platform",
          email: "support@example.com",
        },
        license: {
          name: "MIT",
          url: "https://opensource.org/licenses/MIT",
        },
      },
      servers: [
        { url: baseUrl, description: process.env.NODE_ENV === "production" ? "Production" : "Local" },
      ],
      tags: [
        { name: "Search", description: "Full-text search across CFR sections" },
        { name: "Titles", description: "CFR titles and parts by number/year" },
        { name: "Diagnostics", description: "Health check (service status, DB, Redis) and data coverage (titles/parts/sections in DB)" },
      ],
      components: {
        securitySchemes: {
          ApiKeyAuth: {
            type: "apiKey",
            in: "header",
            name: "X-API-Key",
            description: "Optional. Set REST_API_KEY in env to require this header for search/diagnostics.",
          },
        },
        schemas: {
          Error: {
            type: "object",
            properties: {
              success: { type: "boolean", example: false },
              error: { type: "string", description: "Error message" },
            },
          },
        },
      },
      security: [{ ApiKeyAuth: [] }],
    },
    apis: ["./server/routers/rest.ts"],
  };

  const swaggerSpec = swaggerJsdoc(swaggerOptions);
  const swaggerCustomCss = `
    .swagger-ui .topbar { display: none }
  `;
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: swaggerCustomCss,
    customSiteTitle: "CFR Data Platform API",
  }));

  // REST API endpoints
  app.use(restRouter);

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
