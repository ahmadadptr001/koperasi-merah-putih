// app/api/savings-accounts/route.ts

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

// GET /api/savings-accounts
export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth();
    const profile = await getUserProfile(authUser.id);

    const url = new URL(req.url);
    const { page, pageSize, from, to } = parsePagination(url);
    const memberId = url.searchParams.get("memberId");
    const accountType = url.searchParams.get("accountType");
    const status = url.searchParams.get("status");
    const search = url.searchParams.get("search") || "";

    const supabase = await createSupabaseServerClient();
    let query = supabase.from("savings_accounts").select(
      `
        *,
        member:members(id, member_number, full_name, phone, status)
      `,
      { count: "exact" },
    );

    // Anggota hanya lihat rekening miliknya
    if (profile?.role === "anggota") {
      const { data: member } = await supabase
        .from("members")
        .select("id")
        .eq("user_id", authUser.id)
        .single();
      if (!member)
        return successResponse({
          data: [],
          total: 0,
          page,
          pageSize,
          totalPages: 0,
        });
      query = query.eq("member_id", member.id);
    }

    if (memberId) query = query.eq("member_id", memberId);
    if (accountType) query = query.eq("account_type", accountType);
    if (status) query = query.eq("status", status);
    if (search) {
      query = query.or(`account_number.ilike.%${search}%`);
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

// POST /api/savings-accounts — Buka rekening simpanan baru
export async function POST(req: NextRequest) {
  try {
    const { profile } = await requireAdminOrPengurus();

    const body = await req.json();
    const { member_id, account_type, notes } = body;

    if (!member_id) return errorResponse("ID anggota wajib diisi", 400);
    if (!account_type)
      return errorResponse("Jenis simpanan wajib dipilih", 400);
    if (!["pokok", "wajib", "sukarela"].includes(account_type)) {
      return errorResponse("Jenis simpanan tidak valid", 400);
    }

    const supabase = await createSupabaseServerClient();

    // Verifikasi anggota
    const { data: member } = await supabase
      .from("members")
      .select("id, status, full_name")
      .eq("id", member_id)
      .single();
    if (!member) return errorResponse("Anggota tidak ditemukan", 404);
    if (member.status !== "active")
      return errorResponse("Anggota tidak aktif", 422);

    // Cek: anggota tidak boleh punya 2 rekening jenis yang sama (kecuali sukarela)
    if (account_type !== "sukarela") {
      const { data: existingAccount } = await supabase
        .from("savings_accounts")
        .select("id")
        .eq("member_id", member_id)
        .eq("account_type", account_type)
        .in("status", ["active", "inactive"])
        .single();

      if (existingAccount) {
        const typeLabel =
          account_type === "pokok" ? "Simpanan Pokok" : "Simpanan Wajib";
        return errorResponse(
          `Anggota sudah memiliki rekening ${typeLabel}`,
          409,
        );
      }
    }

    // Generate nomor rekening
    const { data: accountNumber } = await supabase.rpc(
      "generate_savings_account_number",
      { p_type: account_type },
    );

    const { data, error } = await supabase
      .from("savings_accounts")
      .insert({
        member_id,
        account_number: accountNumber as string,
        account_type,
        balance: 0,
        status: "active",
        notes,
      })
      .select("*, member:members(id, member_number, full_name)")
      .single();

    if (error) return errorResponse(error.message);

    return successResponse(data, "Rekening simpanan berhasil dibuka", 201);
  } catch (err) {
    return handleApiError(err);
  }
}
