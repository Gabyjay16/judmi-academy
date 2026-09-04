import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/db";
import { libraryBooks, libraryLoans } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { generateId } from "@/lib/utils";

const STAFF = ["admin", "org_admin", "teacher"];

export async function GET(req: NextRequest) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!user.orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

    const [books, loans] = await Promise.all([
      db.select().from(libraryBooks).where(eq(libraryBooks.orgId, user.orgId)).orderBy(desc(libraryBooks.createdAt)),
      db.select().from(libraryLoans).where(eq(libraryLoans.orgId, user.orgId)).orderBy(desc(libraryLoans.createdAt)),
    ]);

    // Auto-mark overdue
    const today = new Date().toISOString().slice(0, 10);
    const nowIso = new Date().toISOString();
    let changed = false;
    for (const l of loans) {
      if (l.status === "borrowed" && l.dueDate < today) {
        await db.update(libraryLoans).set({ status: "overdue" }).where(eq(libraryLoans.id, l.id));
        changed = true;
      }
    }
    const finalLoans = changed ? await db.select().from(libraryLoans).where(eq(libraryLoans.orgId, user.orgId)).orderBy(desc(libraryLoans.createdAt)) : loans;

    const studentId = req.nextUrl.searchParams.get("studentId");
    const filteredLoans = studentId ? finalLoans.filter((l) => l.studentId === studentId) : finalLoans;
    const filteredBooks = user.role === "student" ? books : books;

    return NextResponse.json({ books: filteredBooks, loans: filteredLoans, now: nowIso });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!user.orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

    const body = await req.json();
    const { action } = body;
    const now = new Date().toISOString();

    // Add a book to the catalog
    if (action === "book") {
      if (!STAFF.includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const { title, author, isbn, category, location, copies } = body;
      if (!title?.trim()) return NextResponse.json({ error: "Title is required." }, { status: 400 });
      const c = Math.max(1, Number(copies) || 1);
      await db.insert(libraryBooks).values({
        id: generateId(),
        orgId: user.orgId,
        title: title.trim(),
        author: author?.trim() || null,
        isbn: isbn?.trim() || null,
        category: category?.trim() || null,
        location: location?.trim() || null,
        totalCopies: c,
        availableCopies: c,
        createdAt: now,
      });
      return NextResponse.json({ success: true });
    }

    // Checkout a book to a student
    if (action === "checkout") {
      if (!STAFF.includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const { bookId, studentId, studentName, dueDate } = body;
      if (!bookId || !studentId || !dueDate) return NextResponse.json({ error: "Book, student, and due date are required." }, { status: 400 });
      const bookRows = await db.select().from(libraryBooks).where(and(eq(libraryBooks.id, bookId), eq(libraryBooks.orgId, user.orgId))).limit(1);
      if (bookRows.length === 0) return NextResponse.json({ error: "Book not found" }, { status: 404 });
      const book = bookRows[0];
      if ((book.availableCopies || 0) < 1) return NextResponse.json({ error: "No copies available for checkout." }, { status: 400 });

      await db.insert(libraryLoans).values({
        id: generateId(),
        orgId: user.orgId,
        bookId,
        studentId,
        studentName: studentName || null,
        dueDate,
        returnedAt: null,
        status: "borrowed",
        createdBy: user.id,
        createdAt: now,
      });
      await db.update(libraryBooks).set({ availableCopies: (book.availableCopies || 0) - 1 }).where(eq(libraryBooks.id, bookId));
      return NextResponse.json({ success: true });
    }

    // Return a loan
    if (action === "return") {
      if (!STAFF.includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const { loanId } = body;
      if (!loanId) return NextResponse.json({ error: "Missing loanId" }, { status: 400 });
      const loanRows = await db.select().from(libraryLoans).where(and(eq(libraryLoans.id, loanId), eq(libraryLoans.orgId, user.orgId))).limit(1);
      if (loanRows.length === 0) return NextResponse.json({ error: "Loan not found" }, { status: 404 });
      const loan = loanRows[0];
      if (loan.status === "returned") return NextResponse.json({ success: true });

      await db.update(libraryLoans).set({ status: "returned", returnedAt: now }).where(eq(libraryLoans.id, loanId));
      const bookRows = await db.select().from(libraryBooks).where(eq(libraryBooks.id, loan.bookId)).limit(1);
      if (bookRows[0]) {
        await db.update(libraryBooks).set({ availableCopies: (bookRows[0].availableCopies || 0) + 1 }).where(eq(libraryBooks.id, loan.bookId));
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await initDatabase();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin" && user.role !== "org_admin") return NextResponse.json({ error: "Only administrators." }, { status: 403 });

    const body = await req.json();
    const { id } = body;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    await db.delete(libraryBooks).where(and(eq(libraryBooks.id, id), eq(libraryBooks.orgId, user.orgId!)));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}
