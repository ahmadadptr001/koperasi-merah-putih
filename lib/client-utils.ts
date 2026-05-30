import { supabaseBrowser } from "./supabase/client";

export async function getCurrentUserId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabaseBrowser.auth.getUser();
  return user?.id || null;
}
