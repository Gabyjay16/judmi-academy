# EvalAI - AI Exam Generator, Timed MCQ Engine & Essay Grader

A modern, full-stack AI-powered assessment platform built with **Next.js (App Router)**, **Turso LibSQL (Drizzle ORM)**, and **Google Gemini AI**, designed for high performance and seamless deployment on **Vercel**.

---

## 🌟 Key Features

1. **AI Question Generation from Teaching Notes**:
   - Upload curriculum notes, lecture slides (PDF, text, markdown), or paste raw text.
   - Google Gemini AI automatically synthesizes curriculum-aligned MCQs, distractors, and essay questions with in-depth pedagogical explanations.
   - Interactive Question Bank Studio: edit questions, modify options, adjust difficulty, and pick correct answer keys in real-time.

2. **Dual Question Distribution Modes**:
   - **General Mode**: All students receive the exact same standardized question set.
   - **Shuffled / Unique Mode**: The system pulls a randomized, unique subset from a larger question bank for each student, ensuring no two students get the identical test.

3. **Timed Student MCQ Engine**:
   - Configurable test duration (countdown timer).
   - Live visual alerts (warning when time is low) with session recovery across page refreshes.
   - Automated auto-submit when the timer expires.
   - Distraction-free question navigator with flag-for-review capabilities.

4. **Instant Score & Wrong Answer Correction Report**:
   - Immediate grade calculation, percentage, and grade letter (A+, A, B, C, D, F).
   - Question-by-question review:
     - 🟩 Correct answers highlighted in green.
     - 🟥 Wrong answers highlighted in red with the student's choice and the correct option clearly marked.
     - 💡 AI pedagogical explanations detailing why the correct answer is right and why common distractors are incorrect.

5. **AI Essay & Theory Grader Studio**:
   - Semantic essay grading against customizable rubrics.
   - Multi-criteria breakdown: *Content & Relevance*, *Structure & Argument*, *Technical Accuracy*, and *Grammar & Mechanics*.
   - Actionable line-by-line excerpt improvement suggestions and constructive examiner feedback.

6. **Turso LibSQL + Drizzle ORM**:
   - Zero-configuration local development fallback (`file:local.db`).
   - Edge-ready Turso cloud deployment for sub-millisecond query performance globally on Vercel.

---

## 🚀 Quick Start

### 1. Installation
Navigate into the project directory and install dependencies:
```bash
cd C:\Users\DELL\.gemini\antigravity\scratch\ai-exam-grader
npm install
```

### 2. Environment Variables (.env.local)
Create or edit `.env.local`:
```env
# Turso Database Credentials (defaults to local SQLite if left empty)
TURSO_DATABASE_URL="file:local.db"
TURSO_AUTH_TOKEN=""

# Google Gemini API Key for AI question generation & essay grading
# Obtain your key at: https://aistudio.google.com/app/apikey
GEMINI_API_KEY="your_gemini_api_key_here"

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

> **Pre-loaded Demo Exam**: Enter code **`BIO101`** on the home page or go to `/test/BIO101` to immediately try a live timed exam with instant corrections!

---

## 🗄️ Setting Up Turso Cloud Database

To connect this app to a live distributed Turso database:

1. **Install Turso CLI**:
   ```bash
   curl -sSfL https://get.tur.so/install.sh | bash
   # or on Windows with scoop / winget:
   # winget install ChiselStrike.Turso
   ```
2. **Log in & create a database**:
   ```bash
   turso auth signup
   turso db create evalai-db
   ```
3. **Get the Database URL & Auth Token**:
   ```bash
   turso db show evalai-db --url
   turso db tokens create evalai-db
   ```
4. **Update `.env.local`**:
   ```env
   TURSO_DATABASE_URL="libsql://evalai-db-your-username.turso.io"
   TURSO_AUTH_TOKEN="your_jwt_auth_token"
   ```

---

## ☁️ Deploying to Vercel

1. Push your repository to GitHub / GitLab.
2. Go to [Vercel Dashboard](https://vercel.com/new) and import the repository.
3. In **Environment Variables**, add:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
   - `GEMINI_API_KEY`
   - `NEXT_PUBLIC_APP_URL`
4. Click **Deploy**. Vercel will automatically build and deploy the Next.js App Router project globally!

---

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── generate-questions/route.ts   # AI Question generator from notes
│   │   ├── grade-essay/route.ts         # AI Rubric-based essay evaluation
│   │   ├── tests/
│   │   │   ├── route.ts                 # Create and list exams
│   │   │   └── [code]/
│   │   │       ├── route.ts             # Fetch test with unique student question assignment
│   │   │       └── submit/route.ts      # Grade submission & calculate instant scores
│   │   ├── submissions/[submissionId]/  # Student result & correction data
│   │   └── analytics/[testId]/          # Teacher class analytics & CSV export
│   ├── dashboard/
│   │   ├── page.tsx                     # Teacher overview & exam management
│   │   ├── create/page.tsx              # Note upload & AI Exam Creator Wizard
│   │   ├── essay-grader/page.tsx        # AI Essay Marking Studio
│   │   └── test/[id]/page.tsx           # Test analytics & submission inspector
│   ├── test/
│   │   ├── [code]/page.tsx              # Timed student test interface
│   │   └── result/[submissionId]/page.tsx # Instant score & wrong answer corrections
│   ├── layout.tsx                       # Root layout & Navigation
│   ├── globals.css                      # Tailwind styles
│   └── page.tsx                         # Landing page with test joiner
├── components/
│   ├── Navbar.tsx                       # Header navigation
│   ├── TestTimer.tsx                    # Real-time countdown timer & alerts
│   ├── ScoreCard.tsx                    # Score display & confetti celebration
│   ├── CorrectionReview.tsx             # Wrong answer corrections & AI explanations
│   └── EssayFeedbackCard.tsx            # Multi-criteria essay grading card
├── db/
│   ├── index.ts                         # Turso LibSQL connection & auto table bootstrap
│   ├── schema.ts                        # Drizzle ORM schema
│   └── seed.ts                          # Pre-seeded demo test (BIO101)
├── lib/
│   ├── gemini.ts                        # Google Gemini AI integration
│   ├── question-shuffler.ts             # General vs Shuffled/Unique question allocator
│   ├── pdf-parser.ts                    # Document text extractor
│   └── utils.ts                         # Grade calculation & helper functions
```
