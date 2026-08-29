import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const organizations = sqliteTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  planType: text("plan_type").notNull().default("free"), // "free" | "individual" | "school_pro" | "enterprise"
  seatLimit: integer("seat_limit").notNull().default(50),
  ownerEmail: text("owner_email").notNull(),
  status: text("status").notNull().default("active"), // "active" | "trial" | "past_due"
  createdAt: text("created_at").notNull(),
});

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("student"), // "admin" | "org_admin" | "teacher" | "student"
  orgId: text("org_id").references(() => organizations.id, { onDelete: "set null" }),
  studentId: text("student_id"), // Matriculation / Student ID number
  avatarUrl: text("avatar_url"),
  planType: text("plan_type").notNull().default("free"), // "free" | "individual" | "school_pro" | "enterprise"
  examGenerationsUsed: integer("exam_generations_used").notNull().default(0),
  scriptScansUsed: integer("script_scans_used").notNull().default(0),
  essayGradingsUsed: integer("essay_gradings_used").notNull().default(0),
  status: text("status").notNull().default("active"), // "active" | "suspended" | "pending"
  createdAt: text("created_at").notNull(),
});

export const passwordResetRequests = sqliteTable("password_reset_requests", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role").notNull(),
  reason: text("reason"),
  status: text("status").notNull().default("pending"), // "pending" | "approved" | "rejected" | "used"
  resetToken: text("reset_token"), // Authorized token generated upon admin approval
  requestedAt: text("requested_at").notNull(),
  reviewedAt: text("reviewed_at"),
  reviewedByAdminId: text("reviewed_by_admin_id"),
});

export const tests = sqliteTable("tests", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(), // e.g. "EXM892"
  title: text("title").notNull(),
  description: text("description"),
  subject: text("subject"),
  notesContent: text("notes_content"),
  durationMinutes: integer("duration_minutes").notNull().default(15), // time limit in minutes
  distributionMode: text("distribution_mode").notNull().default("general"), // "general" | "shuffled"
  questionsPerStudent: integer("questions_per_student").notNull().default(10), // questions given to each student in shuffled mode
  passScorePercentage: integer("pass_score_percentage").notNull().default(50),
  shuffleOptions: integer("shuffle_options").notNull().default(1), // 1 = true, 0 = false
  showCorrectionsImmediately: integer("show_corrections_immediately").notNull().default(1),
  allowRetake: integer("allow_retake").notNull().default(1), // 1 = students can retake, 0 = teacher disallows retakes
  teacherUserId: text("teacher_user_id").references(() => users.id, { onDelete: "set null" }),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "set null" }),
  status: text("status").notNull().default("active"), // "active" | "draft" | "archived"
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const questions = sqliteTable("questions", {
  id: text("id").primaryKey(),
  testId: text("test_id").notNull().references(() => tests.id, { onDelete: "cascade" }),
  questionText: text("question_text").notNull(),
  type: text("type").notNull().default("mcq"), // "mcq" | "essay" | "short_answer"
  optionsJson: text("options_json"), // JSON string array of options: ["A", "B", "C", "D"]
  correctAnswerIndex: integer("correct_answer_index"), // 0 to 3 for MCQ
  explanation: text("explanation"), // Why this answer is correct & educational breakdown
  modelAnswer: text("model_answer"), // For essay/theory questions
  rubricJson: text("rubric_json"), // JSON criteria for essay grading
  marks: integer("marks").notNull().default(1),
  difficulty: text("difficulty").default("medium"), // "easy" | "medium" | "hard"
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

export const submissions = sqliteTable("submissions", {
  id: text("id").primaryKey(),
  testId: text("test_id").notNull().references(() => tests.id, { onDelete: "cascade" }),
  studentUserId: text("student_user_id").references(() => users.id, { onDelete: "set null" }),
  studentName: text("student_name").notNull(),
  studentId: text("student_id"), // Matric / Student ID number
  studentEmail: text("student_email"),
  score: integer("score").notNull().default(0),
  maxScore: integer("max_score").notNull().default(0),
  percentage: integer("percentage").notNull().default(0),
  passed: integer("passed").notNull().default(0), // 1 = true, 0 = false
  assignedQuestionsJson: text("assigned_questions_json").notNull(), // Array of question IDs assigned to this student
  answersJson: text("answers_json").notNull(), // Object mapping questionId -> selectedOptionIndex or essayText
  timeSpentSeconds: integer("time_spent_seconds").notNull().default(0),
  isAutoSubmitted: integer("is_auto_submitted").notNull().default(0),
  startedAt: text("started_at").notNull(),
  submittedAt: text("submitted_at").notNull(),
});

export const essayGradings = sqliteTable("essay_gradings", {
  id: text("id").primaryKey(),
  teacherUserId: text("teacher_user_id").references(() => users.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  studentName: text("student_name"),
  studentUserId: text("student_user_id").references(() => users.id, { onDelete: "set null" }),
  essayPrompt: text("essay_prompt").notNull(),
  rubricPrompt: text("rubric_prompt"),
  studentEssay: text("student_essay").notNull(),
  overallScore: integer("overall_score").notNull(),
  maxScore: integer("max_score").notNull().default(100),
  criteriaScoresJson: text("criteria_scores_json").notNull(), // JSON: [{ criterion, score, maxScore, comment }]
  strengthsJson: text("strengths_json"), // JSON: string[]
  weaknessesJson: text("weaknesses_json"), // JSON: string[]
  detailedFeedback: text("detailed_feedback").notNull(),
  correctedExcerptsJson: text("corrected_excerpts_json"), // JSON: [{ original, suggestion, reason }]
  createdAt: text("created_at").notNull(),
});

export const systemSettings = sqliteTable("system_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(), // "true" | "false" | string
  description: text("description"),
  updatedAt: text("updated_at").notNull(),
});

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type PasswordResetRequest = typeof passwordResetRequests.$inferSelect;
export type NewPasswordResetRequest = typeof passwordResetRequests.$inferInsert;
export type Test = typeof tests.$inferSelect;
export type NewTest = typeof tests.$inferInsert;
export type Question = typeof questions.$inferSelect;
export type NewQuestion = typeof questions.$inferInsert;
export type Submission = typeof submissions.$inferSelect;
export type NewSubmission = typeof submissions.$inferInsert;
export type EssayGrading = typeof essayGradings.$inferSelect;
export type NewEssayGrading = typeof essayGradings.$inferInsert;
export type SystemSetting = typeof systemSettings.$inferSelect;
export type NewSystemSetting = typeof systemSettings.$inferInsert;
