"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CalendarDays,
  Plus,
  Trash2,
  Clock,
  MapPin,
  GraduationCap,
  X,
  BookOpen,
} from "lucide-react";

interface Course {
  id: string;
  name: string;
  code: string | null;
  year: string | null;
  departmentId: string | null;
  departmentName: string | null;
  teacherId: string | null;
  teacherName: string | null;
}

interface TimetableEntry {
  id: string;
  day: number;
  periodNo: number;
  startTime: string;
  endTime: string;
  venue: string | null;
  year: string | null;
  courseId: string;
  courseName: string;
  courseCode: string | null;
  departmentId: string | null;
  departmentName: string | null;
  teacherId: string | null;
  teacherName: string | null;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const COURSE_COLORS = [
  { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-800", dot: "bg-indigo-500" },
  { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-800", dot: "bg-emerald-500" },
  { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-800", dot: "bg-amber-500" },
  { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-800", dot: "bg-rose-500" },
  { bg: "bg-sky-50", border: "border-sky-200", text: "text-sky-800", dot: "bg-sky-500" },
  { bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-800", dot: "bg-violet-500" },
  { bg: "bg-teal-50", border: "border-teal-200", text: "text-teal-800", dot: "bg-teal-500" },
  { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-800", dot: "bg-orange-500" },
];

export default function TimetableBuilderPage() {
  const [user, setUser] = useState<any>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Course creation
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [courseName, setCourseName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [courseYear, setCourseYear] = useState("");
  const [courseDept, setCourseDept] = useState("");
  const [courseSaving, setCourseSaving] = useState(false);

  // Entry creation
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [entryCourseId, setEntryCourseId] = useState("");
  const [entryDay, setEntryDay] = useState(0);
  const [entryPeriod, setEntryPeriod] = useState(1);
  const [entryStart, setEntryStart] = useState("08:00");
  const [entryEnd, setEntryEnd] = useState("09:00");
  const [entryVenue, setEntryVenue] = useState("");
  const [entrySaving, setEntrySaving] = useState(false);

  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("judmi_user") || "null");
      if (stored) setUser(stored);
    } catch {}
  }, []);

  const fetchCourses = useCallback(async () => {
    const res = await fetch("/api/org/timetable/courses");
    const data = await res.json();
    setCourses(data.courses || []);
  }, []);

  const fetchEntries = useCallback(async () => {
    const res = await fetch("/api/org/timetable");
    const data = await res.json();
    setEntries(data.entries || []);
  }, []);

  const fetchDepartments = useCallback(async () => {
    const res = await fetch("/api/org/departments");
    const data = await res.json();
    setDepartments(data.departments || []);
  }, []);

  useEffect(() => {
    if (!user?.orgId) {
      setLoading(false);
      return;
    }
    Promise.all([fetchCourses(), fetchEntries(), fetchDepartments()]).finally(() => setLoading(false));
  }, [user?.orgId, fetchCourses, fetchEntries, fetchDepartments]);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseName.trim()) return;
    setCourseSaving(true);
    try {
      await fetch("/api/org/timetable/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: courseName,
          code: courseCode,
          year: courseYear,
          departmentId: courseDept || null,
        }),
      });
      await fetchCourses();
      setShowCourseModal(false);
      setCourseName("");
      setCourseCode("");
      setCourseYear("");
      setCourseDept("");
    } finally {
      setCourseSaving(false);
    }
  };

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryCourseId) return;
    setEntrySaving(true);
    try {
      const selected = courses.find((c) => c.id === entryCourseId);
      await fetch("/api/org/timetable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: entryCourseId,
          day: entryDay,
          periodNo: entryPeriod,
          startTime: entryStart,
          endTime: entryEnd,
          venue: entryVenue,
          year: selected?.year || null,
          departmentId: selected?.departmentId || null,
          teacherId: selected?.teacherId || null,
        }),
      });
      await fetchEntries();
      setShowEntryModal(false);
    } finally {
      setEntrySaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this timetable entry?")) return;
    await fetch("/api/org/timetable", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const colorMap = new Map<string, number>();
  let colorIdx = 0;
  const getColor = (courseId: string) => {
    if (!colorMap.has(courseId)) {
      colorMap.set(courseId, colorIdx % COURSE_COLORS.length);
      colorIdx++;
    }
    return COURSE_COLORS[colorMap.get(courseId)!];
  };

  const byDay = new Map<number, TimetableEntry[]>();
  for (const e of entries) {
    const list = byDay.get(e.day) || [];
    list.push(e);
    byDay.set(e.day, list);
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-5 py-16 flex flex-col items-center justify-center text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-navy-50 text-navy-700 border border-navy-100 flex items-center justify-center animate-pulse">
          <CalendarDays className="w-6 h-6" />
        </div>
        <p className="text-sm text-slate-500 font-semibold">Loading timetable…</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <span className="inline-block text-[12px] sm:text-sm font-bold uppercase tracking-[0.22em] text-amber-600">
            Staff Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 flex items-center gap-2">
            <CalendarDays className="w-7 h-7 text-navy-700" /> Timetable Manager
          </h1>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setShowCourseModal(true)} className="btn-outline text-xs px-3 py-2.5 rounded-xl flex items-center gap-1.5">
            <BookOpen className="w-4 h-4" /> New Course
          </button>
          <button type="button" onClick={() => setShowEntryModal(true)} className="btn-primary text-xs px-3 py-2.5 rounded-xl flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Add to Timetable
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="surface p-3 rounded-xl text-center">
          <div className="text-2xl font-extrabold text-navy-900">{courses.length}</div>
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Courses</div>
        </div>
        <div className="surface p-3 rounded-xl text-center">
          <div className="text-2xl font-extrabold text-navy-900">{entries.length}</div>
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Timetable Slots</div>
        </div>
        <div className="surface p-3 rounded-xl text-center col-span-2 sm:col-span-1">
          <div className="text-2xl font-extrabold text-navy-900">{new Set(entries.map((e) => e.day)).size}</div>
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Days Covered</div>
        </div>
      </div>

      {/* Weekly Grid */}
      {entries.length === 0 ? (
        <div className="surface-elevated rounded-2xl p-8 text-center space-y-3">
          <CalendarDays className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-500">No timetable entries yet</p>
          <p className="text-xs text-slate-400">Create courses first, then add them to the timetable.</p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 min-w-[320px]">
            {DAYS.map((dayName, dayIdx) => {
              const dayEntries = (byDay.get(dayIdx) || []).sort((a, b) => a.periodNo - b.periodNo);
              if (dayEntries.length === 0) return null;
              return (
                <div key={dayIdx} className="surface-elevated rounded-2xl overflow-hidden animate-slide-up" style={{ animationDelay: `${dayIdx * 60}ms` }}>
                  <div className="px-4 py-3 bg-navy-900 text-white flex items-center gap-2">
                    <span className="text-sm font-extrabold">{dayName}</span>
                    <span className="ml-auto text-[11px] text-navy-200/80 font-semibold">{dayEntries.length} class{dayEntries.length > 1 ? "es" : ""}</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {dayEntries.map((e) => {
                      const c = getColor(e.courseId);
                      return (
                        <div key={e.id} className={`px-4 py-3 flex items-start gap-3 ${c.bg}`}>
                          <div className={`mt-0.5 w-2 h-2 rounded-full ${c.dot} shrink-0`} />
                          <div className="min-w-0 flex-1">
                            <div className={`text-sm font-bold ${c.text}`}>
                              {e.courseCode ? <span className="font-mono">{e.courseCode}</span> : null}{" "}
                              {e.courseName}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                              <Clock className="w-3 h-3" />
                              <span>{e.startTime} – {e.endTime}</span>
                              {e.venue && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" /> {e.venue}
                                </span>
                              )}
                            </div>
                            {e.teacherName && (
                              <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-400">
                                <GraduationCap className="w-3 h-3" />
                                <span>{e.teacherName}</span>
                              </div>
                            )}
                          </div>
                          <button type="button" onClick={() => handleDelete(e.id)} className="text-slate-300 hover:text-rose-500 transition-colors shrink-0 mt-0.5" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create Course Modal */}
      {showCourseModal && (
        <div className="modal-overlay" onClick={() => setShowCourseModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-navy-700" /> New Course
              </h2>
              <button type="button" onClick={() => setShowCourseModal(false)} className="text-slate-400 hover:text-rose-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateCourse} className="p-5 sm:p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Course Name <span className="text-rose-500">*</span></label>
                <input type="text" required value={courseName} onChange={(e) => setCourseName(e.target.value)} placeholder="e.g. Introduction to Programming" className="input-field py-2.5 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Course Code</label>
                  <input type="text" value={courseCode} onChange={(e) => setCourseCode(e.target.value)} placeholder="e.g. CSC 101" className="input-field py-2.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Year / Level</label>
                  <input type="text" value={courseYear} onChange={(e) => setCourseYear(e.target.value)} placeholder="e.g. Year 1" className="input-field py-2.5 text-sm" />
                </div>
              </div>
              {departments.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
                  <select value={courseDept} onChange={(e) => setCourseDept(e.target.value)} className="input-field py-2.5 text-sm">
                    <option value="">All departments</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCourseModal(false)} className="btn-outline text-xs flex-1">Cancel</button>
                <button type="submit" disabled={courseSaving || !courseName.trim()} className="btn-primary text-xs flex-1 disabled:opacity-50">
                  {courseSaving ? "Creating…" : "Create Course"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add to Timetable Modal */}
      {showEntryModal && (
        <div className="modal-overlay" onClick={() => setShowEntryModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-navy-700" /> Add to Timetable
              </h2>
              <button type="button" onClick={() => setShowEntryModal(false)} className="text-slate-400 hover:text-rose-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateEntry} className="p-5 sm:p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Course <span className="text-rose-500">*</span></label>
                {courses.length === 0 ? (
                  <p className="text-xs text-slate-500">No courses yet — create one first.</p>
                ) : (
                  <select required value={entryCourseId} onChange={(e) => setEntryCourseId(e.target.value)} className="input-field py-2.5 text-sm">
                    <option value="">Select a course</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>{c.code ? `${c.code} — ` : ""}{c.name}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Day <span className="text-rose-500">*</span></label>
                  <select value={entryDay} onChange={(e) => setEntryDay(Number(e.target.value))} className="input-field py-2.5 text-sm">
                    {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Period <span className="text-rose-500">*</span></label>
                  <input type="number" min={1} max={20} value={entryPeriod} onChange={(e) => setEntryPeriod(Number(e.target.value))} className="input-field py-2.5 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Start Time <span className="text-rose-500">*</span></label>
                  <input type="time" required value={entryStart} onChange={(e) => setEntryStart(e.target.value)} className="input-field py-2.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">End Time <span className="text-rose-500">*</span></label>
                  <input type="time" required value={entryEnd} onChange={(e) => setEntryEnd(e.target.value)} className="input-field py-2.5 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Venue</label>
                <input type="text" value={entryVenue} onChange={(e) => setEntryVenue(e.target.value)} placeholder="e.g. Room A-204" className="input-field py-2.5 text-sm" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowEntryModal(false)} className="btn-outline text-xs flex-1">Cancel</button>
                <button type="submit" disabled={entrySaving || !entryCourseId} className="btn-primary text-xs flex-1 disabled:opacity-50">
                  {entrySaving ? "Adding…" : "Add Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
