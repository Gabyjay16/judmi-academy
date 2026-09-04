import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const organizations = sqliteTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  planType: text("plan_type").notNull().default("free"), // "free" | "individual" | "school_pro" | "enterprise"
  seatLimit: integer("seat_limit").notNull().default(50),
  ownerEmail: text("owner_email").notNull(),
  status: text("status").notNull().default("active"), // "active" | "trial" | "past_due"
  // Branded school page / private access link
  accessKey: text("access_key"), // Secret required to open the branded /school/[slug] page
  brandName: text("brand_name"), // Display name shown instead of "Judmi Academy"
  logoData: text("logo_data"), // base64 PNG/JPEG/WebP logo, or URL
  brandColor: text("brand_color"), // Theme color hex e.g. #4f46e5
  // Per-service access control (set by super admin). NULL = full access (all services allowed).
  allowedServices: text("allowed_services"), // JSON: string[] e.g. ["generateQuestions","scanScripts"]
  createdAt: text("created_at").notNull(),
});

export const departments = sqliteTable("departments", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  code: text("code"),
  headId: text("head_id"),
  description: text("description"),
  createdAt: text("created_at").notNull(),
});

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  username: text("username"), // Optional login username (e.g. super admin "brandonjudmi")
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("student"), // "admin" | "org_admin" | "teacher" | "student"
  orgId: text("org_id").references(() => organizations.id, { onDelete: "set null" }),
  departmentId: text("department_id").references(() => departments.id, { onDelete: "set null" }),
  year: text("year"), // Student academic year / level (e.g. "Year 1", "Level 300")
  studentId: text("student_id"), // Matriculation / Student ID number
  avatarUrl: text("avatar_url"),
  planType: text("plan_type").notNull().default("free"), // "free" | "individual" | "school_pro" | "enterprise"
  examGenerationsUsed: integer("exam_generations_used").notNull().default(0),
  scriptScansUsed: integer("script_scans_used").notNull().default(0),
  essayGradingsUsed: integer("essay_gradings_used").notNull().default(0),
  canManageComplaints: integer("can_manage_complaints").notNull().default(0), // 1 = delegated review access
  // Manual-payment-gated feature access (granted by admin after screenshot verification)
  plagiarismAccess: integer("plagiarism_access").notNull().default(0), // 1 = plagiarism feature unlocked
  // Per-service access control (set by super admin). NULL = full access (all services allowed).
  allowedServices: text("allowed_services"), // JSON: string[]
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

export const complaintForms = sqliteTable("complaint_forms", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().unique().references(() => organizations.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("inactive"), // "active" | "inactive"
  categoriesJson: text("categories_json").notNull(), // JSON: string[]
  allowDocumentUpload: integer("allow_document_upload").notNull().default(1), // 1 = true, 0 = false
  levelsJson: text("levels_json").notNull(), // JSON: string[]
  instructions: text("instructions"),
  updatedAt: text("updated_at").notNull(),
});

export const complaints = sqliteTable("complaints", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  studentUserId: text("student_user_id").references(() => users.id, { onDelete: "set null" }),
  studentName: text("student_name").notNull(),
  studentMatricule: text("student_matricule").notNull(),
  studentPhone: text("student_phone"),
  departmentId: text("department_id").references(() => departments.id, { onDelete: "set null" }),
  departmentName: text("department_name"),
  studentLevel: text("student_level").notNull(), // e.g. "Level 300 / Year 3"
  courseCode: text("course_code"), // e.g. "CSC 401"
  nature: text("nature").notNull(), // Category e.g. "Missing CA", "Grade Discrepancy"
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  documentUrl: text("document_url"), // URL/base64 attachment
  documentName: text("document_name"),
  status: text("status").notNull().default("pending"), // "pending" | "under_review" | "resolved" | "rejected"
  assignedReviewerUserId: text("assigned_reviewer_user_id").references(() => users.id, { onDelete: "set null" }),
  assignedReviewerName: text("assigned_reviewer_name"),
  resolutionNote: text("resolution_note"),
  resolvedAt: text("resolved_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const extractDocuments = sqliteTable("extract_documents", {
  id: text("id").primaryKey(),
  ownerUserId: text("owner_user_id").references(() => users.id, { onDelete: "set null" }),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  fieldDefinitionsJson: text("field_definitions_json").notNull(), // JSON: [{ name, type }]
  extractedRowsJson: text("extracted_rows_json").notNull(), // JSON: Array<Record<fieldName, value>>
  pageCount: integer("page_count").notNull().default(1),
  sourceImagesJson: text("source_images_json"), // JSON: string[] (base64 snapshots)
  exportFormat: text("export_format").notNull().default("xlsx"), // "xlsx" | "docx" | "csv" | "pdf"
  status: text("status").notNull().default("ready"), // "processing" | "ready" | "error"
  error: text("error"),
  // Advanced extraction workspaces: this document belongs to an advanced set
  // and holds the records whose routing-field value equals routeValue.
  advancedSetId: text("advanced_set_id").references(() => extractAdvancedSets.id, { onDelete: "set null" }),
  routeValue: text("route_value"), // the routing value this document collects (lowercase, trimmed)
  routeLabel: text("route_label"), // display label for the routing value (e.g. "Banking")
  rowHistoryJson: text("row_history_json"), // JSON: Array<{ rows, at, label? }> of prior row snapshots for undo/revert
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// Reusable field settings for Advanced extraction workspaces. Saved until the
// user deletes the template, and used to initialise new advanced sets.
export const extractTemplates = sqliteTable("extract_templates", {
  id: text("id").primaryKey(),
  ownerUserId: text("owner_user_id").references(() => users.id, { onDelete: "set null" }),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  fieldDefinitionsJson: text("field_definitions_json").notNull(), // JSON: [{ name, type }]
  routingField: text("routing_field"), // field whose value decides which document a record is filed into
  routeOptionsJson: text("route_options_json"), // JSON: string[] of expected routing values
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// A group of Excel documents that share one field setting and one routing
// field. Each routing value gets its own extract_documents row in the set.
// Sets can be shared (by username/email) with other teachers.
export const extractAdvancedSets = sqliteTable("extract_advanced_sets", {
  id: text("id").primaryKey(),
  ownerUserId: text("owner_user_id").references(() => users.id, { onDelete: "set null" }),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  templateId: text("template_id"),
  fieldDefinitionsJson: text("field_definitions_json").notNull(), // JSON: [{ name, type }]
  routingField: text("routing_field"), // field whose value decides the target document
  routingMode: text("routing_mode").notNull().default("value"), // "value" (routing field holds the route label) | "marker" (route by which field equals routingMarker)
  routingMarker: text("routing_marker").notNull().default("1"), // marker value used in "marker" routing mode (e.g. "1" = first choice)
  routeOptionsJson: text("route_options_json").notNull(), // JSON: string[] of routing values
  sharedWithJson: text("shared_with_json").notNull(), // JSON: [{ username, email, name, sharedAt }]
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const systemSettings = sqliteTable("system_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(), // "true" | "false" | string
  description: text("description"),
  updatedAt: text("updated_at").notNull(),
});

export const meetings = sqliteTable("meetings", {
  id: text("id").primaryKey(),
  ownerUserId: text("owner_user_id").references(() => users.id, { onDelete: "set null" }),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  meetingDate: text("meeting_date"),
  audioName: text("audio_name"),
  audioUrl: text("audio_url"), // Vercel Blob public URL for the meeting recording
  audioChunksJson: text("audio_chunks_json"), // JSON: { url, name, durationSeconds }[] for chunked recordings
  audioDurationSeconds: integer("audio_duration_seconds"),
  transcriptJson: text("transcript_json"), // JSON: TranscriptSegment[]
  speakersJson: text("speakers_json"), // JSON: Speaker[] with optional user-renamed labels + clip start time
  summaryJson: text("summary_json"), // JSON: MeetingSummary
  status: text("status").notNull().default("recording"), // "recording" | "processing" | "ready" | "failed"
  error: text("error"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// Student-run authenticity/plagiarism checks verified by teachers via a code.
export const plagiarismChecks = sqliteTable("plagiarism_checks", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  ownerUserId: text("owner_user_id").references(() => users.id, { onDelete: "set null" }),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  textHash: text("text_hash"), // sha256 of the checked text (integrity check)
  textExcerpt: text("text_excerpt").notNull(), // preview shown to the teacher
  wordCount: integer("word_count").notNull().default(0),
  similarityPercent: integer("similarity_percent").notNull().default(0),
  aiPercent: integer("ai_percent").notNull().default(0),
  combinedScore: integer("combined_score").notNull().default(0),
  verdict: text("verdict").notNull().default("approved"), // "approved" | "flagged"
  analysisJson: text("analysis_json"), // JSON: { summary, flags: [{ sample, reason }] }
  createdAt: text("created_at").notNull(),
});

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type Department = typeof departments.$inferSelect;
export type NewDepartment = typeof departments.$inferInsert;
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
export type ComplaintForm = typeof complaintForms.$inferSelect;
export type NewComplaintForm = typeof complaintForms.$inferInsert;
export type Complaint = typeof complaints.$inferSelect;
export type NewComplaint = typeof complaints.$inferInsert;
export type PlagiarismCheck = typeof plagiarismChecks.$inferSelect;
export type NewPlagiarismCheck = typeof plagiarismChecks.$inferInsert;
export type SystemSetting = typeof systemSettings.$inferSelect;
export type NewSystemSetting = typeof systemSettings.$inferInsert;
export type ExtractDocument = typeof extractDocuments.$inferSelect;
export type NewExtractDocument = typeof extractDocuments.$inferInsert;
// Teacher-built "inverse marking" exercises: students mark the TEACHER's own
// script against the per-question marks, and are graded on how closely their
// marks match the teacher's control marks.
export const inverseMarkings = sqliteTable("inverse_markings", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  ownerUserId: text("owner_user_id").references(() => users.id, { onDelete: "set null" }),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  instruction: text("instruction"), // Note shown to students before they mark
  questionsJson: text("questions_json").notNull(), // JSON: [{ id, prompt, maxMarks, markScheme, answer, controlMark, isTrap }]
  tolerance: integer("tolerance").notNull().default(1), // agreement band (marks)
  passThreshold: integer("pass_threshold").notNull().default(80), // accuracy % required to pass
  durationMinutes: integer("duration_minutes").notNull().default(0), // 0 = no time limit
  showResultsToStudents: integer("show_results_to_students").notNull().default(1), // reveal comparison to students after submit
  status: text("status").notNull().default("active"), // "active" | "ended"
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const inverseMarkingSubmissions = sqliteTable("inverse_marking_submissions", {
  id: text("id").primaryKey(),
  exerciseId: text("exercise_id").notNull().references(() => inverseMarkings.id, { onDelete: "cascade" }),
  studentName: text("student_name").notNull(),
  studentEmail: text("student_email"),
  marksJson: text("marks_json").notNull(), // JSON: [{ qId, marks, justification }]
  totalTeacherMarks: integer("total_teacher_marks").notNull().default(0), // marks the student awarded
  totalControlMarks: integer("total_control_marks").notNull().default(0), // teacher's own marks
  totalMaxMarks: integer("total_max_marks").notNull().default(0),
  deviationTotal: integer("deviation_total").notNull().default(0),
  accuracyScore: integer("accuracy_score").notNull().default(0), // 0-100
  passed: integer("passed").notNull().default(0), // 1 = true
  leniency: integer("leniency").notNull().default(0), // signed avg deviation (+) over-marking
  submittedAt: text("submitted_at").notNull(),
});

// Payment transactions with Fapshi (MTN Mobile Money / Orange Money). A user
// only receives their paid plan after a webhook/status confirms SUCCESSFUL.
export const payments = sqliteTable("payments", {
  id: text("id").primaryKey(), // internal payment id, also used as Fapshi externalId
  transId: text("trans_id").unique(), // Fapshi transaction id
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  email: text("email").notNull(),
  plan: text("plan").notNull(), // "individual" | "school_pro"
  cycle: text("cycle").notNull(), // "monthly" | "yearly"
  amount: integer("amount").notNull(), // XAF, must match PRICING
  status: text("status").notNull().default("CREATED"), // CREATED | PENDING | SUCCESSFUL | FAILED | EXPIRED
  metaJson: text("meta_json"), // JSON: { orgName, role, name }
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// Manual payment requests submitted by users who paid via Mobile Money and
// uploaded a payment screenshot. Access is granted only when an admin verifies
// the screenshot and approves the request.
export const manualPayments = sqliteTable("manual_payments", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  email: text("email").notNull(),
  name: text("name").notNull(),
  feature: text("feature").notNull(), // e.g. "plagiarism"
  amount: integer("amount").notNull(), // XAF paid
  phone: text("phone"), // Mobile Money number used, if provided
  operator: text("operator").notNull(), // e.g. "MTN Mobile Money"
  screenshotUrl: text("screenshot_url").notNull(), // data URL (base64) of the payment screenshot
  screenshotName: text("screenshot_name"),
  note: text("note"),
  // Extra details about the purchase: for plan features (individual/school_pro)
  // this holds { cycle, orgName }; for features it may hold other metadata.
  metaJson: text("meta_json"),
  status: text("status").notNull().default("pending"), // "pending" | "approved" | "rejected"
  createdAt: text("created_at").notNull(),
  reviewedAt: text("reviewed_at"),
  reviewedByAdminId: text("reviewed_by_admin_id"),
});

// Student chat forums. Each channel is scoped to a school (org_id):
// - type "general": one per org, all students of the school can chat.
// - type "department": one per (org, department), all students of that
//   department can chat regardless of year/level.
export const chatChannels = sqliteTable("chat_channels", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("general"), // "general" | "department"
  departmentId: text("department_id").references(() => departments.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: text("created_at").notNull(),
});

export const chatMessages = sqliteTable("chat_messages", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  channelId: text("channel_id").notNull().references(() => chatChannels.id, { onDelete: "cascade" }),
  authorUserId: text("author_user_id").references(() => users.id, { onDelete: "set null" }),
  authorName: text("author_name").notNull(),
  authorAvatarUrl: text("author_avatar_url"),
  type: text("type").notNull().default("text"), // "text" | "image" | "voice"
  content: text("content"), // text body (or caption for image)
  mediaUrl: text("media_url"), // image data URL / voice blob URL
  mediaDurationSeconds: integer("media_duration_seconds"), // voice note length
  replyToId: text("reply_to_id"), // message this replies to
  replyPreview: text("reply_preview"), // preview of the replied message
  replyAuthorName: text("reply_author_name"), // author of the replied message
  createdAt: text("created_at").notNull(),
});

// Notification created whenever a user replies to / tags someone in the forum,
// so the recipient can see it in the notification space and jump to the chat.
export const chatNotifications = sqliteTable("chat_notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  messageId: text("message_id").references(() => chatMessages.id, { onDelete: "set null" }),
  senderUserId: text("sender_user_id").references(() => users.id, { onDelete: "set null" }),
  senderName: text("sender_name").notNull(),
  channelId: text("channel_id").references(() => chatChannels.id, { onDelete: "set null" }),
  channelLabel: text("channel_label").notNull(),
  replyContent: text("reply_content"),
  replyType: text("reply_type").notNull().default("text"),
  isRead: integer("is_read").notNull().default(0), // 0 = unread, 1 = read
  createdAt: text("created_at").notNull(),
});

// ── Timetable / course management ─────────────────────────────────────────────

export const courses = sqliteTable("courses", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  departmentId: text("department_id").references(() => departments.id, { onDelete: "set null" }),
  name: text("name").notNull(),                    // e.g. "Computer Science 101"
  code: text("code"),                               // e.g. "CSC 101"
  teacherId: text("teacher_id").references(() => users.id, { onDelete: "set null" }),
  year: text("year"),                               // e.g. "Year 1" — filters timetable per student level
  createdAt: text("created_at").notNull(),
});

export const timetableEntries = sqliteTable("timetable_entries", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  departmentId: text("department_id").references(() => departments.id, { onDelete: "set null" }),
  courseId: text("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  day: integer("day").notNull(),                    // 0=Mon 1=Tue 2=Wed 3=Thu 4=Fri 5=Sat 6=Sun
  periodNo: integer("period_no").notNull(),         // 1, 2, 3 … ordering within a day
  startTime: text("start_time").notNull(),          // "08:00"
  endTime: text("end_time").notNull(),              // "09:00"
  venue: text("venue"),                             // "Room A-204"
  year: text("year"),                               // e.g. "Year 1" — matches student.year for filtering
  teacherId: text("teacher_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: text("created_at").notNull(),
});

// ── Attendance ─────────────────────────────────────────────────────────────────

export const attendanceRecords = sqliteTable("attendance_records", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  courseId: text("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  studentId: text("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: text("date").notNull(),                    // "YYYY-MM-DD"
  status: text("status").notNull().default("present"), // "present" | "absent" | "late" | "excused"
  markedBy: text("marked_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: text("created_at").notNull(),
});

// ── Announcements ──────────────────────────────────────────────────────────────

export const announcements = sqliteTable("announcements", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body"),
  pinned: integer("pinned").notNull().default(0), // 1 = show on top
  audience: text("audience").notNull().default("all"), // "all" | "students" | "teachers"
  authorId: text("author_id").references(() => users.id, { onDelete: "set null" }),
  authorName: text("author_name"),
  eventDate: text("event_date"), // optional date for calendar/event-style announcements
  createdAt: text("created_at").notNull(),
});

// ── Assignments ────────────────────────────────────────────────────────────────

export const assignments = sqliteTable("assignments", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  courseId: text("course_id").references(() => courses.id, { onDelete: "set null" }),
  courseName: text("course_name"),
  dueDate: text("due_date"),
  maxScore: integer("max_score").notNull().default(100),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdByName: text("created_by_name"),
  pinned: integer("pinned").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

export const assignmentSubmissions = sqliteTable("assignment_submissions", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  assignmentId: text("assignment_id").notNull().references(() => assignments.id, { onDelete: "cascade" }),
  studentId: text("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  studentName: text("student_name"),
  content: text("content"),
  fileName: text("file_name"),
  score: integer("score"),
  feedback: text("feedback"),
  submittedAt: text("submitted_at").notNull(),
  gradedAt: text("graded_at"),
});

// ── Results / Transcripts ──────────────────────────────────────────────────────

export const results = sqliteTable("results", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  studentId: text("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  studentName: text("student_name"),
  courseId: text("course_id").references(() => courses.id, { onDelete: "set null" }),
  courseName: text("course_name"),
  term: text("term").notNull(),                 // e.g. "Term 1", "2025"
  examScore: integer("exam_score"),             // out of 100
  assignmentScore: integer("assignment_score"), // aggregate out of 100
  total: integer("total"),                      // final combined score out of 100
  grade: text("grade"),                          // A, B, C, D, F
  remarks: text("remarks"),
  published: integer("published").notNull().default(0),
  publishedAt: text("published_at"),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: text("created_at").notNull(),
});

// ── Exams (scheduled exams tied to timetable) ─────────────────────────────────

export const exams = sqliteTable("exams", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  courseId: text("course_id").references(() => courses.id, { onDelete: "set null" }),
  courseName: text("course_name"),
  title: text("title").notNull(),
  description: text("description"),
  examDate: text("exam_date").notNull(),           // "YYYY-MM-DD"
  startTime: text("start_time").notNull(),          // "09:00"
  endTime: text("end_time").notNull(),              // "11:00"
  venue: text("venue"),
  duration: integer("duration"),                    // minutes
  totalMarks: integer("total_marks").notNull().default(100),
  instructions: text("instructions"),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdByName: text("created_by_name"),
  createdAt: text("created_at").notNull(),
});

// ── Notifications (in-app) ────────────────────────────────────────────────────

export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("general"),  // "announcement" | "grade" | "assignment" | "general"
  title: text("title").notNull(),
  body: text("body"),
  link: text("link"),                                // e.g. "/student/results"
  isRead: integer("is_read").notNull().default(0),  // 0 = unread
  createdAt: text("created_at").notNull(),
});

// ── Programs ──────────────────────────────────────────────────────────────────

export const programs = sqliteTable("programs", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  departmentId: text("department_id").references(() => departments.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  code: text("code"),
  description: text("description"),
  duration: text("duration"),                         // e.g. "4 years"
  headId: text("head_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: text("created_at").notNull(),
});

// ── Fees & Billing ─────────────────────────────────────────────────────────────

export const feeStructures = sqliteTable("fee_structures", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),              // e.g. "Tuition - Year 1"
  amount: integer("amount").notNull(),        // in FCFA
  departmentId: text("department_id").references(() => departments.id, { onDelete: "set null" }),
  programId: text("program_id").references(() => programs.id, { onDelete: "set null" }),
  year: text("year"),                          // e.g. "Year 1"
  period: text("period"),                      // e.g. "Term 1", "2025"
  description: text("description"),
  mandatory: integer("mandatory").notNull().default(1),
  createdAt: text("created_at").notNull(),
});

export const invoices = sqliteTable("invoices", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  studentId: text("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  studentName: text("student_name"),
  feeStructureId: text("fee_structure_id").references(() => feeStructures.id, { onDelete: "set null" }),
  feeName: text("fee_name"),
  description: text("description"),
  amount: integer("amount").notNull(),
  paidAmount: integer("paid_amount").notNull().default(0),
  status: text("status").notNull().default("unpaid"), // "unpaid" | "partial" | "paid" | "waived"
  dueDate: text("due_date"),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: text("created_at").notNull(),
});

export const feePayments = sqliteTable("fee_payments", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  invoiceId: text("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  studentId: text("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  method: text("method").notNull().default("cash"), // "cash" | "mobile" | "bank" | "card"
  reference: text("reference"),
  note: text("note"),
  recordedBy: text("recorded_by").references(() => users.id, { onDelete: "set null" }),
  paidAt: text("paid_at").notNull(),
  createdAt: text("created_at").notNull(),
});

// ── Enrollment management ──────────────────────────────────────────────────────

export const enrollments = sqliteTable("enrollments", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  studentId: text("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  courseId: text("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  courseName: text("course_name"),
  year: text("year"),
  enrolledAt: text("enrolled_at").notNull(),
});

// ── Conduct & Discipline ───────────────────────────────────────────────────────

export const disciplineRecords = sqliteTable("discipline_records", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  studentId: text("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  studentName: text("student_name"),
  type: text("type").notNull().default("incident"), // "incident" | "reward" | "contact"
  severity: text("severity").default("minor"),       // "minor" | "major" | "warning" | (rewards: "acknowledgment")
  title: text("title").notNull(),
  notes: text("notes"),
  recordedBy: text("recorded_by").references(() => users.id, { onDelete: "set null" }),
  recordedByName: text("recorded_by_name"),
  createdAt: text("created_at").notNull(),
});

// ── Library ────────────────────────────────────────────────────────────────────

export const libraryBooks = sqliteTable("library_books", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  author: text("author"),
  isbn: text("isbn"),
  category: text("category"),
  location: text("location"),
  totalCopies: integer("total_copies").notNull().default(1),
  availableCopies: integer("available_copies").notNull().default(1),
  createdAt: text("created_at").notNull(),
});

export const libraryLoans = sqliteTable("library_loans", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  bookId: text("book_id").notNull().references(() => libraryBooks.id, { onDelete: "cascade" }),
  studentId: text("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  studentName: text("student_name"),
  dueDate: text("due_date").notNull(),
  returnedAt: text("returned_at"),
  status: text("status").notNull().default("borrowed"), // "borrowed" | "returned" | "overdue"
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: text("created_at").notNull(),
});

// ── Academic Calendar & Terms ──────────────────────────────────────────────────

export const academicEvents = sqliteTable("academic_events", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  date: text("date").notNull(),               // "YYYY-MM-DD"
  startTime: text("start_time"),
  endTime: text("end_time"),
  type: text("type").notNull().default("event"), // "event" | "holiday" | "deadline" | "exam" | "term_start" | "term_end"
  venue: text("venue"),
  audience: text("audience").notNull().default("all"), // "all" | "students" | "teachers"
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdByName: text("created_by_name"),
  createdAt: text("created_at").notNull(),
});

export const academicTerms = sqliteTable("academic_terms", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),               // e.g. "Term 1 · 2025-2026"
  startDate: text("start_date"),
  endDate: text("end_date"),
  isActive: integer("is_active").notNull().default(0), // 1 = current active term
  createdAt: text("created_at").notNull(),
});

// ── Parent / Guardian links ────────────────────────────────────────────────────

export const parentLinks = sqliteTable("parent_links", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  parentId: text("parent_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  parentName: text("parent_name"),
  studentId: text("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  studentName: text("student_name"),
  relationship: text("relationship").default("guardian"), // "guardian" | "father" | "mother" | "other"
  createdAt: text("created_at").notNull(),
});

// ── Internal Messaging ─────────────────────────────────────────────────────────

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  senderId: text("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  senderName: text("sender_name"),
  recipientId: text("recipient_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  subject: text("subject"),
  body: text("body").notNull(),
  isRead: integer("is_read").notNull().default(0),
  readAt: text("read_at"),
  createdAt: text("created_at").notNull(),
});

// ── Clubs & Societies ──────────────────────────────────────────────────────────

export const clubs = sqliteTable("clubs", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").default("other"), // "academic" | "sports" | "arts" | "tech" | "culture" | "other"
  advisorId: text("advisor_id").references(() => users.id, { onDelete: "set null" }),
  advisorName: text("advisor_name"),
  createdAt: text("created_at").notNull(),
});

export const clubMembers = sqliteTable("club_members", {
  id: text("id").primaryKey(),
  clubId: text("club_id").notNull().references(() => clubs.id, { onDelete: "cascade" }),
  memberId: text("member_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  memberName: text("member_name"),
  role: text("role").notNull().default("member"), // "member" | "lead"
  createdAt: text("created_at").notNull(),
});

export const clubAnnouncements = sqliteTable("club_announcements", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  clubId: text("club_id").notNull().references(() => clubs.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body"),
  postedById: text("posted_by_id").references(() => users.id, { onDelete: "set null" }),
  postedByName: text("posted_by_name"),
  createdAt: text("created_at").notNull(),
});

// ── Study Resources / Learning Materials ───────────────────────────────────────

export const studyResources = sqliteTable("study_resources", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  courseId: text("course_id").references(() => courses.id, { onDelete: "set null" }),
  courseName: text("course_name"),
  departmentId: text("department_id"),
  title: text("title").notNull(),
  description: text("description"),
  url: text("url"),
  fileType: text("file_type").default("link"), // "link" | "document" | "video" | "slides"
  uploadedById: text("uploaded_by_id").references(() => users.id, { onDelete: "set null" }),
  uploadedByName: text("uploaded_by_name"),
  createdAt: text("created_at").notNull(),
});

// ── Types ──────────────────────────────────────────────────────────────────────

export type Exam = typeof exams.$inferSelect;
export type NewExam = typeof exams.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type Program = typeof programs.$inferSelect;
export type NewProgram = typeof programs.$inferInsert;
export type Result = typeof results.$inferSelect;
export type NewResult = typeof results.$inferInsert;
export type Assignment = typeof assignments.$inferSelect;
export type NewAssignment = typeof assignments.$inferInsert;
export type AssignmentSubmission = typeof assignmentSubmissions.$inferSelect;
export type NewAssignmentSubmission = typeof assignmentSubmissions.$inferInsert;
export type Announcement = typeof announcements.$inferSelect;
export type NewAnnouncement = typeof announcements.$inferInsert;
export type AttendanceRecord = typeof attendanceRecords.$inferSelect;
export type NewAttendanceRecord = typeof attendanceRecords.$inferInsert;
export type Course = typeof courses.$inferSelect;
export type NewCourse = typeof courses.$inferInsert;
export type TimetableEntry = typeof timetableEntries.$inferSelect;
export type NewTimetableEntry = typeof timetableEntries.$inferInsert;
export type ChatChannel = typeof chatChannels.$inferSelect;
export type NewChatChannel = typeof chatChannels.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
export type ChatNotification = typeof chatNotifications.$inferSelect;
export type NewChatNotification = typeof chatNotifications.$inferInsert;
export type Meeting = typeof meetings.$inferSelect;
export type NewMeeting = typeof meetings.$inferInsert;
export type InverseMarking = typeof inverseMarkings.$inferSelect;
export type NewInverseMarking = typeof inverseMarkings.$inferInsert;
export type InverseMarkingSubmission = typeof inverseMarkingSubmissions.$inferSelect;
export type NewInverseMarkingSubmission = typeof inverseMarkingSubmissions.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type ManualPayment = typeof manualPayments.$inferSelect;
export type NewManualPayment = typeof manualPayments.$inferInsert;
export type ExtractTemplate = typeof extractTemplates.$inferSelect;
export type NewExtractTemplate = typeof extractTemplates.$inferInsert;
export type ExtractAdvancedSet = typeof extractAdvancedSets.$inferSelect;
export type NewExtractAdvancedSet = typeof extractAdvancedSets.$inferInsert;
export type FeeStructure = typeof feeStructures.$inferSelect;
export type NewFeeStructure = typeof feeStructures.$inferInsert;
export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
export type FeePayment = typeof feePayments.$inferSelect;
export type NewFeePayment = typeof feePayments.$inferInsert;
export type Enrollment = typeof enrollments.$inferSelect;
export type NewEnrollment = typeof enrollments.$inferInsert;
export type DisciplineRecord = typeof disciplineRecords.$inferSelect;
export type NewDisciplineRecord = typeof disciplineRecords.$inferInsert;
export type LibraryBook = typeof libraryBooks.$inferSelect;
export type NewLibraryBook = typeof libraryBooks.$inferInsert;
export type LibraryLoan = typeof libraryLoans.$inferSelect;
export type NewLibraryLoan = typeof libraryLoans.$inferInsert;
export type AcademicEvent = typeof academicEvents.$inferSelect;
export type NewAcademicEvent = typeof academicEvents.$inferInsert;
export type AcademicTerm = typeof academicTerms.$inferSelect;
export type NewAcademicTerm = typeof academicTerms.$inferInsert;
export type ParentLink = typeof parentLinks.$inferSelect;
export type NewParentLink = typeof parentLinks.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type Club = typeof clubs.$inferSelect;
export type NewClub = typeof clubs.$inferInsert;
export type ClubMember = typeof clubMembers.$inferSelect;
export type NewClubMember = typeof clubMembers.$inferInsert;
export type ClubAnnouncement = typeof clubAnnouncements.$inferSelect;
export type NewClubAnnouncement = typeof clubAnnouncements.$inferInsert;
export type StudyResource = typeof studyResources.$inferSelect;
export type NewStudyResource = typeof studyResources.$inferInsert;

