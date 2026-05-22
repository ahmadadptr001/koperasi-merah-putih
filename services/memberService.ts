import type {
  Member,
  MemberInsert,
  MemberUpdate,
  ApiResponse,
  ApiListResponse,
  MemberStatus,
  MemberType,
} from "@/lib/types";

const BASE = "/api/members";

interface GetMembersParams {
  status?: MemberStatus;
  member_type?: MemberType;
  area?: string;
  search?: string;
  user_id?: string;
}

export const memberService = {
  // GET /api/members
  async getAll(params?: GetMembersParams): Promise<ApiListResponse<Member>> {
    const url = new URL(BASE, window.location.origin);
    if (params?.status) url.searchParams.set("status", params.status);
    if (params?.member_type)
      url.searchParams.set("member_type", params.member_type);
    if (params?.area) url.searchParams.set("area", params.area);
    if (params?.search) url.searchParams.set("search", params.search);
    if (params?.user_id) url.searchParams.set("user_id", params.user_id);

    const res = await fetch(url.toString());
    return res.json();
  },

  // GET /api/members/[id]
  async getById(id: string): Promise<ApiResponse<Member>> {
    const res = await fetch(`${BASE}/${id}`);
    return res.json();
  },

  // POST /api/members
  async create(payload: MemberInsert): Promise<ApiResponse<Member>> {
    const res = await fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  // PUT /api/members/[id]
  async update(
    id: string,
    payload: MemberUpdate,
  ): Promise<ApiResponse<Member>> {
    const res = await fetch(`${BASE}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  // DELETE /api/members/[id]
  async remove(id: string): Promise<ApiResponse<null>> {
    const res = await fetch(`${BASE}/${id}`, { method: "DELETE" });
    return res.json();
  },
};
