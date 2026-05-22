// app/api/users/route.ts

import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase";
import {
  successResponse,
  errorResponse,
  handleApiError,
  requireAuth,
  getUserProfile,
  requireAdminOrPengurus,
  parsePagination,
} from "@/lib/api-helpers";

// GET /api/users
export async function GET(req: NextRequest) {
  try {
    await requireAdminOrPengurus();

    const url = new URL(req.url);
    const { page, pageSize, from, to } = parsePagination(url);
    const search = url.searchParams.get("search") || "";
    const role = url.searchParams.get("role");
    const isActive = url.searchParams.get("isActive");

    const supabase = await createSupabaseServerClient();
    let query = supabase.from("users").select("*", { count: "exact" });

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }
    if (role) query = query.eq("role", role);
    if (isActive !== null && isActive !== undefined) {
      query = query.eq("is_active", isActive === "true");
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) return errorResponse(error.message);

    return successResponse({
      data,
      total: count ?? 0,
      page,
      pageSize,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
