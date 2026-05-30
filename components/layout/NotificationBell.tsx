"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Bell,
  X,
  AlertCircle,
  Loader2,
  CheckCheck,
  CreditCard,
  Info,
  CheckCircle2,
} from "lucide-react";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import type { Approval } from "@/lib/types";
import Link from "next/link";

type NotifCategory = "transaksi" | "sistem" | "info";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  category: NotifCategory;
  data: Approval;
}

function notifIcon(category: NotifCategory, size = 16) {
  if (category === "transaksi")
    return <CreditCard size={size} className="shrink-0" />;
  if (category === "sistem")
    return <AlertCircle size={size} className="shrink-0" />;
  return <Info size={size} className="shrink-0" />;
}

function notifColors(
  category: NotifCategory,
  isLight: boolean,
): { bg: string; text: string; dot: string } {
  if (category === "transaksi")
    return {
      bg: isLight ? "#EEF4FF" : "#1e2a45",
      text: isLight ? "#3B5BDB" : "#7da5f5",
      dot: "#3B5BDB",
    };
  if (category === "sistem")
    return {
      bg: isLight ? "#FFF4E5" : "#3a2a10",
      text: isLight ? "#E67700" : "#ffa94d",
      dot: "#E67700",
    };
  return {
    bg: isLight ? "#E6FCF5" : "#0e2e20",
    text: isLight ? "#087F5B" : "#63e6be",
    dot: "#087F5B",
  };
}

export function NotificationBell() {
  const colors = useColors();
  const { theme } = useTheme();
  const isLight = theme === "light" || theme === "auto" || !theme;
  const { user } = useAuth();

  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"semua" | "belum dibaca">("semua");

  // LocalStorage untuk dismiss permanen
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("dismissed_notifications");
      return new Set(stored ? JSON.parse(stored) : []);
    }
    return new Set();
  });

  const localReadIdsRef = useRef<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);

  const persistDismissedIds = (ids: Set<string>) => {
    localStorage.setItem(
      "dismissed_notifications",
      JSON.stringify(Array.from(ids)),
    );
  };

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/approvals?limit=50&user_id=${user.id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      let approvals: any[] = json.data ?? [];

      // Filter approval yang sudah di-dismiss
      approvals = approvals.filter((app) => !dismissedIds.has(app.id));

      const items: NotificationItem[] = approvals.map((app) => {
        let category: NotifCategory = "info";
        const ref = app.reference_type as string;

        if (
          ref === "loan" ||
          ref === "loan_disbursement" ||
          ref === "loan_payment" ||
          ref === "savings_withdrawal" ||
          ref === "savings_deposit"
        ) {
          category = "transaksi";
        } else if (
          ref === "member_registration" ||
          ref === "member_update" ||
          ref === "member_status_change"
        ) {
          category = "sistem";
        }

        const titleMap: Record<string, string> = {
          loan: "Pengajuan Pinjaman",
          loan_disbursement: "Pencairan Pinjaman",
          loan_payment: "Pembayaran Pinjaman",
          savings_withdrawal: "Penarikan Simpanan",
          savings_deposit: "Setoran Simpanan",
          member_registration: "Pendaftaran Anggota",
          member_update: "Perubahan Data Anggota",
          member_status_change: "Perubahan Status Anggota",
        };

        const statusLabel: Record<string, string> = {
          pending: "Menunggu",
          approved: "Disetujui",
          rejected: "Ditolak",
          revision: "Perlu Revisi",
        };

        const baseTitle = app.title || titleMap[ref] || "Persetujuan";
        const statusSuffix = statusLabel[app.status]
          ? ` · ${statusLabel[app.status]}`
          : "";

        return {
          id: app.id,
          title: baseTitle,
          message:
            app.description ||
            `${titleMap[ref] ?? "Persetujuan"} memerlukan tindakan`,
          time: new Date(app.created_at).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          }),
          read: app.is_read === true || localReadIdsRef.current.has(app.id),
          category,
          data: app,
        };
      });

      setNotifications(items);
    } catch (err) {
      console.error("Gagal fetch notifikasi:", err);
    } finally {
      setLoading(false);
    }
  }, [user, dismissedIds]);

  useEffect(() => {
    void fetchNotifications();
    const interval = setInterval(() => void fetchNotifications(), 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unread = notifications.filter((n) => !n.read).length;
  const displayed =
    filter === "belum dibaca"
      ? notifications.filter((n) => !n.read)
      : notifications;

  const markAllRead = async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/approvals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_all_read", user_id: user.id }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      notifications.forEach((n) => localReadIdsRef.current.add(n.id));
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error("Gagal mark all read:", err);
    }
  };

  const markOne = async (id: string) => {
    if (!user) return;
    try {
      await fetch("/api/approvals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mark_read",
          approval_id: id,
          user_id: user.id,
        }),
      });
      localReadIdsRef.current.add(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
    } catch (err) {
      console.error("Gagal mark read:", err);
    }
  };

  const dismiss = (id: string) => {
    // Tandai sebagai read di server (opsional)
    if (user) {
      fetch("/api/approvals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mark_read",
          approval_id: id,
          user_id: user.id,
        }),
      }).catch(() => {});
    }
    // Simpan ke dismissedIds dan localStorage
    const newDismissed = new Set(dismissedIds);
    newDismissed.add(id);
    setDismissedIds(newDismissed);
    persistDismissedIds(newDismissed);
    // Hapus dari state notifikasi
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifikasi"
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 38,
          height: 38,
          borderRadius: 12,
          border: `1px solid ${colors.border}`,
          background: open ? colors.surface : colors.background,
          cursor: "pointer",
          transition: "background 0.15s",
        }}
      >
        <Bell size={18} color={colors.textPrimary} />
        {unread > 0 && (
          <span
            style={{
              position: "absolute",
              top: 5,
              right: 5,
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#E03131",
              border: `1.5px solid ${colors.background}`,
            }}
          />
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 360,
            background: colors.background,
            border: `1px solid ${colors.border}`,
            borderRadius: 16,
            boxShadow: isLight
              ? "0 8px 32px rgba(0,0,0,0.12)"
              : "0 8px 32px rgba(0,0,0,0.4)",
            zIndex: 1000,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 16px 10px",
              borderBottom: `1px solid ${colors.border}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  fontWeight: 700,
                  fontSize: 15,
                  color: colors.textPrimary,
                }}
              >
                Notifikasi
              </span>
              {unread > 0 && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    background: "#E03131",
                    color: "#fff",
                    borderRadius: 999,
                    padding: "1px 7px",
                  }}
                >
                  {unread}
                </span>
              )}
            </div>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 12,
                  color: colors.primary,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px 6px",
                  borderRadius: 6,
                }}
              >
                <CheckCheck size={13} /> Tandai semua
              </button>
            )}
          </div>

          {/* Filter tabs */}
          <div style={{ display: "flex", gap: 4, padding: "8px 16px 0" }}>
            {(["semua", "belum dibaca"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                style={{
                  fontSize: 12,
                  fontWeight: filter === tab ? 700 : 400,
                  padding: "4px 12px",
                  borderRadius: 999,
                  border: "none",
                  cursor: "pointer",
                  background: filter === tab ? colors.primary : "transparent",
                  color:
                    filter === tab
                      ? "#fff"
                      : (colors.mutedGray ?? colors.textPrimary),
                  textTransform: "capitalize",
                  transition: "all 0.15s",
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* List */}
          <div style={{ maxHeight: 320, overflowY: "auto", padding: "8px 0" }}>
            {loading ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "32px 16px",
                  color: colors.mutedGray,
                }}
              >
                <Loader2
                  size={20}
                  className="animate-spin"
                  style={{ color: colors.primary }}
                />
              </div>
            ) : displayed.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "32px 16px",
                  color: colors.mutedGray,
                  fontSize: 13,
                }}
              >
                <CheckCircle2
                  size={28}
                  style={{ margin: "0 auto 8px", display: "block" }}
                />
                {filter === "belum dibaca"
                  ? "Semua notifikasi sudah dibaca"
                  : "Tidak ada notifikasi"}
              </div>
            ) : (
              displayed.map((n) => {
                const nc = notifColors(n.category, isLight);
                return (
                  <Link
                    key={n.id}
                    href="/dashboard/persetujuan"
                    onClick={() => {
                      markOne(n.id);
                      setOpen(false);
                    }}
                    style={{ display: "block", textDecoration: "none" }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        padding: "10px 16px",
                        cursor: "pointer",
                        background: n.read ? "transparent" : colors.surface,
                        transition: "background 0.12s",
                        position: "relative",
                      }}
                      onMouseEnter={(e) =>
                        ((e.currentTarget as HTMLDivElement).style.background =
                          colors.surface)
                      }
                      onMouseLeave={(e) =>
                        ((e.currentTarget as HTMLDivElement).style.background =
                          n.read ? "transparent" : colors.surface)
                      }
                    >
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 10,
                          background: nc.bg,
                          color: nc.text,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {notifIcon(n.category)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            marginBottom: 1,
                          }}
                        >
                          <p
                            style={{
                              margin: 0,
                              fontWeight: n.read ? 500 : 700,
                              fontSize: 13,
                              color: colors.textPrimary,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {n.title}
                          </p>
                          {!n.read && (
                            <span
                              style={{
                                width: 7,
                                height: 7,
                                borderRadius: "50%",
                                background: nc.dot,
                                flexShrink: 0,
                              }}
                            />
                          )}
                        </div>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 12,
                            color: colors.mutedGray ?? colors.textPrimary,
                            lineHeight: 1.4,
                            overflow: "hidden",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                          }}
                        >
                          {n.message}
                        </p>
                        <p
                          style={{
                            margin: "4px 0 0",
                            fontSize: 11,
                            color: colors.mutedGray ?? colors.textPrimary,
                          }}
                        >
                          {n.time}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          dismiss(n.id);
                        }}
                        aria-label="Hapus notifikasi permanen"
                        style={{
                          alignSelf: "flex-start",
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          color: colors.mutedGray ?? colors.textPrimary,
                          padding: 2,
                          borderRadius: 4,
                          flexShrink: 0,
                        }}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </Link>
                );
              })
            )}
          </div>

          <div
            style={{
              borderTop: `1px solid ${colors.border}`,
              padding: "10px 16px",
              textAlign: "center",
            }}
          >
            <Link
              href="/dashboard/persetujuan"
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: colors.primary,
                textDecoration: "none",
              }}
              onClick={() => setOpen(false)}
            >
              Lihat semua persetujuan →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
