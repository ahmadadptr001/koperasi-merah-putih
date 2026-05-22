// app/api/users/route.ts
import { NextRequest } from "next/server";
import { getUsers, createUser } from "@/services/userService";
import { okList, created, badRequest, serverError } from "@/lib/api-response";
import type { UserRole } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const result = await getUsers({
      role: (searchParams.get("role") as UserRole) || undefined,
      is_active: searchParams.has("is_active")
        ? searchParams.get("is_active") === "true"
        : undefined,
      search: searchParams.get("search") || undefined,
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
    if (!body.email) return badRequest("email wajib diisi");
    if (!body.full_name) return badRequest("full_name wajib diisi");

    const validRoles: UserRole[] = ["admin", "pengurus", "anggota"];
    if (body.role && !validRoles.includes(body.role)) {
      return badRequest(`role harus salah satu dari: ${validRoles.join(", ")}`);
    }

    const result = await createUser({
      id: body.id, // UUID dari auth.users harus sudah ada
      email: body.email,
      full_name: body.full_name,
      phone: body.phone ?? null,
      role: body.role ?? "anggota",
      avatar_url: body.avatar_url ?? null,
      is_active: body.is_active ?? true,
    });

    if (result.error) return serverError(result.error);
    return created(result.data, result.message);
  } catch (e) {
    return serverError(e);
  }
}
