// proxy.ts di root project — WAJIB ADA
// Next.js 16: konvensi `middleware` sudah deprecated dan diganti `proxy`.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Halaman yang wajib login. */
const PROTECTED_PREFIXES = ["/dashboard"];

/**
 * Halaman autentikasi yang tidak boleh diakses saat sudah login.
 * `reset-password` DIKECUALIKAN: tautan pemulihan sandi justru membuat sesi
 * aktif, jadi kalau ikut dialihkan pengguna tidak akan pernah bisa mengganti
 * sandinya.
 */
const AUTH_PREFIX = "/autentikasi";
const AUTH_ALLOWED_WHILE_SIGNED_IN = ["/autentikasi/reset-password"];

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // WAJIB — refresh session agar cookie tidak expire
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Route API mengurus otorisasinya sendiri dan harus tetap mengembalikan
  // JSON, bukan redirect HTML.
  const isApi = pathname.startsWith("/api");

  if (!isApi) {
    const isProtected = PROTECTED_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );

    // Belum login tapi membuka halaman dashboard → antar ke halaman masuk.
    // Sebelumnya tidak ada penjagaan apa pun: /dashboard tetap terbuka tanpa
    // sesi, dan setelah logout layar dashboard masih menampilkan data lama.
    if (!user && isProtected) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/autentikasi/masuk";
      redirectUrl.search = "";
      // Simpan tujuan awal supaya bisa dilanjutkan setelah login.
      redirectUrl.searchParams.set("next", pathname);
      return copyCookies(supabaseResponse, NextResponse.redirect(redirectUrl));
    }

    // Sudah login tapi membuka halaman masuk/daftar → langsung ke dashboard.
    const isAuthPage =
      pathname === AUTH_PREFIX || pathname.startsWith(`${AUTH_PREFIX}/`);
    const isAuthPageAllowed = AUTH_ALLOWED_WHILE_SIGNED_IN.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );

    if (user && isAuthPage && !isAuthPageAllowed) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/dashboard";
      redirectUrl.search = "";
      return copyCookies(supabaseResponse, NextResponse.redirect(redirectUrl));
    }
  }

  return supabaseResponse;
}

/**
 * Pindahkan cookie hasil refresh sesi ke response redirect.
 * Tanpa ini token yang baru di-refresh hilang dan pengguna bisa terjebak
 * dalam siklus redirect.
 */
function copyCookies(
  from: NextResponse,
  to: NextResponse,
): NextResponse {
  from.cookies.getAll().forEach((cookie) => to.cookies.set(cookie));
  return to;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
