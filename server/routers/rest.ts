/**
 * REST API endpoints with Swagger documentation.
 * Provides REST alternatives to tRPC endpoints for external integrations.
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import { sql } from "drizzle-orm";
import * as cfr from "../cfr";
import * as db from "../db";
import { getRedis } from "../_core/redis";
import { cfrTitles, cfrParts, cfrSections } from "../../drizzle/schema";

const router = Router();
const REST_API_KEY = process.env.REST_API_KEY;

/** Optional API-key auth: if REST_API_KEY is set, require X-API-Key header to match. */
function optionalApiKeyAuth(req: Request, res: Response, next: NextFunction) {
  if (!REST_API_KEY) return next();
  const key = req.header("X-API-Key");
  if (key === REST_API_KEY) return next();
  res.status(401).json({ success: false, error: "Invalid or missing X-API-Key" });
}

// --- Health (no auth) ---
/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check
 *     tags:
 *       - Diagnostics
 *     security: []
 *     responses:
 *       200:
 *         description: Service status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 database:
 *                   type: string
 *                   enum: [ok, error]
 *                 redis:
 *                   type: string
 *                   enum: [ok, unavailable, error]
 */
router.get("/api/health", async (_req: Request, res: Response) => {
  let database: "ok" | "error" = "error";
  let redis: "ok" | "unavailable" | "error" = "unavailable";

  try {
    const databaseInstance = await db.getDb();
    if (databaseInstance) {
      await databaseInstance.execute(sql`SELECT 1`);
      database = "ok";
    }
  } catch {
    database = "error";
  }

  try {
    const redisClient = await getRedis();
    if (redisClient) {
      await redisClient.ping();
      redis = "ok";
    }
  } catch {
    redis = "error";
  }

  const ok = database === "ok";
  res.status(ok ? 200 : 503).json({ ok, database, redis });
});

// Apply optional API-key auth to all routes below (search, diagnostics)
router.use(optionalApiKeyAuth);

/**
 * @swagger
 * /api/search/fulltext:
 *   get:
 *     summary: Full-text search across CFR sections
 *     description: Search for regulations by keyword in section subjects and content. Returns matching sections with their title and part information.
 *     tags:
 *       - Search
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 1
 *           maxLength: 500
 *         description: Search query (keyword or phrase)
 *         example: "vessel"
 *       - in: query
 *         name: titleNumber
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *         description: Filter by CFR title number (1-50)
 *         example: 19
 *       - in: query
 *         name: partNumber
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Filter by part number (requires titleNumber)
 *         example: 17
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Maximum number of results to return
 *         example: 50
 *     responses:
 *       200:
 *         description: Successful search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         description: Section ID
 *                         example: 12345
 *                       sectionNumber:
 *                         type: string
 *                         description: Section number (e.g., "101.1")
 *                         example: "101.1"
 *                       subject:
 *                         type: string
 *                         description: Section subject/title
 *                         example: "Definitions"
 *                       content:
 *                         type: string
 *                         description: Section content (may be truncated)
 *                         example: "For purposes of this part..."
 *                       partNumber:
 *                         type: integer
 *                         description: Part number
 *                         example: 17
 *                       partName:
 *                         type: string
 *                         description: Part name
 *                         example: "Customs Brokers"
 *                       titleNumber:
 *                         type: integer
 *                         description: Title number (1-50)
 *                         example: 19
 *                       titleName:
 *                         type: string
 *                         description: Title name
 *                         example: "Customs Duties"
 *                 count:
 *                   type: integer
 *                   description: Number of results returned
 *                   example: 25
 *       400:
 *         description: Bad request (missing or invalid parameters)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Query parameter 'q' is required"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Database connection failed"
 */
router.get("/api/search/fulltext", async (req: Request, res: Response) => {
  try {
    const q = req.query.q as string | undefined;
    const titleNumber = req.query.titleNumber ? Number(req.query.titleNumber) : undefined;
    const partNumber = req.query.partNumber ? Number(req.query.partNumber) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;

    // Validation
    if (!q || typeof q !== "string" || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Query parameter 'q' is required and must be a non-empty string",
      });
    }

    if (q.length > 500) {
      return res.status(400).json({
        success: false,
        error: "Query parameter 'q' must be 500 characters or less",
      });
    }

    if (titleNumber !== undefined && (isNaN(titleNumber) || titleNumber < 1 || titleNumber > 50)) {
      return res.status(400).json({
        success: false,
        error: "titleNumber must be an integer between 1 and 50",
      });
    }

    if (partNumber !== undefined && (isNaN(partNumber) || partNumber < 1)) {
      return res.status(400).json({
        success: false,
        error: "partNumber must be a positive integer",
      });
    }

    if (limit !== undefined && (isNaN(limit) || limit < 1 || limit > 100)) {
      return res.status(400).json({
        success: false,
        error: "limit must be an integer between 1 and 100",
      });
    }

    // Execute search
    const results = await cfr.searchFulltext(q, {
      titleNumber,
      partNumber,
      limit,
    });

    return res.json({
      success: true,
      data: results,
      count: results.length,
    });
  } catch (error: any) {
    console.error("[REST API] Fulltext search error:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Internal server error",
    });
  }
});

// --- Titles (CFR titles and parts by number/year) ---

/**
 * @swagger
 * /api/titles:
 *   get:
 *     summary: List CFR titles
 *     description: Returns all CFR titles, optionally filtered by year. Without year, returns latest version of each title (1-50).
 *     tags:
 *       - Titles
 *     parameters:
 *       - in: query
 *         name: year
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1970
 *           maximum: 2030
 *         description: Filter by year (e.g. 2013)
 *     responses:
 *       200:
 *         description: List of titles
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       titleNumber:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       subject:
 *                         type: string
 *                       year:
 *                         type: integer
 *                 count:
 *                   type: integer
 *       400:
 *         description: Invalid year
 */
router.get("/api/titles", async (req: Request, res: Response) => {
  try {
    const yearParam = req.query.year;
    const year = yearParam != null ? Number(yearParam) : undefined;
    if (yearParam != null && (Number.isNaN(year) || year < 1970 || year > 2030)) {
      return res.status(400).json({ success: false, error: "year must be an integer between 1970 and 2030" });
    }
    const data = await cfr.listTitles(year);
    return res.json({ success: true, data, count: data.length });
  } catch (error: any) {
    console.error("[REST API] List titles error:", error);
    return res.status(500).json({ success: false, error: error?.message || "Internal server error" });
  }
});

/**
 * @swagger
 * /api/titles/{titleNumber}/parts/{partNumber}:
 *   get:
 *     summary: Get one CFR part with its sections
 *     description: Returns a single part by title number and part number, with full section list (subject + content).
 *     tags:
 *       - Titles
 *     parameters:
 *       - in: path
 *         name: titleNumber
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *       - in: path
 *         name: partNumber
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: Part with sections
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     title:
 *                       type: object
 *                     part:
 *                       type: object
 *                     sections:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                           sectionNumber:
 *                           subject:
 *                           content:
 *       404:
 *         description: Part not found
 */
router.get("/api/titles/:titleNumber/parts/:partNumber", async (req: Request, res: Response) => {
  try {
    const titleNumber = Number(req.params.titleNumber);
    const partNumber = Number(req.params.partNumber);
    if (Number.isNaN(titleNumber) || titleNumber < 1 || titleNumber > 50) {
      return res.status(400).json({ success: false, error: "titleNumber must be 1-50" });
    }
    if (Number.isNaN(partNumber) || partNumber < 1) {
      return res.status(400).json({ success: false, error: "partNumber must be a positive integer" });
    }
    const data = await cfr.getPart(titleNumber, partNumber);
    if (!data) return res.status(404).json({ success: false, error: "Part not found" });
    return res.json({ success: true, data });
  } catch (error: any) {
    console.error("[REST API] Get part error:", error);
    return res.status(500).json({ success: false, error: error?.message || "Internal server error" });
  }
});

/**
 * @swagger
 * /api/titles/{titleNumber}:
 *   get:
 *     summary: Get one CFR title with its parts
 *     description: Returns a single title by number, optionally for a specific year. Includes list of parts (no section content).
 *     tags:
 *       - Titles
 *     parameters:
 *       - in: path
 *         name: titleNumber
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *         description: CFR title number (1-50)
 *       - in: query
 *         name: year
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1970
 *           maximum: 2030
 *         description: Year (optional; if omitted, latest year for that title)
 *     responses:
 *       200:
 *         description: Title with parts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                     titleNumber:
 *                     name:
 *                     year:
 *                     parts:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                           partNumber:
 *                           name:
 *                           subject:
 *       404:
 *         description: Title not found
 */
router.get("/api/titles/:titleNumber", async (req: Request, res: Response) => {
  try {
    const titleNumber = Number(req.params.titleNumber);
    if (Number.isNaN(titleNumber) || titleNumber < 1 || titleNumber > 50) {
      return res.status(400).json({ success: false, error: "titleNumber must be 1-50" });
    }
    const yearParam = req.query.year;
    const year = yearParam != null ? Number(yearParam) : undefined;
    if (yearParam != null && (Number.isNaN(year) || year < 1970 || year > 2030)) {
      return res.status(400).json({ success: false, error: "year must be 1970-2030" });
    }
    const data = await cfr.getTitle(titleNumber, year);
    if (!data) return res.status(404).json({ success: false, error: "Title not found" });
    return res.json({ success: true, data });
  } catch (error: any) {
    console.error("[REST API] Get title error:", error);
    return res.status(500).json({ success: false, error: error?.message || "Internal server error" });
  }
});

/**
 * @swagger
 * /api/diagnostics/coverage:
 *   get:
 *     summary: Database coverage diagnostics
 *     description: Detailed statistics about CFR data in MySQL - shows what's loaded vs expected (50 titles, ~4.75M sections)
 *     tags:
 *       - Diagnostics
 *     responses:
 *       200:
 *         description: Coverage statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     titles:
 *                       type: object
 *                       properties:
 *                         unique:
 *                           type: integer
 *                           description: Number of unique title numbers (should be 50)
 *                         total:
 *                           type: integer
 *                           description: Total title records (including multiple years)
 *                         byYear:
 *                           type: object
 *                           description: Count of titles by year
 *                     parts:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         avgPerTitle:
 *                           type: number
 *                     sections:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           description: Total sections (target: ~4.75M)
 *                         avgPerPart:
 *                           type: number
 *                     years:
 *                       type: array
 *                       items:
 *                         type: integer
 *                       description: Available years in database
 *                     expected:
 *                       type: object
 *                       properties:
 *                         titles:
 *                           type: integer
 *                           example: 50
 *                         sections:
 *                           type: string
 *                           example: "4.75M"
 *                     missing:
 *                       type: object
 *                       properties:
 *                         titles:
 *                           type: integer
 *                           description: Missing title numbers (1-50)
 *                         percentage:
 *                           type: number
 *                           description: Coverage percentage
 */
router.get("/api/diagnostics/coverage", async (req: Request, res: Response) => {
  try {
    const database = await db.getDb();
    if (!database) {
      return res.status(500).json({
        success: false,
        error: "Database not available",
      });
    }

    // Get unique title numbers
    const uniqueTitlesResult = await database
      .select({ titleNumber: cfrTitles.titleNumber })
      .from(cfrTitles)
      .groupBy(cfrTitles.titleNumber);

    const uniqueTitleNumbers = uniqueTitlesResult.map((r) => r.titleNumber).sort((a, b) => a - b);
    const expectedTitles = Array.from({ length: 50 }, (_, i) => i + 1);
    const missingTitles = expectedTitles.filter((n) => !uniqueTitleNumbers.includes(n));

    // Get titles by year
    const titlesByYearResult = await database
      .select({
        year: cfrTitles.year,
        count: sql<number>`count(*)`,
      })
      .from(cfrTitles)
      .groupBy(cfrTitles.year)
      .orderBy(cfrTitles.year);

    const titlesByYear: Record<number, number> = {};
    titlesByYearResult.forEach((r) => {
      titlesByYear[r.year] = Number(r.count);
    });

    // Get total counts
    const [titlesTotalRow] = await database
      .select({ c: sql<number>`count(*)` })
      .from(cfrTitles)
      .limit(1);

    const [partsTotalRow] = await database
      .select({ c: sql<number>`count(*)` })
      .from(cfrParts)
      .limit(1);

    const [sectionsTotalRow] = await database
      .select({ c: sql<number>`count(*)` })
      .from(cfrSections)
      .limit(1);

    const titlesTotal = Number(titlesTotalRow?.c ?? 0);
    const partsTotal = Number(partsTotalRow?.c ?? 0);
    const sectionsTotal = Number(sectionsTotalRow?.c ?? 0);

    // Get parts per title average
    const partsPerTitleAvg = titlesTotal > 0 ? partsTotal / titlesTotal : 0;

    // Get sections per part average
    const sectionsPerPartAvg = partsTotal > 0 ? sectionsTotal / partsTotal : 0;

    // Get available years
    const yearsResult = await database
      .selectDistinct({ year: cfrTitles.year })
      .from(cfrTitles)
      .orderBy(cfrTitles.year);

    const years = yearsResult.map((r) => r.year);

    // Calculate coverage percentage
    const titlesCoverage = (uniqueTitleNumbers.length / 50) * 100;
    const sectionsTarget = 4_750_000;
    const sectionsCoverage = (sectionsTotal / sectionsTarget) * 100;

    return res.json({
      success: true,
      data: {
        titles: {
          unique: uniqueTitleNumbers.length,
          total: titlesTotal,
          numbers: uniqueTitleNumbers,
          byYear: titlesByYear,
        },
        parts: {
          total: partsTotal,
          avgPerTitle: Math.round(partsPerTitleAvg * 100) / 100,
        },
        sections: {
          total: sectionsTotal,
          avgPerPart: Math.round(sectionsPerPartAvg * 100) / 100,
        },
        years,
        expected: {
          titles: 50,
          sections: "4.75M",
        },
        missing: {
          titles: missingTitles,
          titlesCount: missingTitles.length,
          titlesCoverage: Math.round(titlesCoverage * 100) / 100,
          sectionsCoverage: Math.round(sectionsCoverage * 100) / 100,
        },
      },
    });
  } catch (error: any) {
    console.error("[REST API] Coverage diagnostics error:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Internal server error",
    });
  }
});

export default router;
