import type {
  User,
  UserInsert,
  UserUpdate,
  ApiResponse,
  ApiListResponse,
  UserRole,
  UserStatus,
} from "@/lib/types";

const BASE = "/api/users";

interface GetUsersParams {
  role?: UserRole;
  status?: UserStatus;
  search?: string;
}

export const userService = {
  // GET /api/users
  async getAll(params?: GetUsersParams): Promise<ApiListResponse<User>> {
    const url = new URL(BASE, window.location.origin);
    if (params?.role) url.searchParams.set("role", params.role);
    if (params?.status) url.searchParams.set("status", params.status);
    if (params?.search) url.searchParams.set("search", params.search);

    const res = await fetch(url.toString());
    return res.json();
  },

  // GET /api/users/[id]
  async getById(id: string): Promise<ApiResponse<User>> {
    const res = await fetch(`${BASE}/${id}`);
    return res.json();
  },

  // POST /api/users
  async create(payload: UserInsert): Promise<ApiResponse<User>> {
    const res = await fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  // PUT /api/users/[id]
  async update(id: string, payload: UserUpdate): Promise<ApiResponse<User>> {
    const res = await fetch(`${BASE}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  // DELETE /api/users/[id]
  async remove(id: string): Promise<ApiResponse<null>> {
    const res = await fetch(`${BASE}/${id}`, { method: "DELETE" });
    return res.json();
  },
};
