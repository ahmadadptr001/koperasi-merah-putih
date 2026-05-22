// lib/api-response.ts
// Helper untuk membuat NextResponse yang konsisten di semua route handler

import { NextResponse } from "next/server";

export function ok<T>(data: T, message?: string, status = 200) {
  return NextResponse.json(
    { data, error: null, message: message ?? null },
    { status },
  );
}

export function okList<T>(data: T[], total: number) {
  return NextResponse.json({ data, total, error: null }, { status: 200 });
}

export function created<T>(data: T, message?: string) {
  return ok(data, message ?? "Berhasil dibuat", 201);
}

export function badRequest(message: string) {
  return NextResponse.json({ data: null, error: message }, { status: 400 });
}

export function notFound(message = "Data tidak ditemukan") {
  return NextResponse.json({ data: null, error: message }, { status: 404 });
}

export function serverError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return NextResponse.json({ data: null, error: message }, { status: 500 });
}
