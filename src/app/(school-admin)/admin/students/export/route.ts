import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { studentsToExportRows, buildStudentsWorkbookBuffer } from "@/lib/excel/students";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, school_id")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "school_admin" || !profile.school_id) {
    return NextResponse.json({ error: "School Admin only." }, { status: 403 });
  }

  const [{ data: students }, { data: classes }] = await Promise.all([
    supabase
      .from("students")
      .select(
        "name, father_name, roll_no, class_id, gender, dob, date_of_admission, contact, address, monthly_fee"
      )
      .eq("school_id", profile.school_id)
      .order("name", { ascending: true }),
    supabase
      .from("classes")
      .select("id, name")
      .eq("school_id", profile.school_id),
  ]);

  const rows = studentsToExportRows(students ?? [], classes ?? []);
  const buffer = buildStudentsWorkbookBuffer(rows);

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="students.xlsx"',
    },
  });
}
