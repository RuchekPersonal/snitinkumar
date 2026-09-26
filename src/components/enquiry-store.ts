"use client";

import { useCallback, useSyncExternalStore } from "react";

// The enquiry list lives on the device (RFD F5). It stores only what is needed to
// render the list offline — never prices, which are fetched from the server per viewer.

export interface StoredLine {
  code: string;
  qty: number;
  name: string;
  fabric: string;
  moq: number;
  sizes: string[];
  coverImageId: string | null;
}

const KEY = "sn_enquiry_v1";
const listeners = new Set<() => void>();
let cache: StoredLine[] | null = null;
const EMPTY: StoredLine[] = [];

function read(): StoredLine[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as StoredLine[]) : [];
    cache = Array.isArray(parsed) ? parsed.filter((l) => l && typeof l.code === "string") : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: StoredLine[]) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable (private mode); keep the in-memory copy for this visit.
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useEnquiry() {
  const lines = useSyncExternalStore(subscribe, read, () => EMPTY);

  const add = useCallback((line: StoredLine) => {
    const cur = read();
    const existing = cur.find((l) => l.code === line.code);
    write(existing ? cur.map((l) => (l.code === line.code ? { ...l, qty: l.qty + line.qty } : l)) : [...cur, line]);
  }, []);

  const setQty = useCallback((code: string, qty: number) => {
    write(read().map((l) => (l.code === code ? { ...l, qty: Math.max(l.moq, Math.floor(qty) || l.moq) } : l)));
  }, []);

  const remove = useCallback((code: string) => write(read().filter((l) => l.code !== code)), []);
  const clear = useCallback(() => write([]), []);

  return {
    lines,
    designs: lines.length,
    pieces: lines.reduce((s, l) => s + l.qty, 0),
    add,
    setQty,
    remove,
    clear,
  };
}
