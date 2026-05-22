// app/api/users/[id]/route.ts
import { NextRequest } from "next/server";
import {
  getUserById,
  updateUser,
  setUserRole,
  toggleUserActive,
} from "@/services/userService";
import { ok, notFound, badRequest, serverError } from "@/lib/api-response";
import type { UserRole } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const result = await getUserById(id);
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

    // Shortcut ganti role
    if (body.action === "set_role") {
      if (!body.role) return badRequest("role wajib diisi");
      const validRoles: UserRole[] = ["admin", "pengurus", "anggota"];
      if (!validRoles.includes(body.role)) {
        return badRequest(`role harus: ${validRoles.join(", ")}`);
      }
      const result = await setUserRole(id, body.role as UserRole);
      if (result.error) return serverError(result.error);
      return ok(result.data, result.message);
    }

    // Shortcut toggle aktif
    if (body.action === "toggle_active") {
      if (body.is_active === undefined)
        return badRequest("is_active wajib diisi");
      const result = await toggleUserActive(id, Boolean(body.is_active));
      if (result.error) return serverError(result.error);
      return ok(result.data, result.message);
    }

    // Update biasa
    const result = await updateUser(id, body);
    if (result.error) return serverError(result.error);
    return ok(result.data, result.message);
  } catch (e) {
    return serverError(e);
  }
}
