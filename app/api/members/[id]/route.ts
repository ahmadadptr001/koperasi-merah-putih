// app/api/members/[id]/route.ts
import { NextRequest } from "next/server";
import {
  getMemberById,
  updateMember,
  deleteMember,
} from "@/services/memberService";
import { ok, notFound, badRequest, serverError } from "@/lib/api-response";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const result = await getMemberById(id);
    if (result.error) return notFound(result.error);
    return ok(result.data);
  } catch (e) {
    return serverError(e);
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();
    if (!id) return badRequest("ID tidak valid");

    const result = await updateMember(id, body);
    if (result.error) return serverError(result.error);
    return ok(result.data, result.message);
  } catch (e) {
    return serverError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const result = await deleteMember(id);
    if (result.error) return serverError(result.error);
    return ok(null, result.message);
  } catch (e) {
    return serverError(e);
  }
}
