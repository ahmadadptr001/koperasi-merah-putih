"use client";

import { useCallback, useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "theme";

/**
 * Tema disimpan pada store level modul, bukan useState di dalam hook.
 *
 * Versi sebelumnya memakai `useState` di dalam `useTheme()`, sehingga setiap
 * komponen memegang salinan temanya sendiri. Akibatnya mengganti tema di
 * halaman Pengaturan tidak mengubah header, sidebar, bell notifikasi, maupun
 * popup profil — satu-satunya cara menyamakan tampilan adalah reload paksa
 * (`window.location.reload()`). Dengan store bersama, semua komponen yang
 * memanggil hook ini ikut ter-render ulang begitu tema berubah.
 */
const listeners = new Set<() => void>();

/** Cache snapshot; useSyncExternalStore butuh nilai stabil antar panggilan. */
let cached: Theme | null = null;

function normalize(value: string | null): Theme {
  return value === "dark" ? "dark" : "light";
}

function getSnapshot(): Theme {
  if (cached === null) {
    cached = normalize(
      typeof window === "undefined"
        ? null
        : window.localStorage.getItem(STORAGE_KEY),
    );
  }
  return cached;
}

/** Server render selalu terang; klien menyesuaikan setelah hidrasi. */
function getServerSnapshot(): Theme {
  return "light";
}

function emit(): void {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  // Ikut berubah saat tema diganti dari tab lain.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    cached = normalize(event.newValue);
    emit();
  };

  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * Terapkan tema: simpan, tandai pada elemen <html>, lalu beri tahu semua
 * komponen. Aman dipanggil dari luar komponen React.
 */
export function applyTheme(theme: Theme): void {
  cached = theme;

  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, theme);
    // Menjaga warna kontrol bawaan browser (scrollbar, input) sesuai tema.
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }

  emit();
}

export const useTheme = () => {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setTheme = useCallback((next: Theme) => {
    applyTheme(next);
  }, []);

  return { theme, setTheme };
};
