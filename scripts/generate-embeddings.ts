/**
 * Generate embeddings for all CFR sections
 * 
 * Usage:
 *   tsx scripts/generate-embeddings.ts [--batch-size=100] [--title=21]
 * 
 * Options:
 *   --batch-size: Number of sections to process before logging progress (default: 100)
 *   --title: Only process sections from a specific title number
 *   --limit: Maximum number of sections to process (for testing)
 */

import "dotenv/config";
import { getDb } from "../server/db";
import { cfrSections, cfrParts, cfrTitles } from "../drizzle/schema";
import { generateSectionEmbeddings } from "../server/_core/rag";
import { eq, isNull, and, isNotNull, sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("❌ Database not available. Check your DATABASE_URL in .env");
    process.exit(1);
  }
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  let batchSize = 100;
  let titleFilter: number | undefined;
  let limit: number | undefined;
  
  for (const arg of args) {
    if (arg.startsWith("--batch-size=")) {
      batchSize = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--title=")) {
      titleFilter = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--limit=")) {
      limit = parseInt(arg.split("=")[1], 10);
    }
  }
  
  console.log("🚀 Starting embedding generation...");
  console.log(`📊 Batch size: ${batchSize}`);
  if (titleFilter) console.log(`📌 Title filter: ${titleFilter}`);
  if (limit) console.log(`⚠️  Limit: ${limit} sections`);
  
  // Find sections without embeddings
  const query = db
    .select({
      id: cfrSections.id,
      titleNumber: cfrTitles.titleNumber,
    })
    .from(cfrSections)
    .innerJoin(cfrParts, eq(cfrSections.partId, cfrParts.id))
    .innerJoin(cfrTitles, eq(cfrParts.titleId, cfrTitles.id))
    .where(
      and(
        isNull(cfrSections.embedding),
        titleFilter ? eq(cfrTitles.titleNumber, titleFilter) : undefined
      )
    );
  
  if (limit) {
    query.limit(limit);
  }
  
  const sectionsToProcess = await query;
  
  console.log(`\n📝 Found ${sectionsToProcess.length} sections without embeddings`);
  
  if (sectionsToProcess.length === 0) {
    console.log("✅ All sections already have embeddings!");
    return;
  }
  
  // Confirm before proceeding
  console.log("\n⏳ Starting in 3 seconds... (Ctrl+C to cancel)");
  await new Promise((resolve) => setTimeout(resolve, 3000));
  
  const sectionIds = sectionsToProcess.map((s) => s.id);
  const startTime = Date.now();
  
  // Generate embeddings
  const result = await generateSectionEmbeddings(sectionIds, batchSize);
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  console.log("\n✅ Embedding generation complete!");
  console.log(`   Success: ${result.success}`);
  console.log(`   Failed: ${result.failed}`);
  console.log(`   Duration: ${duration}s`);
  console.log(`   Rate: ${(result.success / parseFloat(duration)).toFixed(2)} sections/sec`);
  
  // Show statistics
  const totalWithEmbeddings = await db
    .select({
      count: sql<number>`COUNT(*)`,
    })
    .from(cfrSections)
    .where(isNotNull(cfrSections.embedding));
  
  console.log(`\n📊 Total sections with embeddings: ${totalWithEmbeddings[0]?.count || 0}`);
}

main()
  .then(() => {
    console.log("\n🎉 Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });
