"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export async function login(formData: FormData) {
  const supabase = createClient();

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };
  // TODO: DONT FORGET TO REMOVE THIS ONCE THE APP IS READY FOR PRODUCTION
  const developmentAccount =
    data.email.trim() === process.env.NEXT_DEVELOPMENT_ACCOUNT!;

  // TODO: make prof validation a helper function
  const professorAccount =
    data.email.trim().endsWith("@lmu.edu") || developmentAccount;

  if (!professorAccount) {
    return { error: "Invalid email. Please use your LMU email." };
  }

  const { error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    return { error: "Invalid email or password" };
  }

  revalidatePath("/", "layout");
  redirect("/classes");
}

export async function signup(formData: FormData) {
  const supabase = createClient();

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    displayName: formData.get("displayName") as string,
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const isProfessorEmail = data.email.trim().endsWith("@lmu.edu");
  // const isStudentEmail = data.email.trim().endsWith('@lion.lmu.edu')

  if (!isProfessorEmail) {
    console.error("Invalid email");
    return { error: "Invalid email. Please use your LMU email." };
  }

  const { error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        display_name: data.displayName,
      },
    },
  });

  if (error) {
    console.error(error);
    return { error: `Error signing up: ${error.message}` };
  }

  const { data: userData, error: userFetchError } =
    await supabase.auth.getUser();
  if (userFetchError) {
    console.error(userFetchError);
    return { error: `Error signing up: ${userFetchError.message}` };
  }

  const userID = userData.user.id;

  console.log("------------> calling rpc function");
  const { data: profInsert, error: profInsertError } = await supabase.rpc(
    "insert_user_into_respective_table",
    { user_type: "professor", user_id: userID }
  );

  if (profInsertError) {
    console.error(profInsertError);
    return { error: `Error signing up: ${profInsertError.message}` };
  }

  console.log("-----------------> should be a boolean:", profInsert);

  revalidatePath("/", "layout");
  isProfessorEmail ? redirect("/classes") : redirect("/student");
}
