import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { okList, created, badRequest, serverError } from "@/lib/api-response";
import type { ApprovalInsert } from "@/lib/types";

// GET /api/approvals
// Query params: member_id, category, status, priority, reviewed_by, from, to
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const member_id = searchParams.get("member_id");
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const reviewed_by = searchParams.get("reviewed_by");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    let query = supabase
      .from("approvals")
      .select(
        "*, members(member_code, name), users!approvals_reviewed_by_fkey(name)",
        { count: "exact" },
      )
      .order("submitted_at", { ascending: false });

    if (member_id) query = query.eq("member_id", member_id);
    if (category) query = query.eq("category", category);
    if (status) query = query.eq("status", status);
    if (priority) query = query.eq("priority", priority);
    if (reviewed_by) query = query.eq("reviewed_by", reviewed_by);
    if (from) query = query.gte("submitted_at", from);
    if (to) query = query.lte("submitted_at", to);

    const { data, error, count } = await query;
    if (error) return serverError(error);
    return okList(data ?? [], count ?? 0);
  } catch (err) {
    return serverError(err);
  }
}

// POST /api/approvals
export async function POST(req: NextRequest) {
  try {
    const body: ApprovalInsert = await req.json();

    if (!body.member_id || !body.category) {
      return badRequest("Field member_id dan category wajib diisi");
    }

    const { data, error } = await supabase
      .from("approvals")
      .insert({
        ...body,
        approval_code:
          body.approval_code ?? generateApprovalCode(body.category),
        status: body.status ?? "pending",
        document_status: body.document_status ?? "incomplete",
        submitted_at: body.submitted_at ?? new Date().toISOString(),
      })
      .select()
      .single();

    if (error) return serverError(error);
    return created(data, "Pengajuan persetujuan berhasil dibuat");
  } catch (err) {
    return serverError(err);
  }
}

function generateApprovalCode(category: string): string {
  const prefix: Record<string, string> = {
    pinjaman: "APR-LN",
    simpanan: "APR-SV",
    anggota: "APR-MB",
    lainnya: "APR-OT",
  };
  const now = new Date();
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix[category] ?? "APR"}-${yyyymm}-${rand}`;
}
