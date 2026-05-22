import { NextResponse } from "next/server";
import type { ApiResponse, ApiListResponse } from "./types";

export function ok<T>(data: T, message?: string): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ data, error: null, message }, { status: 200 });
}

export function created<T>(
  data: T,
  message?: string,
): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ data, error: null, message }, { status: 201 });
}

export function okList<T>(
  data: T[],
  total: number,
): NextResponse<ApiListResponse<T>> {
  return NextResponse.json({ data, total, error: null }, { status: 200 });
}

export function notFound(
  message = "Data tidak ditemukan",
): NextResponse<ApiResponse<null>> {
  return NextResponse.json({ data: null, error: message }, { status: 404 });
}

export function badRequest(message: string): NextResponse<ApiResponse<null>> {
  return NextResponse.json({ data: null, error: message }, { status: 400 });
}

export function serverError(err: unknown): NextResponse<ApiResponse<null>> {
  const message = err instanceof Error ? err.message : "Internal server error";
  console.error("[API Error]", err);
  return NextResponse.json({ data: null, error: message }, { status: 500 });
}
