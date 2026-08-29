import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const url = process.env.TURSO_DATABASE_URL || "file:local.db";
const authToken = process.env.TURSO_AUTH_TOKEN || undefined;

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

    // 8. System Settings table (Global Admin switches)
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

    isInitialized = true;
  } catch (error) {
    console.error("Database initialization error:", error);
  }
}
