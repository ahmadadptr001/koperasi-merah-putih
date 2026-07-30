// app/api/members/route.ts
import { NextRequest } from "next/server";
import { getMembers, createMember } from "@/services/memberService";
import { okList, created, badRequest, serverError } from "@/lib/api-response";
import type { MemberStatus, MemberGender } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const result = await getMembers({
      status: (searchParams.get("status") as MemberStatus) || undefined,
      search: searchParams.get("search") || undefined,
      user_id: searchParams.get("user_id") || undefined,
      limit: searchParams.get("limit")
        ? Number(searchParams.get("limit"))
        : undefined,
      offset: searchParams.get("offset")
        ? Number(searchParams.get("offset"))
        : undefined,
    });
    if (result.error) return serverError(result.error);
    return okList(result.data, result.total);
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validasi field wajib
    if (!body.full_name) return badRequest("full_name wajib diisi");
    if (!body.join_date) return badRequest("join_date wajib diisi");

    const result = await createMember({
      user_id: body.user_id ?? null,
      full_name: body.full_name,
      nik: body.nik ?? null,
      birth_date: body.birth_date ?? null,
      gender: (body.gender as MemberGender) ?? null,
      address: body.address ?? null,
      phone: body.phone ?? null,
      email: body.email ?? null,
      occupation: body.occupation ?? null,
      join_date: body.join_date,
      status: body.status ?? "active",
      photo_url: body.photo_url ?? null,
      notes: body.notes ?? null,
      area: body.area ?? null,
      created_by: body.created_by ?? null,
    });

    if (result.error) return serverError(result.error);
    return created(result.data, result.message);
  } catch (e) {
    return serverError(e);
  }
}
