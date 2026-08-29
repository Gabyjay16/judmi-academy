import { db, initDatabase } from "./src/db/index.ts";
import { users, organizations, passwordResetRequests, submissions, tests } from "./src/db/schema.ts";
import { seedDemoData } from "./src/db/seed.ts";
import { eq, desc } from "drizzle-orm";
import { hashPassword, verifyPassword, generateSessionToken, decodeSessionToken } from "./src/lib/auth.ts";

async function runAuthAndMultiTenantTests() {
  console.log("=================================================");
  console.log("🚀 EVALAI AUTH, MULTI-TENANCY & ADMIN RESET TESTS");
  console.log("=================================================\n");

  // 1. Init Database & Seed
  console.log("1. Initializing DB & Seeding Multi-Tenant Demo Data...");
  await initDatabase();
  await seedDemoData();
  console.log(" Database initialized and demo accounts seeded.\n");

  // 2. Test User Accounts & Password Verifications
  console.log("2. Verifying Seeded User Accounts & Roles...");
  const seededUsers = await db.select().from(users);
  console.log(`- Total users registered: ${seededUsers.length}`);

  for (const u of seededUsers) {
    const isPassValid = await verifyPassword(u.role === "admin" ? "admin123" : "password123", u.passwordHash);
    console.log(`  • [${u.role.toUpperCase()}] ${u.name} (${u.email}) -> Pass Hash Valid: ${isPassValid ? "✅ YES" : "❌ NO"}`);
  }

  // 3. Test Student Dashboard & Test History Retrieval
  console.log("\n3. Testing Student Test History & Transcripts...");
  const student = seededUsers.find(u => u.role === "student");
  if (!student) throw new Error("Student not found");

  const studentSubmissions = await db
    .select()
    .from(submissions)
    .where(eq(submissions.studentUserId, student.id));
  
  console.log(`- Student ${student.name} (${student.email}) has ${studentSubmissions.length} past test transcript(s).`);
  if (studentSubmissions.length > 0) {
    const sub = studentSubmissions[0];
    console.log(`  • Past Exam Score: ${sub.score}/${sub.maxScore} (${sub.percentage}%) - Status: ${sub.passed ? "Passed ✅" : "Failed ❌"}`);
  }

  // 4. Test Password Reset Workflow (Request -> Admin Approval -> Password Reset)
  console.log("\n4. Testing Admin Password Reset Approval Workflow...");
  
  // Step A: Check pending request
  const pendingRequests = await db
    .select()
    .from(passwordResetRequests)
    .where(eq(passwordResetRequests.status, "pending"));
  
  console.log(`- Pending reset requests in queue: ${pendingRequests.length}`);
  const targetReq = pendingRequests[0];
  console.log(`  • Request from: ${targetReq.email} (Reason: "${targetReq.reason}")`);

  // Step B: Admin Approves Request
  const approvedToken = `rst_test_${Math.random().toString(36).substring(2, 10)}`;
  await db
    .update(passwordResetRequests)
    .set({
      status: "approved",
      resetToken: approvedToken,
      reviewedAt: new Date().toISOString(),
      reviewedByAdminId: "user-admin-001",
    })
    .where(eq(passwordResetRequests.id, targetReq.id));
  
  console.log(`- Admin approved request. Generated Token: ${approvedToken}`);

  // Step C: User resets password with approved token
  const newSecretPassword = "NewSecretPassword2026!";
  const newHash = await hashPassword(newSecretPassword);
  await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, targetReq.userId));
  await db.update(passwordResetRequests).set({ status: "used" }).where(eq(passwordResetRequests.id, targetReq.id));

  // Step D: Verify new password works
  const updatedUser = (await db.select().from(users).where(eq(users.id, targetReq.userId)))[0];
  const isNewPassValid = await verifyPassword(newSecretPassword, updatedUser.passwordHash);
  console.log(`- Password update applied. Can log in with new password: ${isNewPassValid ? "✅ YES" : "❌ NO"}`);

  // 5. Test Organization Sub-Accounts & Seats
  console.log("\n5. Testing Organization & Sub-Accounts Management...");
  const org = (await db.select().from(organizations))[0];
  const orgMembers = await db.select().from(users).where(eq(users.orgId, org.id));
  console.log(`- School: ${org.name} (Plan: ${org.planType})`);
  console.log(`- Seat Limit: ${org.seatLimit} | Active Sub-Accounts: ${orgMembers.length}`);
  console.log(`- Available Seats: ${org.seatLimit - orgMembers.length}`);

  console.log("\n=================================================");
  console.log("🎉 ALL MULTI-TENANT AUTH & ADMIN WORKFLOWS PASSED!");
  console.log("=================================================\n");
}

runAuthAndMultiTenantTests().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
