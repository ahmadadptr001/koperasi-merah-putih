// app/api/members/route.ts

import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase";
import {
  successResponse,
  errorResponse,
  handleApiError,
  requireAdminOrPengurus,
  parsePagination,
} from "@/lib/api-helpers";
import type { MemberInsert } from "@/types/database";

// GET /api/members
// Query params: page, pageSize, search, status
export async function GET(req: NextRequest) {
  try {
    await requireAdminOrPengurus();

    const url = new URL(req.url);
    const { page, pageSize, from, to } = parsePagination(url);
    const search = url.searchParams.get("search") || "";
    const status = url.searchParams.get("status");
    const sortBy = url.searchParams.get("sortBy") || "created_at";
    const sortOrder = url.searchParams.get("sortOrder") !== "asc";

    const supabase = await createSupabaseServerClient();
    let query = supabase.from("members").select(
      `
        *,
        user:users(id, email, role, is_active),
        savings_accounts(id, account_type, balance, status)
      `,
      { count: "exact" },
    );

    if (search) {
      query = query.or(
        `full_name.ilike.%${search}%,member_number.ilike.%${search}%,nik.ilike.%${search}%,phone.ilike.%${search}%`,
      );
    }
    if (status) {
      query = query.eq("status", status);
    }

    const { data, error, count } = await query
      .order(sortBy, { ascending: !sortOrder })
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

// POST /api/members
export async function POST(req: NextRequest) {
  try {
    const { profile } = await requireAdminOrPengurus();

    const body: MemberInsert = await req.json();

    // Validasi wajib
    if (!body.full_name?.trim()) {
      return errorResponse("Nama lengkap wajib diisi", 400);
    }

    const supabase = await createSupabaseServerClient();

    // Generate nomor anggota otomatis jika tidak ada
    let memberNumber = body.member_number;
    if (!memberNumber) {
      const { data: numData } = await supabase.rpc("generate_member_number");
      memberNumber = numData as string;
    }

    // Cek duplikasi NIK
    if (body.nik) {
      const { data: existing } = await supabase
        .from("members")
        .select("id")
        .eq("nik", body.nik)
        .single();
      if (existing) return errorResponse("NIK sudah terdaftar", 409);
    }

    const { data, error } = await supabase
      .from("members")
      .insert({
        ...body,
        member_number: memberNumber,
        created_by: profile.id,
        status: body.status || "active",
      })
      .select(`*, user:users(id, email, role)`)
      .single();

    if (error) return errorResponse(error.message);

    return successResponse(data, "Anggota berhasil ditambahkan", 201);
  } catch (err) {
    return handleApiError(err);
  }
}
