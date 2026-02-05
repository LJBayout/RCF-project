import { getGapAnalysis } from "./server/_core/rag";
async function main() {
  const gaps = await getGapAnalysis();
  const summary = gaps.reduce((acc: any, curr: any) => {
    if (curr.status === "missing") {
      acc[curr.year] = (acc[curr.year] || 0) + 1;
    }
    return acc;
  }, {});
  console.log("Missing Years Summary (Count of Titles missing for each year):");
  console.log(JSON.stringify(summary, null, 2));
  
  const oldestMissing = gaps.filter(g => g.status === "missing").sort((a,b) => a.year - b.year).slice(0, 10);
  console.log("\nOldest 10 Missing Items:");
  console.log(JSON.stringify(oldestMissing, null, 2));
}
main().catch(console.error);
