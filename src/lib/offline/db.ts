import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "school-sms-offline";
const DB_VERSION = 1;
const STORE = "pending_attendance";

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "key" });
        }
      },
    });
  }
  return dbPromise;
}

export type PendingAttendance = {
  /** `${studentId}:${date}` — re-marking the same student/date while still
   * offline overwrites the queued entry instead of piling up duplicates. */
  key: string;
  studentId: string;
  classId: string;
  schoolId: string;
  date: string;
  status: "present" | "absent" | "leave";
  markedBy: string;
  queuedAt: number;
};

export async function queueAttendance(
  entry: Omit<PendingAttendance, "key" | "queuedAt">
) {
  const db = await getDB();
  await db.put(STORE, {
    ...entry,
    key: `${entry.studentId}:${entry.date}`,
    queuedAt: Date.now(),
  });
}

export async function getPendingAttendance(): Promise<PendingAttendance[]> {
  const db = await getDB();
  return db.getAll(STORE);
}

export async function getPendingAttendanceForClassDate(
  classId: string,
  date: string
): Promise<PendingAttendance[]> {
  const all = await getPendingAttendance();
  return all.filter((e) => e.classId === classId && e.date === date);
}

export async function removePendingAttendance(key: string) {
  const db = await getDB();
  await db.delete(STORE, key);
}

export async function countPendingAttendance(): Promise<number> {
  const db = await getDB();
  return db.count(STORE);
}
