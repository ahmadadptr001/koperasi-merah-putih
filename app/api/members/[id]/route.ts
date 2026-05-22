// app/api/members/[id]/route.ts

import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  handleApiError,
  requireAdminOrPengurus,
  getAuthenticatedUser,
  getUserProfile,
} from "@/lib/api-helpers";
import type { MemberUpdate } from "@/types/database";

// GET /api/members/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const authUser = await getAuthenticatedUser();
    if (!authUser) return errorResponse("Tidak memiliki akses", 401);

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("members")
      .select(
        `
        *,
        user:users(id, email, role, is_active),
        savings_accounts(
          id, account_number, account_type, balance, status, opened_date
        ),
        loans(
          id, loan_number, amount, status, monthly_payment,
          remaining_amount, disbursement_date, due_date
        )
      `,
      )
      .eq("id", id)
      .single();

    if (error || !data) return notFoundResponse("Anggota");

    // Anggota biasa hanya boleh lihat data sendiri
    const profile = await getUserProfile(authUser.id);
    if (profile?.role === "anggota" && data.user_id !== authUser.id) {
      return errorResponse("Akses ditolak", 403);
    }

    return successResponse(data);
  } catch (err) {
    return handleApiError(err);
  }
}

// PUT /api/members/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await requireAdminOrPengurus();

    const body: MemberUpdate = await req.json();
    const supabase = await createSupabaseServerClient();

    // Cek duplikasi NIK jika diubah
    if (body.nik) {
      const { data: existing } = await supabase
        .from("members")
        .select("id")
        .eq("nik", body.nik)
        .neq("id", id)
        .single();
      if (existing)
        return errorResponse("NIK sudah terdaftar oleh anggota lain", 409);
    }

    const { data, error } = await supabase
      .from("members")
      .update(body)
      .eq("id", id)
      .select(`*, user:users(id, email, role)`)
      .single();

    if (error) return errorResponse(error.message);
    if (!data) return notFoundResponse("Anggota");

    return successResponse(data, "Data anggota berhasil diperbarui");
  } catch (err) {
    return handleApiError(err);
  }
}

// DELETE /api/members/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { profile } = await requireAdminOrPengurus();

    // Hanya admin yang bisa hapus
    if (profile.role !== "admin") {
      return errorResponse("Hanya admin yang dapat menghapus anggota", 403);
    }

    const supabase = await createSupabaseServerClient();

    // Cek apakah ada pinjaman aktif
    const { data: activeLoans } = await supabase
      .from("loans")
      .select("id")
      .eq("member_id", id)
      .in("status", ["active", "overdue"]);

    if (activeLoans && activeLoans.length > 0) {
      return errorResponse(
        "Tidak dapat menghapus anggota yang masih memiliki pinjaman aktif",
        422,
      );
    }

    // Soft delete - ubah status menjadi inactive
    const { data, error } = await supabase
      .from("members")
      .update({ status: "inactive" })
      .eq("id", id)
      .select()
      .single();

    if (error) return errorResponse(error.message);
    if (!data) return notFoundResponse("Anggota");

    return successResponse(data, "Anggota berhasil dinonaktifkan");
  } catch (err) {
    return handleApiError(err);
  }
}
