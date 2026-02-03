"use server";

import { createClient } from "@/utils/supabase/server";

type EnrollmentWithStudent = {
  student_id: string;
  students: { display_name: string } | { display_name: string }[] | null;
};

export const enrolledStudents = async (className: string) => {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    console.error("No user found");
    return { success: false, error: "No user found" };
  }

  // clean class name
  const cleanedClassName = className.replace(/%20/g, " ");
  console.log("Cleaned class name: ", cleanedClassName);

  const { data: classID, error: classError } = await supabase
    .from("classes")
    .select("class_id")
    .eq("name", cleanedClassName)
    .single();

  if (classError) {
    console.error("Error fetching class ID: ", classError);
    return { success: false, error: classError };
  }

  const { data, error } = await supabase
    .from("enrollments")
    .select(
      `
      student_id,
      students!inner (
        display_name
      )
    `,
    )
    .eq("class_id", classID.class_id)
    .returns<EnrollmentWithStudent[]>();

  if (error) {
    console.error("Error fetching enrolled students: ", error);
    return { success: false, error };
  }

  return {
    success: true,
    students: data.map((student) => {
      const displayName = Array.isArray(student.students)
        ? student.students[0]?.display_name
        : student.students?.display_name;

      return {
        student_id: student.student_id,
        student_name: displayName ?? "",
      };
    }),
  };
};
