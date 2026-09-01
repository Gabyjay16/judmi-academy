/**
 * High-fidelity client-side PDF document generator and print exporter
 * Generates formatted academic transcripts, student correction sheets, and class result sheets.
 */

import { formatTime } from "./utils";

export interface StudentTranscriptData {
  student: {
    name: string;
    email: string;
    studentId?: string | null;
  };
  stats: {
    totalTaken: number;
    avgPercentage: number;
    passRate: number;
    highestScore: number;
  };
  history: Array<{
    id: string;
    testTitle: string;
    testSubject?: string | null;
    testCode: string;
    score: number;
    maxScore: number;
    percentage: number;
    passed: number;
    timeSpentSeconds: number;
    submittedAt: string;
  }>;
}

export interface ClassResultsData {
  test: {
    title: string;
    code: string;
    subject?: string | null;
    durationMinutes: number;
    passScorePercentage: number;
    organizationName?: string | null;
  };
  stats: {
    totalSubmissions: number;
    avgPercentage: number;
    passRate: number;
  };
  submissions: Array<{
    id: string;
    studentName: string;
    studentId?: string | null;
    score: number;
    maxScore: number;
    percentage: number;
    passed: number;
    timeSpentSeconds: number;
    submittedAt: string;
  }>;
}

/**
 * Open printable formatted window that triggers browser Print-to-PDF
 */
function printHtmlDocument(title: string, htmlContent: string) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups to download/print your PDF report.");
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        @page {
          size: A4;
          margin: 15mm;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #1e293b;
          margin: 0;
          padding: 10px;
          line-height: 1.4;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #4f46e5;
          padding-bottom: 12px;
          margin-bottom: 16px;
        }
        .brand {
          font-size: 22px;
          font-weight: 800;
          color: #4f46e5;
          letter-spacing: -0.5px;
        }
        .brand-sub {
          font-size: 10px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .doc-title {
          font-size: 18px;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 4px 0;
        }
        .meta-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 20px;
          background-color: #f8fafc;
          padding: 12px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }
        .meta-item {
          display: flex;
          flex-direction: column;
        }
        .meta-label {
          font-size: 9px;
          color: #64748b;
          text-transform: uppercase;
          font-weight: 700;
        }
        .meta-value {
          font-size: 14px;
          font-weight: 700;
          color: #0f172a;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
          font-size: 11px;
        }
        th {
          background-color: #f1f5f9;
          color: #475569;
          font-weight: 700;
          text-align: left;
          padding: 8px 10px;
          border-bottom: 1px solid #cbd5e1;
        }
        td {
          padding: 8px 10px;
          border-bottom: 1px solid #f1f5f9;
          color: #334155;
        }
        tr:nth-child(even) td {
          background-color: #f8fafc;
        }
        .badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 9999px;
          font-weight: 700;
          font-size: 10px;
        }
        .badge-pass {
          background-color: #ecfdf5;
          color: #047857;
        }
        .badge-fail {
          background-color: #fff1f2;
          color: #be123c;
        }
        .footer {
          margin-top: 30px;
          padding-top: 12px;
          border-top: 1px solid #e2e8f0;
          font-size: 9px;
          color: #94a3b8;
          display: flex;
          justify-content: space-between;
        }
      </style>
    </head>
    <body>
      ${htmlContent}
      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 300);
        }
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

/**
 * 1. Export Student Official Academic Transcript PDF
 */
export function exportStudentTranscriptPDF(data: StudentTranscriptData) {
  const { student, stats, history } = data;
  const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const rowsHtml = history.map((sub, idx) => `
    <tr>
      <td style="font-weight: bold;">${idx + 1}</td>
      <td>
        <strong>${sub.testTitle}</strong><br>
        <span style="font-size: 9px; color: #64748b;">${sub.testSubject || "General"}</span>
      </td>
      <td style="font-family: monospace; font-weight: bold; color: #4f46e5;">${sub.testCode}</td>
      <td>${sub.score} / ${sub.maxScore}</td>
      <td style="font-weight: bold;">${sub.percentage}%</td>
      <td>
        <span class="badge ${sub.passed === 1 ? "badge-pass" : "badge-fail"}">
          ${sub.passed === 1 ? "PASSED" : "FAILED"}
        </span>
      </td>
      <td>${formatTime(sub.timeSpentSeconds)}</td>
      <td>${new Date(sub.submittedAt).toLocaleDateString()}</td>
    </tr>
  `).join("");

  const content = `
    <div class="header">
      <div>
        <div class="brand">Judmi Academy</div>
        <div class="brand-sub">Academic Assessment & Evaluation Transcripts</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 12px; font-weight: bold; color: #0f172a;">OFFICIAL TRANSCRIPT</div>
        <div style="font-size: 9px; color: #64748b;">Generated: ${dateStr}</div>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-item">
        <span class="meta-label">Student Name</span>
        <span class="meta-value">${student.name}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Student / Matric ID</span>
        <span class="meta-value">${student.studentId || "—"}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Average Score</span>
        <span class="meta-value" style="color: #4f46e5;">${stats.avgPercentage}%</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Pass Rate</span>
        <span class="meta-value" style="color: #059669;">${stats.passRate}%</span>
      </div>
    </div>

    <div class="doc-title">Examination Transcripts History</div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Assessment Title</th>
          <th>Code</th>
          <th>Score</th>
          <th>Grade %</th>
          <th>Status</th>
          <th>Time</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml.length > 0 ? rowsHtml : `<tr><td colspan="8" style="text-align: center; color: #94a3b8;">No tests taken yet.</td></tr>`}
      </tbody>
    </table>

    <div class="footer">
      <span>Official Transcript Record • Certified by Judmi Academy Examination Engine</span>
      <span>Page 1 of 1</span>
    </div>
  `;

  printHtmlDocument(`${student.name}_Academic_Transcript.pdf`, content);
}

/**
 * 2. Export Teacher Class Examination Results PDF
 */
export function exportClassResultsPDF(data: ClassResultsData) {
  const { test, stats, submissions } = data;
  const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  // Brand the report with the school name when the exam belongs to a school.
  const reportBrand = (test.organizationName || "Judmi Academy").trim();

  const rowsHtml = submissions.map((sub, idx) => `
    <tr>
      <td style="font-weight: bold;">${idx + 1}</td>
      <td><strong>${sub.studentName}</strong></td>
      <td style="font-family: monospace; color: #64748b;">${sub.studentId || "—"}</td>
      <td><strong>${sub.score}</strong> / ${sub.maxScore}</td>
      <td style="font-weight: bold; color: ${sub.passed === 1 ? "#0f172a" : "#be123c"};">${sub.percentage}%</td>
      <td>
        <span class="badge ${sub.passed === 1 ? "badge-pass" : "badge-fail"}">
          ${sub.passed === 1 ? "PASSED" : "FAILED"}
        </span>
      </td>
      <td>${formatTime(sub.timeSpentSeconds)}</td>
      <td>${new Date(sub.submittedAt).toLocaleDateString()}</td>
    </tr>
  `).join("");

  const content = `
    <div class="header">
      <div>
        <div class="brand">${reportBrand}</div>
        <div class="brand-sub">Classroom Assessment Gradebook & Results</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 12px; font-weight: bold; color: #0f172a;">EXAM GRADE REPORT</div>
        <div style="font-size: 9px; color: #64748b;">Date: ${dateStr}</div>
      </div>
    </div>

    <div class="doc-title">${test.title}</div>
    <div style="font-size: 11px; color: #64748b; margin-bottom: 12px;">
      Subject: <strong>${test.subject || "General"}</strong> • Exam Code: <strong style="color: #4f46e5;">${test.code}</strong> • Duration: <strong>${test.durationMinutes} mins</strong>
    </div>

    <div class="meta-grid">
      <div class="meta-item">
        <span class="meta-label">Total Submissions</span>
        <span class="meta-value">${stats.totalSubmissions}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Class Average</span>
        <span class="meta-value" style="color: #4f46e5;">${stats.avgPercentage}%</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Overall Pass Rate</span>
        <span class="meta-value" style="color: #059669;">${stats.passRate}%</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Pass Mark Threshold</span>
        <span class="meta-value">${test.passScorePercentage}%</span>
      </div>
    </div>

    <div class="doc-title" style="font-size: 14px; margin-top: 16px;">Candidate Submissions & Scores</div>
    <table>
      <thead>
        <tr>
          <th>Rank</th>
          <th>Student Name</th>
          <th>Matric / ID</th>
          <th>Score</th>
          <th>Percentage</th>
          <th>Status</th>
          <th>Time Spent</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml.length > 0 ? rowsHtml : `<tr><td colspan="8" style="text-align: center; color: #94a3b8;">No submissions recorded.</td></tr>`}
      </tbody>
    </table>

    <div class="footer">
      <span>Official Class Examination Results • Generated by ${reportBrand}</span>
      <span>Page 1 of 1</span>
    </div>
  `;

  printHtmlDocument(`${test.code}_Class_Results.pdf`, content);
}
