// hooks/useAuth.ts
// Hook untuk membaca session user yang sedang login dari Supabase

"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { User } from "@/lib/types";

interface AuthState {
  user: User | null; // data dari public.users (role, full_name, dll)
  authId: string | null; // UUID dari auth.users (session)
  loading: boolean;
  isAdmin: boolean;
  isPengurus: boolean;
  isAnggota: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    authId: null,
    loading: true,
    isAdmin: false,
    isPengurus: false,
    isAnggota: false,
  });

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user: authUser },
      } = await supabaseBrowser.auth.getUser();

      if (!authUser) {
        setState({
          user: null,
          authId: null,
          loading: false,
          isAdmin: false,
          isPengurus: false,
          isAnggota: false,
        });
        return;
      }

      const { data: profile } = await supabaseBrowser
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .single();

      const user = profile as User | null;

      setState({
        user,
        authId: authUser.id,
        loading: false,
        isAdmin: user?.role === "admin",
        isPengurus: user?.role === "admin" || user?.role === "pengurus",
        isAnggota: true, // semua role bisa akses fitur anggota dasar
      });
    };

    fetchUser();

    const {
      data: { subscription },
    } = supabaseBrowser.auth.onAuthStateChange(() => {
      fetchUser();
    });

    return () => subscription.unsubscribe();
  }, []);

  return state;
}
