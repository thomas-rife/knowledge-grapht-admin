import { NextRequest, NextResponse } from "next/server";
import { getClassActivityStartDate, getExportContext, getStudentExportData, StudentExportError } from "@/lib/student-export/data";
import { getExportDateWindow } from "@/lib/student-export/date-range";
import { buildStudentWorkbook } from "@/lib/student-export/workbook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const errorResponse = (error: unknown) => {
  if (error instanceof StudentExportError) {
    return NextResponse.json({ error: error.message }, { status: error.status, headers: { "Cache-Control": "no-store" } });
  }
  console.error("Student export failed:", error instanceof Error ? error.message : "Unknown error");
  return NextResponse.json({ error: "Could not export student activity. Please try again." }, {
    status: 500, headers: { "Cache-Control": "no-store" },
  });
};

export async function GET(request: NextRequest) {
  try {
    const className = request.nextUrl.searchParams.get("className");
    if (!className) throw new StudentExportError("A class is required.", 400);
    const context = await getExportContext(className);
    const firstActivityDate = await getClassActivityStartDate(context);
    return NextResponse.json({ students: context.students, firstActivityDate }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try { body = await request.json(); }
    catch { throw new StudentExportError("Invalid export request.", 400); }
    const { className, studentIds, startDate, endDate } = (body ?? {}) as {
      className?: unknown; studentIds?: unknown; startDate?: unknown; endDate?: unknown;
    };
    if (typeof className !== "string" || !className.trim() || !Array.isArray(studentIds)
      || !studentIds.length || studentIds.some((id) => typeof id !== "string")) {
      throw new StudentExportError("Choose a class and at least one student.", 400);
    }
    const dateWindow = startDate === undefined && endDate === undefined
      ? undefined : getExportDateWindow(startDate, endDate);
    if (dateWindow === null) throw new StudentExportError("Choose a valid start date and end date, with the start on or before the end.", 400);
    const context = await getExportContext(className);
    const data = await getStudentExportData(context, studentIds, dateWindow);
    const workbook = await buildStudentWorkbook(data);
    const buffer = await workbook.xlsx.writeBuffer();
    const slug = context.className.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-|-$/g, "") || "class";
    const dateLabel = dateWindow ? `${startDate}_to_${endDate}` : new Date().toISOString().slice(0, 10);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${slug}-student-activity-${dateLabel}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) { return errorResponse(error); }
}
