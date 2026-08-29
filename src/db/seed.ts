import { db, initDatabase } from "./index";
import { tests, questions, users, organizations, passwordResetRequests, submissions } from "./schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "../lib/auth";

export async function seedDemoData() {
  await initDatabase();

  const now = new Date().toISOString();

  // 1. Seed Demo Organization
  const orgId = "org-springfield-academy";
  const existingOrg = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
  if (existingOrg.length === 0) {
    await db.insert(organizations).values({
      id: orgId,
      name: "Springfield Academy of Sciences",
      slug: "springfield-academy",
      planType: "school_pro",
      seatLimit: 100,
      ownerEmail: "principal@springfield.edu",
      status: "active",
      createdAt: now,
    });
  }

  // 2. Seed Default Users with hashed passwords
  const defaultPasswordHash = await hashPassword("password123");
  const adminPasswordHash = await hashPassword("admin123");

  const demoUsers = [
    {
      id: "user-admin-001",
      name: "System Super Admin",
      email: "admin@evalai.com",
      passwordHash: adminPasswordHash,
      role: "admin",
      orgId: null,
      studentId: null,
      status: "active",
      createdAt: now,
    },
    {
      id: "user-org-admin-001",
      name: "Principal Arthur Vance",
      email: "principal@springfield.edu",
      passwordHash: defaultPasswordHash,
      role: "org_admin",
      orgId: orgId,
      studentId: null,
      status: "active",
      createdAt: now,
    },
    {
      id: "user-teacher-001",
      name: "Dr. Eleanor Vance",
      email: "teacher@springfield.edu",
      passwordHash: defaultPasswordHash,
      role: "teacher",
      orgId: orgId,
      studentId: null,
      status: "active",
      createdAt: now,
    },
    {
      id: "user-solo-teacher-002",
      name: "Prof. Marcus Chen (Solo)",
      email: "solo.teacher@gmail.com",
      passwordHash: defaultPasswordHash,
      role: "teacher",
      orgId: null, // Individual teacher
      studentId: null,
      status: "active",
      createdAt: now,
    },
    {
      id: "user-student-001",
      name: "Sarah Williams",
      email: "student@springfield.edu",
      passwordHash: defaultPasswordHash,
      role: "student",
      orgId: orgId,
      studentId: "STU-2026-001",
      status: "active",
      createdAt: now,
    }
  ];

  for (const u of demoUsers) {
    const existing = await db.select().from(users).where(eq(users.email, u.email)).limit(1);
    if (existing.length === 0) {
      await db.insert(users).values(u);
    }
  }

  // 3. Seed Demo Test (BIO101)
  const testId = "demo-bio-test-101";
  const existingTest = await db.select().from(tests).where(eq(tests.code, "BIO101")).limit(1);
  if (existingTest.length === 0) {
    await db.insert(tests).values({
      id: testId,
      code: "BIO101",
      title: "Cellular Biology & Metabolic Energy",
      subject: "Biological Sciences",
      description: "Assessment covering photosynthesis, cellular respiration, ATP synthesis, and organelle functions.",
      notesContent: "Cellular respiration occurs in the mitochondria where glucose is oxidized to generate ATP. Glycolysis takes place in the cytoplasm without oxygen (anaerobic), producing 2 net ATP. The Krebs cycle and Electron Transport Chain occur in the mitochondria, yielding up to 36-38 ATP in aerobic conditions. Photosynthesis occurs in chloroplasts, using light energy to convert carbon dioxide and water into glucose and oxygen.",
      durationMinutes: 7, // Auto: 7 questions = 7 mins
      distributionMode: "shuffled",
      questionsPerStudent: 5,
      passScorePercentage: 60,
      shuffleOptions: 1,
      showCorrectionsImmediately: 1,
      allowRetake: 1,
      teacherUserId: "user-teacher-001",
      orgId: orgId,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    const sampleQuestions = [
      {
        id: "q-bio-1",
        testId,
        questionText: "Where does glycolysis take place within an eukaryotic cell?",
        type: "mcq",
        optionsJson: JSON.stringify([
          "Mitochondrial Matrix",
          "Cytoplasm (Cytosol)",
          "Inner Mitochondrial Membrane",
          "Nucleus"
        ]),
        correctAnswerIndex: 1,
        explanation: "Glycolysis occurs in the cytoplasm (cytosol) and does not require oxygen. In contrast, the Krebs cycle occurs in the mitochondrial matrix, and oxidative phosphorylation occurs across the inner mitochondrial membrane.",
        marks: 1,
        difficulty: "easy",
        orderIndex: 0,
        createdAt: now,
      },
      {
        id: "q-bio-2",
        testId,
        questionText: "What is the net gain of ATP molecules produced per glucose molecule during glycolysis alone?",
        type: "mcq",
        optionsJson: JSON.stringify([
          "2 ATP",
          "4 ATP",
          "36 ATP",
          "38 ATP"
        ]),
        correctAnswerIndex: 0,
        explanation: "Glycolysis consumes 2 ATP molecules in its investment phase and produces 4 ATP in its payoff phase, resulting in a net yield of 2 ATP molecules per glucose molecule.",
        marks: 1,
        difficulty: "easy",
        orderIndex: 1,
        createdAt: now,
      },
      {
        id: "q-bio-3",
        testId,
        questionText: "Which molecule acts as the final electron acceptor in the aerobic electron transport chain?",
        type: "mcq",
        optionsJson: JSON.stringify([
          "Carbon Dioxide (CO2)",
          "Water (H2O)",
          "Molecular Oxygen (O2)",
          "NAD+"
        ]),
        correctAnswerIndex: 2,
        explanation: "Molecular oxygen (O2) is the final electron acceptor in aerobic cellular respiration. It combines with protons (H+) to form water (H2O).",
        marks: 1,
        difficulty: "medium",
        orderIndex: 2,
        createdAt: now,
      },
      {
        id: "q-bio-4",
        testId,
        questionText: "During photosynthesis, where do the light-dependent reactions specifically take place?",
        type: "mcq",
        optionsJson: JSON.stringify([
          "Stroma of the chloroplast",
          "Thylakoid membrane",
          "Outer chloroplast membrane",
          "Vacuole"
        ]),
        correctAnswerIndex: 1,
        explanation: "The light-dependent reactions occur in the thylakoid membranes where chlorophyll absorbs sunlight and drives ATP and NADPH synthesis. The Calvin cycle (light-independent) occurs in the stroma.",
        marks: 1,
        difficulty: "medium",
        orderIndex: 3,
        createdAt: now,
      },
      {
        id: "q-bio-5",
        testId,
        questionText: "What provides the immediate energy to drive ATP synthesis by ATP synthase during oxidative phosphorylation?",
        type: "mcq",
        optionsJson: JSON.stringify([
          "Direct hydrolysis of glucose",
          "Proton electrochemical gradient across the inner mitochondrial membrane (Proton Motive Force)",
          "Formation of peptide bonds",
          "Absorption of visible photons"
        ]),
        correctAnswerIndex: 1,
        explanation: "Protons pumped into the intermembrane space flow back into the matrix through ATP synthase down their electrochemical gradient (chemiosmosis), powering the phosphorylation of ADP to ATP.",
        marks: 1,
        difficulty: "hard",
        orderIndex: 4,
        createdAt: now,
      },
      {
        id: "q-bio-6",
        testId,
        questionText: "Which of the following processes generates lactic acid or ethanol when oxygen is unavailable?",
        type: "mcq",
        optionsJson: JSON.stringify([
          "Fermentation",
          "The Krebs Cycle",
          "Oxidative Phosphorylation",
          "Chemiosmosis"
        ]),
        correctAnswerIndex: 0,
        explanation: "Fermentation is the anaerobic pathway that regenerates NAD+ from NADH by converting pyruvate into lactic acid (in animal muscle cells) or ethanol and CO2 (in yeast).",
        marks: 1,
        difficulty: "easy",
        orderIndex: 5,
        createdAt: now,
      },
      {
        id: "q-bio-7",
        testId,
        questionText: "In the Calvin cycle, what enzyme catalyzes the fixation of atmospheric carbon dioxide to ribulose 1,5-bisphosphate (RuBP)?",
        type: "mcq",
        optionsJson: JSON.stringify([
          "DNA Polymerase",
          "RuBisCO",
          "Amylase",
          "ATP Synthase"
        ]),
        correctAnswerIndex: 1,
        explanation: "RuBisCO (Ribulose-1,5-bisphosphate carboxylase-oxygenase) is the primary enzyme responsible for carbon fixation during the dark reactions of photosynthesis.",
        marks: 1,
        difficulty: "medium",
        orderIndex: 6,
        createdAt: now,
      }
    ];

    for (const q of sampleQuestions) {
      await db.insert(questions).values(q);
    }
  }

  // 4. Seed a completed test submission for Student Sarah Williams for instant history display
  const existingSub = await db.select().from(submissions).where(eq(submissions.studentUserId, "user-student-001")).limit(1);
  if (existingSub.length === 0) {
    await db.insert(submissions).values({
      id: "demo-sub-sarah-001",
      testId: testId,
      studentUserId: "user-student-001",
      studentName: "Sarah Williams",
      studentId: "STU-2026-001",
      studentEmail: "student@springfield.edu",
      score: 4,
      maxScore: 5,
      percentage: 80,
      passed: 1,
      assignedQuestionsJson: JSON.stringify(["q-bio-1", "q-bio-2", "q-bio-3", "q-bio-4", "q-bio-5"]),
      answersJson: JSON.stringify({
        "q-bio-1": 1, // correct
        "q-bio-2": 0, // correct
        "q-bio-3": 2, // correct
        "q-bio-4": 1, // correct
        "q-bio-5": 0, // wrong choice (chose 0 instead of 1)
      }),
      timeSpentSeconds: 320,
      isAutoSubmitted: 0,
      startedAt: new Date(Date.now() - 3600000).toISOString(),
      submittedAt: new Date(Date.now() - 3280000).toISOString(),
    });
  }

  // 5. Seed a pending password reset request for instant admin approval demonstration
  const existingReq = await db.select().from(passwordResetRequests).where(eq(passwordResetRequests.email, "student@springfield.edu")).limit(1);
  if (existingReq.length === 0) {
    await db.insert(passwordResetRequests).values({
      id: "req-reset-demo-001",
      userId: "user-student-001",
      email: "student@springfield.edu",
      role: "student",
      reason: "Forgot password after summer break. Please approve reset.",
      status: "pending",
      resetToken: null,
      requestedAt: new Date(Date.now() - 1800000).toISOString(),
    });
  }
}
