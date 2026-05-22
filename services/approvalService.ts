import type {
  Approval,
  ApprovalInsert,
  ApprovalUpdate,
  ApiResponse,
  ApiListResponse,
  ApprovalCategory,
  ApprovalStatus,
  ApprovalPriority,
  DocumentStatus,
} from "@/lib/types";

const BASE = "/api/approvals";

interface GetApprovalsParams {
  member_id?: string;
  category?: ApprovalCategory;
  status?: ApprovalStatus;
  priority?: ApprovalPriority;
  reviewed_by?: string;
  from?: string;
  to?: string;
}

export interface ReviewPayload {
  status: ApprovalStatus;
  reviewed_by: string;
  reviewed_at?: string;
}

export interface UpdateDocumentPayload {
  document_status: DocumentStatus;
}

export const approvalService = {
  // GET /api/approvals
  async getAll(
    params?: GetApprovalsParams,
  ): Promise<ApiListResponse<Approval>> {
    const url = new URL(BASE, window.location.origin);
    if (params?.member_id) url.searchParams.set("member_id", params.member_id);
    if (params?.category) url.searchParams.set("category", params.category);
    if (params?.status) url.searchParams.set("status", params.status);
    if (params?.priority) url.searchParams.set("priority", params.priority);
    if (params?.reviewed_by)
      url.searchParams.set("reviewed_by", params.reviewed_by);
    if (params?.from) url.searchParams.set("from", params.from);
    if (params?.to) url.searchParams.set("to", params.to);

    const res = await fetch(url.toString());
    return res.json();
  },

  // GET /api/approvals/[id]
  async getById(id: string): Promise<ApiResponse<Approval>> {
    const res = await fetch(`${BASE}/${id}`);
    return res.json();
  },

  // POST /api/approvals
  async create(payload: ApprovalInsert): Promise<ApiResponse<Approval>> {
    const res = await fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  // PUT /api/approvals/[id]
  async update(
    id: string,
    payload: ApprovalUpdate,
  ): Promise<ApiResponse<Approval>> {
    const res = await fetch(`${BASE}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  // DELETE /api/approvals/[id]
  async remove(id: string): Promise<ApiResponse<null>> {
    const res = await fetch(`${BASE}/${id}`, { method: "DELETE" });
    return res.json();
  },

  // Shorthand: review sebuah approval (approve / reject / revision)
  async review(
    id: string,
    payload: ReviewPayload,
  ): Promise<ApiResponse<Approval>> {
    return approvalService.update(id, {
      status: payload.status,
      reviewed_by: payload.reviewed_by,
      reviewed_at: payload.reviewed_at ?? new Date().toISOString(),
    });
  },

  // Shorthand: update hanya status dokumen
  async updateDocumentStatus(
    id: string,
    payload: UpdateDocumentPayload,
  ): Promise<ApiResponse<Approval>> {
    return approvalService.update(id, {
      document_status: payload.document_status,
    });
  },

  // Shorthand: approve
  async approve(
    id: string,
    reviewedBy: string,
  ): Promise<ApiResponse<Approval>> {
    return approvalService.review(id, {
      status: "approved",
      reviewed_by: reviewedBy,
    });
  },

  // Shorthand: reject
  async reject(id: string, reviewedBy: string): Promise<ApiResponse<Approval>> {
    return approvalService.review(id, {
      status: "rejected",
      reviewed_by: reviewedBy,
    });
  },

  // Shorthand: minta revisi
  async requestRevision(
    id: string,
    reviewedBy: string,
  ): Promise<ApiResponse<Approval>> {
    return approvalService.review(id, {
      status: "revision",
      reviewed_by: reviewedBy,
    });
  },

  // Helper: filter hanya yang pending (untuk dashboard notifikasi pengurus)
  async getPending(
    params?: Omit<GetApprovalsParams, "status">,
  ): Promise<ApiListResponse<Approval>> {
    return approvalService.getAll({ ...params, status: "pending" });
  },

  // Helper: filter berdasarkan reviewer (untuk riwayat review pengurus)
  async getReviewedBy(
    userId: string,
    params?: Omit<GetApprovalsParams, "reviewed_by">,
  ): Promise<ApiListResponse<Approval>> {
    return approvalService.getAll({ ...params, reviewed_by: userId });
  },
};
