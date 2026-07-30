"use client";

import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Preferensi "Ingat saya di perangkat ini".
 *
 * true  → cookie sesi diberi Max-Age (tetap ada setelah browser ditutup)
 * false → cookie sesi tanpa Max-Age (terhapus saat browser ditutup)
 */
const REMEMBER_KEY = "auth:remember-me";

/** 30 hari — dipakai bila pengguna memilih "Ingat saya". */
const REMEMBER_MAX_AGE = 60 * 60 * 24 * 30;

export function setRememberMe(remember: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(REMEMBER_KEY, remember ? "1" : "0");
}

/** Default true agar perilaku lama (sesi bertahan) tetap jadi bawaan. */
function shouldRemember(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(REMEMBER_KEY) !== "0";
}

function getAll() {
  if (typeof document === "undefined") return [];

  return document.cookie
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const eq = part.indexOf("=");
      return eq === -1
        ? { name: part, value: "" }
        : {
            name: part.slice(0, eq),
            value: decodeURIComponent(part.slice(eq + 1)),
          };
    });
}

type CookieToSet = {
  name: string;
  value: string;
  options?: {
    path?: string;
    maxAge?: number;
    sameSite?: boolean | "lax" | "strict" | "none";
    domain?: string;
  };
};

function setAll(cookiesToSet: CookieToSet[]) {
  if (typeof document === "undefined") return;

  const remember = shouldRemember();

  for (const { name, value, options } of cookiesToSet) {
    const sameSite =
      typeof options?.sameSite === "string" ? options.sameSite : "Lax";

    const parts = [
      `${name}=${encodeURIComponent(value)}`,
      `path=${options?.path ?? "/"}`,
      `SameSite=${sameSite}`,
    ];

    if (options?.domain) parts.push(`domain=${options.domain}`);

    // Penghapusan cookie (logout) memakai Max-Age=0 / nilai kosong dan HARUS
    // selalu diteruskan — kalau tidak, sesi tidak benar-benar terhapus.
    const isDeletion = options?.maxAge === 0 || value === "";

    if (isDeletion) {
      parts.push("Max-Age=0");
    } else if (remember) {
      parts.push(`Max-Age=${options?.maxAge ?? REMEMBER_MAX_AGE}`);
    }
    // Tanpa Max-Age → cookie sesi, hilang begitu browser ditutup.

    if (window.location.protocol === "https:") parts.push("Secure");

    document.cookie = parts.join("; ");
  }
}

/**
 * Client Supabase untuk browser.
 *
 * PENTING: memakai `createBrowserClient` dari `@supabase/ssr`, bukan
 * `createClient` dari `@supabase/supabase-js`. Versi sebelumnya memakai
 * `createClient`, yang menyimpan sesi di localStorage dan tidak pernah
 * menulis cookie. Padahal `lib/supabase/server.ts` dan `proxy.ts` membaca
 * sesi dari cookie — akibatnya `auth.getUser()` di sisi server selalu null:
 * RLS melihat request sebagai anonim, `loans.requested_by` tersimpan NULL,
 * dan deteksi otomatis member_id di /api/loans tidak pernah berhasil.
 */
export const supabaseBrowser = createBrowserClient(
  supabaseUrl,
  supabaseAnonKey,
  { cookies: { getAll, setAll } },
);
