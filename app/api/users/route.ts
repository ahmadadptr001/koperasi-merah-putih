// app/api/users/route.ts
import { NextRequest } from "next/server";
import {
  getUsers,
  createUserWithAuth,
  updateUser,
  deleteUserWithAuth,
} from "@/services/userService";
import { supabaseAdmin } from "@/lib/supabase/server";
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

/**
 * POST /api/users
 * Terima multipart/form-data:
 *   - email, full_name, password, role (wajib)
 *   - phone (opsional)
 *   - avatar: File (opsional)
 *
 * Alur atomik — jika ada step yang gagal, semua di-rollback:
 *   1. createUserWithAuth → dapat userId
 *   2. Upload avatar ke storage bucket "users"/{userId}/avatar.{ext}
 *   3. updateUser dengan avatar_url
 *
 * Jika step 2 atau 3 gagal → deleteUserWithAuth (cascade hapus public.users juga)
 */
export async function POST(req: NextRequest) {
  let userId: string | null = null;
  let avatarStoragePath: string | null = null;

  try {
    const formData = await req.formData();

    const email = formData.get("email") as string | null;
    const full_name = formData.get("full_name") as string | null;
    const password = formData.get("password") as string | null;
    const phone = formData.get("phone") as string | null;
    const role = formData.get("role") as UserRole | null;
    const avatarFile = formData.get("avatar") as File | null;

    // ── Validasi wajib ──────────────────────────────────────────────────────
    if (!email) return badRequest("email wajib diisi");
    if (!full_name) return badRequest("full_name wajib diisi");
    if (!password) return badRequest("password wajib diisi");

    const validRoles: UserRole[] = ["admin", "pengurus", "anggota"];
    if (role && !validRoles.includes(role)) {
      return badRequest(`role harus salah satu dari: ${validRoles.join(", ")}`);
    }

    // ── Step 1: Buat auth user + public.users ───────────────────────────────
    const createResult = await createUserWithAuth({
      email,
      full_name,
      password,
      phone: phone || null,
      role: role ?? "anggota",
    });

    if (createResult.error || !createResult.data) {
      return serverError(createResult.error ?? "Gagal membuat akun");
    }

    userId = createResult.data.id;

    // ── Step 2: Upload avatar (jika ada) ────────────────────────────────────
    let avatarUrl: string | null = null;

    if (avatarFile && avatarFile.size > 0) {
      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!allowedTypes.includes(avatarFile.type)) {
        await deleteUserWithAuth(userId); // rollback
        return badRequest(
          "Format avatar tidak didukung. Gunakan JPG, PNG, atau WebP.",
        );
      }
      if (avatarFile.size > 2 * 1024 * 1024) {
        await deleteUserWithAuth(userId); // rollback
        return badRequest("Ukuran avatar maksimal 2 MB.");
      }

      const ext = avatarFile.name.split(".").pop() ?? "jpg";
      avatarStoragePath = `${userId}/avatar.${ext}`;

      const buffer = Buffer.from(await avatarFile.arrayBuffer());

      const { error: uploadError } = await supabaseAdmin.storage
        .from("users")
        .upload(avatarStoragePath, buffer, {
          contentType: avatarFile.type,
          upsert: true,
        });

      if (uploadError) {
        await deleteUserWithAuth(userId); // rollback
        return serverError(`Upload avatar gagal: ${uploadError.message}`);
      }

      const { data: urlData } = supabaseAdmin.storage
        .from("users")
        .getPublicUrl(avatarStoragePath);

      avatarUrl = urlData.publicUrl;
    }

    // ── Step 3: Update avatar_url ke public.users (jika ada avatar) ─────────
    if (avatarUrl) {
      const updateResult = await updateUser(userId, { avatar_url: avatarUrl });

      if (updateResult.error) {
        // Rollback: hapus file storage + auth user
        await supabaseAdmin.storage.from("users").remove([avatarStoragePath!]);
        await deleteUserWithAuth(userId);
        return serverError(updateResult.error);
      }

      return created(updateResult.data, createResult.message);
    }

    return created(createResult.data, createResult.message);
  } catch (e) {
    // Safety net — rollback jika userId sudah terbuat
    if (userId) {
      await deleteUserWithAuth(userId).catch(() => {});
      if (avatarStoragePath) {
        await supabaseAdmin.storage
          .from("users")
          .remove([avatarStoragePath])
          .catch(() => {});
      }
    }
    return serverError(e);
  }
}
