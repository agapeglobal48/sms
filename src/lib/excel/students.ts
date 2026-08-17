import * as XLSX from "xlsx";

export type ClassOption = { id: string; name: string };

export type StudentExportRow = {
  Name: string;
  "Father Name": string;
  "Roll No": number | string;
  Class: string;
  Gender: string;
  "Date of Birth": string;
  "Date of Admission": string;
  Contact: string;
  Address: string;
  "Monthly Fee": number;
};

export function studentsToExportRows(
  students: {
    name: string;
    father_name: string | null;
    roll_no: number | null;
    class_id: string | null;
    gender: string | null;
    dob: string | null;
    date_of_admission: string | null;
    contact: string | null;
    address: string | null;
    monthly_fee: number;
  }[],
  classes: ClassOption[]
): StudentExportRow[] {
  const classNameById = new Map(classes.map((c) => [c.id, c.name]));

  return students.map((s) => ({
    Name: s.name,
    "Father Name": s.father_name ?? "",
    "Roll No": s.roll_no ?? "",
    Class: s.class_id ? (classNameById.get(s.class_id) ?? "") : "",
    Gender: s.gender ?? "",
    "Date of Birth": s.dob ?? "",
    "Date of Admission": s.date_of_admission ?? "",
    Contact: s.contact ?? "",
    Address: s.address ?? "",
    "Monthly Fee": s.monthly_fee,
  }));
}

export function buildStudentsWorkbookBuffer(rows: StudentExportRow[]): Buffer {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export type ParsedStudentRow = {
  name: string;
  father_name: string | null;
  roll_no: number | null;
  class_id: string | null;
  gender: string | null;
  dob: string | null;
  date_of_admission: string | null;
  contact: string | null;
  address: string | null;
  monthly_fee: number;
};

/**
 * Parses an uploaded workbook's first sheet using the same column headers
 * that studentsToExportRows() produces, so a file exported from this app
 * can be edited and re-imported directly.
 */
export function parseStudentsWorkbook(
  buffer: ArrayBuffer,
  classes: ClassOption[]
): ParsedStudentRow[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });

  const classIdByName = new Map(
    classes.map((c) => [c.name.trim().toLowerCase(), c.id])
  );

  const toStr = (v: unknown) => (v === undefined || v === null ? "" : String(v).trim());

  return rows
    .map((row) => {
      const name = toStr(row["Name"]);
      if (!name) return null; // skip blank rows

      const className = toStr(row["Class"]).toLowerCase();
      const rollNoRaw = toStr(row["Roll No"]);
      const feeRaw = toStr(row["Monthly Fee"]);

      return {
        name,
        father_name: toStr(row["Father Name"]) || null,
        roll_no: rollNoRaw ? Number(rollNoRaw) : null,
        class_id: className ? (classIdByName.get(className) ?? null) : null,
        gender: toStr(row["Gender"]) || null,
        dob: toStr(row["Date of Birth"]) || null,
        date_of_admission: toStr(row["Date of Admission"]) || null,
        contact: toStr(row["Contact"]) || null,
        address: toStr(row["Address"]) || null,
        monthly_fee: feeRaw ? Number(feeRaw) : 0,
      };
    })
    .filter((r): r is ParsedStudentRow => r !== null);
}
