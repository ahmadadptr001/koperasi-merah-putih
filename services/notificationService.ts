import type {
  UserNotificationPref,
  UserNotificationPrefInsert,
  UserNotificationPrefUpdate,
  ApiResponse,
  ApiListResponse,
} from "@/lib/types";

const BASE = "/api/notification-prefs";

interface GetNotifsParams {
  user_id?: string;
}

export interface TogglePayload {
  email_enabled?: boolean;
  sms_enabled?: boolean;
  push_enabled?: boolean;
  approval_enabled?: boolean;
}

export const notificationService = {
  // GET /api/notification-prefs
  async getAll(
    params?: GetNotifsParams,
  ): Promise<ApiListResponse<UserNotificationPref>> {
    const url = new URL(BASE, window.location.origin);
    if (params?.user_id) url.searchParams.set("user_id", params.user_id);

    const res = await fetch(url.toString());
    return res.json();
  },

  // GET /api/notification-prefs/[id]
  async getById(id: string): Promise<ApiResponse<UserNotificationPref>> {
    const res = await fetch(`${BASE}/${id}`);
    return res.json();
  },

  // Helper: ambil preferensi berdasarkan user_id (langsung return single record)
  async getByUserId(
    userId: string,
  ): Promise<ApiResponse<UserNotificationPref | null>> {
    const result = await notificationService.getAll({ user_id: userId });
    if (result.error) return { data: null, error: result.error };
    return { data: result.data[0] ?? null, error: null };
  },

  // POST /api/notification-prefs
  async create(
    payload: UserNotificationPrefInsert,
  ): Promise<ApiResponse<UserNotificationPref>> {
    const res = await fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  // PUT /api/notification-prefs/[id]
  async update(
    id: string,
    payload: UserNotificationPrefUpdate,
  ): Promise<ApiResponse<UserNotificationPref>> {
    const res = await fetch(`${BASE}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  // DELETE /api/notification-prefs/[id]
  async remove(id: string): Promise<ApiResponse<null>> {
    const res = await fetch(`${BASE}/${id}`, { method: "DELETE" });
    return res.json();
  },

  // Helper: toggle satu atau beberapa channel notifikasi berdasarkan id record
  async toggle(
    id: string,
    payload: TogglePayload,
  ): Promise<ApiResponse<UserNotificationPref>> {
    return notificationService.update(id, payload);
  },

  // Helper: inisialisasi preferensi default untuk user baru
  async initForUser(
    userId: string,
  ): Promise<ApiResponse<UserNotificationPref>> {
    return notificationService.create({
      user_id: userId,
      email_enabled: true,
      sms_enabled: false,
      push_enabled: true,
      approval_enabled: true,
    });
  },

  // Helper: ambil preferensi user, jika belum ada buat default
  async getOrInitByUserId(
    userId: string,
  ): Promise<ApiResponse<UserNotificationPref>> {
    const existing = await notificationService.getByUserId(userId);

    if (existing.data) return { data: existing.data, error: null };

    // Belum ada → buat default
    return notificationService.initForUser(userId);
  },
};
