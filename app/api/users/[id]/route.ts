export async function GET(id: string) {
  const supabase = await createSupabaseServerClient();
  return supabase
    .from("users")
    .select(`*, member:members(id, member_number, full_name, status)`)
    .eq("id", id)
    .single();
}
