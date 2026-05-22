// lib/api-helpers.ts
// Utilitas untuk response API yang konsisten

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "./supabase";
import type { ApiResponse } from "@/types/database";

// ---- Response Helpers ----

export function successResponse<T>(data: T, message?: string, status = 200) {
  return NextResponse.json<ApiResponse<T>>(
    { success: true, data, message },
    { status },
  );
}

export function errorResponse(error: string, status = 500) {
  return NextResponse.json<ApiResponse>({ success: false, error }, { status });
}

export function notFoundResponse(resource = "Data") {
  return errorResponse(`${resource} tidak ditemukan`, 404);
}

export function unauthorizedResponse() {
  return errorResponse("Tidak memiliki akses", 401);
}

export function forbiddenResponse() {
  return errorResponse("Akses ditolak", 403);
}

export function validationErrorResponse(message: string) {
  return errorResponse(message, 400);
}

// ---- Auth Helpers ----

export async function getAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function requireAuth() {
  const user = await getAuthenticatedUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

export async function getUserProfile(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();
  if (error || !data) return null;
  return data;
}

export async function requireAdminOrPengurus() {
  const user = await requireAuth();
  const profile = await getUserProfile(user.id);
  if (!profile || !["admin", "pengurus"].includes(profile.role)) {
    throw new ForbiddenError();
  }
  return { user, profile };
}

// ---- Pagination Helper ----

export function parsePagination(url: URL) {
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get("pageSize") || "10")),
  );
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  return { page, pageSize, from, to };
}

// ---- Custom Errors ----

export class UnauthorizedError extends Error {
  constructor() {
    super("Tidak memiliki akses");
  }
}

export class ForbiddenError extends Error {
  constructor() {
    super("Akses ditolak");
  }
}

export class NotFoundError extends Error {
  constructor(resource?: string) {
    super(`${resource || "Data"} tidak ditemukan`);
  }
}

// ---- Error Handler ----

export function handleApiError(error: unknown) {
  console.error("[API Error]", error);
  if (error instanceof UnauthorizedError) return unauthorizedResponse();
  if (error instanceof ForbiddenError) return forbiddenResponse();
  if (error instanceof NotFoundError) return notFoundResponse(error.message);
  if (error instanceof Error) return errorResponse(error.message);
  return errorResponse("Terjadi kesalahan server");
}
