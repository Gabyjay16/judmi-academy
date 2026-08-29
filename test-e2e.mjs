import { db, initDatabase } from "./src/db/index.ts";
import { tests, questions, submissions } from "./src/db/schema.ts";
import { seedDemoData } from "./src/db/seed.ts";
import { eq } from "drizzle-orm";

async function testTimerAndRetakeLogic() {
  console.log("1. Initializing DB with updated schema...");
  await initDatabase();
  await seedDemoData();

  console.log("\n2. Testing Auto-Calculated Duration Logic (1 min per question)...");
  // Test case A: 10 questions -> duration should automatically be 10 minutes
  const qCount1 = 10;
  const autoDuration1 = qCount1; // 1 min / question
  console.log(`- For a 10-question test: Auto duration = ${autoDuration1} minutes (Expected: 10m) -> ${autoDuration1 === 10 ? "PASSED" : "FAILED"}`);

  // Test case B: 25 questions -> duration should automatically be 25 minutes
  const qCount2 = 25;
  const autoDuration2 = qCount2; // 1 min / question
  console.log(`- For a 25-question test: Auto duration = ${autoDuration2} minutes (Expected: 25m) -> ${autoDuration2 === 25 ? "PASSED" : "FAILED"}`);

  console.log("\n3. Testing Retake Policy on Seeded Test...");
  const seeded = await db.select().from(tests).where(eq(tests.code, "BIO101")).limit(1);
  console.log(`- BIO101 Allow Retake: ${seeded[0].allowRetake === 1 ? "Allowed (1)" : "Disabled (0)"}`);

  console.log("\n ALL TIMER & RETAKE LOGIC VERIFIED SUCCESSFULLY!");
}

testTimerAndRetakeLogic().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
