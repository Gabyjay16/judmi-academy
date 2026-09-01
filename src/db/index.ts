import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const DEFAULT_TURSO_URL = "libsql://judmi-academy-gabsabrandon.aws-eu-west-1.turso.io";
const DEFAULT_TURSO_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODc5ODAyODUsImlkIjoiMDFhMDRiZWQtYTUwMS03NGU1LWJiYzYtZmUzYjRiMWFiYzczIiwia2lkIjoiM1Z2N2ZFYTVTZU03dVFtSWJHYnlVYVo3Z09xUVdvTzFBZE8wSFFHa0ZDSSIsInJpZCI6ImRjMTA4MmM4LTlkMzktNDM5NS05ZDVlLWY0MjBkZTU3NGQxMyJ9.9i-HIUGPr7XUtXFtyXYt8pusfwaSt-NVAlkK09ojQyRrYP6euG9hGBBifK8YzVdhbhat7U0eWgO6mIhQAzzCAQ";

const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || DEFAULT_TURSO_URL;
const authToken = process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN || DEFAULT_TURSO_TOKEN;

export const client = createClient({
  url,
  authToken,
});

export const db = drizzle(client, { schema });

// Auto-bootstrap tables for both local SQLite and Turso edge databases
let isInitialized = false;

export async function initDatabase() {
  if (isInitialized) return;
  try {
    // 1. Organizations table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS organizations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        plan_type TEXT NOT NULL DEFAULT 'free',
        seat_limit INTEGER NOT NULL DEFAULT 50,
        owner_email TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL
      );
    `);

    // Safe column additions for organizations (branded school page / private access link)
    try { await client.execute(`ALTER TABLE organizations ADD COLUMN access_key TEXT;`); } catch {}
    try { await client.execute(`ALTER TABLE organizations ADD COLUMN brand_name TEXT;`); } catch {}
    try { await client.execute(`ALTER TABLE organizations ADD COLUMN logo_data TEXT;`); } catch {}
    try { await client.execute(`ALTER TABLE organizations ADD COLUMN brand_color TEXT;`); } catch {}

    // 2. Users table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'student',
        org_id TEXT REFERENCES organizations(id) ON DELETE SET NULL,
        student_id TEXT,
        avatar_url TEXT,
        plan_type TEXT NOT NULL DEFAULT 'free',
        exam_generations_used INTEGER NOT NULL DEFAULT 0,
        script_scans_used INTEGER NOT NULL DEFAULT 0,
        essay_gradings_used INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL
      );
    `);

    // Safe column additions for users
    try { await client.execute(`ALTER TABLE users ADD COLUMN plan_type TEXT DEFAULT 'free';`); } catch {}
    try { await client.execute(`ALTER TABLE users ADD COLUMN exam_generations_used INTEGER DEFAULT 0;`); } catch {}
    try { await client.execute(`ALTER TABLE users ADD COLUMN script_scans_used INTEGER DEFAULT 0;`); } catch {}
    try { await client.execute(`ALTER TABLE users ADD COLUMN essay_gradings_used INTEGER DEFAULT 0;`); } catch {}

    // 3. Password Reset Requests table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS password_reset_requests (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        role TEXT NOT NULL,
        reason TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        reset_token TEXT,
        requested_at TEXT NOT NULL,
        reviewed_at TEXT,
        reviewed_by_admin_id TEXT
      );
    `);

    // 4. Tests table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS tests (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        description TEXT,
        subject TEXT,
        notes_content TEXT,
        duration_minutes INTEGER NOT NULL DEFAULT 15,
        distribution_mode TEXT NOT NULL DEFAULT 'general',
        questions_per_student INTEGER NOT NULL DEFAULT 10,
        pass_score_percentage INTEGER NOT NULL DEFAULT 50,
        shuffle_options INTEGER NOT NULL DEFAULT 1,
        show_corrections_immediately INTEGER NOT NULL DEFAULT 1,
        allow_retake INTEGER NOT NULL DEFAULT 1,
        teacher_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        org_id TEXT REFERENCES organizations(id) ON DELETE SET NULL,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // Safe column additions for existing tables
    try { await client.execute(`ALTER TABLE tests ADD COLUMN allow_retake INTEGER DEFAULT 1;`); } catch {}
    try { await client.execute(`ALTER TABLE tests ADD COLUMN teacher_user_id TEXT;`); } catch {}
    try { await client.execute(`ALTER TABLE tests ADD COLUMN org_id TEXT;`); } catch {}

    // 5. Questions table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS questions (
        id TEXT PRIMARY KEY,
        test_id TEXT NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
        question_text TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'mcq',
        options_json TEXT,
        correct_answer_index INTEGER,
        explanation TEXT,
        model_answer TEXT,
        rubric_json TEXT,
        marks INTEGER NOT NULL DEFAULT 1,
        difficulty TEXT DEFAULT 'medium',
        order_index INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );
    `);

    // 6. Submissions table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS submissions (
        id TEXT PRIMARY KEY,
        test_id TEXT NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
        student_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        student_name TEXT NOT NULL,
        student_id TEXT,
        student_email TEXT,
        score INTEGER NOT NULL DEFAULT 0,
        max_score INTEGER NOT NULL DEFAULT 0,
        percentage INTEGER NOT NULL DEFAULT 0,
        passed INTEGER NOT NULL DEFAULT 0,
        assigned_questions_json TEXT NOT NULL,
        answers_json TEXT NOT NULL,
        time_spent_seconds INTEGER NOT NULL DEFAULT 0,
        is_auto_submitted INTEGER NOT NULL DEFAULT 0,
        started_at TEXT NOT NULL,
        submitted_at TEXT NOT NULL
      );
    `);

    try { await client.execute(`ALTER TABLE submissions ADD COLUMN student_user_id TEXT;`); } catch {}

    // 7. Essay Gradings table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS essay_gradings (
        id TEXT PRIMARY KEY,
        teacher_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        title TEXT NOT NULL,
        student_name TEXT,
        student_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        essay_prompt TEXT NOT NULL,
        rubric_prompt TEXT,
        student_essay TEXT NOT NULL,
        overall_score INTEGER NOT NULL,
        max_score INTEGER NOT NULL DEFAULT 100,
        criteria_scores_json TEXT NOT NULL,
        strengths_json TEXT,
        weaknesses_json TEXT,
        detailed_feedback TEXT NOT NULL,
        corrected_excerpts_json TEXT,
        created_at TEXT NOT NULL
      );
    `);

    // 8. Extract Info Documents table (AI field extraction & export records)
    await client.execute(`
      CREATE TABLE IF NOT EXISTS extract_documents (
        id TEXT PRIMARY KEY,
        owner_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        org_id TEXT REFERENCES organizations(id) ON DELETE SET NULL,
        title TEXT NOT NULL,
        field_definitions_json TEXT NOT NULL,
        extracted_rows_json TEXT NOT NULL,
        page_count INTEGER NOT NULL DEFAULT 1,
        source_images_json TEXT,
        export_format TEXT NOT NULL DEFAULT 'xlsx',
        status TEXT NOT NULL DEFAULT 'ready',
        error TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // 9. System Settings table (Global Admin switches)
    await client.execute(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        description TEXT,
        updated_at TEXT NOT NULL
      );
    `);

    // Ensure default settings exist
    try {
      const now = new Date().toISOString();
      await client.execute({
        sql: `INSERT OR IGNORE INTO system_settings (key, value, description, updated_at) VALUES ('free_all_teachers', 'false', 'Enable 100% Free Full Pro Access for all teachers', ?)`,
        args: [now]
      });
      await client.execute({
        sql: `INSERT OR IGNORE INTO system_settings (key, value, description, updated_at) VALUES ('free_all_organizations', 'false', 'Enable 100% Free School Pro Access for all organizations', ?)`,
        args: [now]
      });
    } catch {}

    // Safe column additions for users
    try { await client.execute(`ALTER TABLE users ADD COLUMN department_id TEXT;`); } catch {}
    try { await client.execute(`ALTER TABLE users ADD COLUMN can_manage_complaints INTEGER DEFAULT 0;`); } catch {}

    // 9. Departments table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS departments (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        code TEXT,
        created_at TEXT NOT NULL
      );
    `);

    // 10. Complaint Forms configuration table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS complaint_forms (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'inactive',
        categories_json TEXT NOT NULL,
        allow_document_upload INTEGER NOT NULL DEFAULT 1,
        levels_json TEXT NOT NULL,
        instructions TEXT,
        updated_at TEXT NOT NULL
      );
    `);

    // 11. Complaints table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS complaints (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        student_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        student_name TEXT NOT NULL,
        student_matricule TEXT NOT NULL,
        student_phone TEXT,
        department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
        department_name TEXT,
        student_level TEXT NOT NULL,
        course_code TEXT,
        nature TEXT NOT NULL,
        subject TEXT NOT NULL,
        description TEXT NOT NULL,
        document_url TEXT,
        document_name TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        assigned_reviewer_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        assigned_reviewer_name TEXT,
        resolution_note TEXT,
        resolved_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    isInitialized = true;
  } catch (error) {
    console.error("Database initialization error:", error);
  }
}
