"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { opKey, type SaveError, type SaveOp, type SaveResponse } from "@/lib/save-ops";

export type SaveStateKind = "idle" | "saving" | "saved" | "offline" | "retrying" | "signed_out" | "locked" | "error";

export interface SaveState {
  kind: SaveStateKind;
  pending: number;
  savedAt: string | null;
  message: string | null;
}

const storageKey = (visitId: string) => `asad:save-queue:v1:${visitId}`;

/** Reads changes kept on this device that the server has not confirmed yet. */
export function readPendingOps(visitId: string): Record<string, SaveOp> {
  try {
    const raw = window.localStorage.getItem(storageKey(visitId));
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, SaveOp>) : {};
  } catch {
    return {};
  }
}

function writePendingOps(visitId: string, ops: Record<string, SaveOp>): void {
  try {
    if (Object.keys(ops).length === 0) window.localStorage.removeItem(storageKey(visitId));
    else window.localStorage.setItem(storageKey(visitId), JSON.stringify(ops));
  } catch {
    // Storage full or blocked: the in-memory queue still retries while the page is open.
  }
}

const BACKOFF_MS = [2000, 4000, 8000, 15000, 30000];

/**
 * Queues every change, keeps it in localStorage until the server confirms it, and retries with backoff.
 * Ops carry the time they were made, and the server keeps the newest per field, so resending is always safe.
 */
export function useSaveQueue(visitId: string, enabled: boolean) {
  const pendingRef = useRef<Record<string, SaveOp>>({});
  const inFlightRef = useRef(false);
  const attemptRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const stoppedRef = useRef(false);
  const [state, setState] = useState<SaveState>({ kind: "idle", pending: 0, savedAt: null, message: null });

  const pendingCount = () => Object.keys(pendingRef.current).length;

  const flushRef = useRef<() => Promise<void>>(async () => undefined);

  const schedule = useCallback((delay: number) => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      void flushRef.current();
    }, delay);
  }, []);

  const flush = useCallback(async () => {
    if (!enabled || stoppedRef.current || inFlightRef.current) return;
    const ops = Object.values(pendingRef.current);
    if (ops.length === 0) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setState((s) => ({ ...s, kind: "offline", pending: ops.length }));
      return;
    }
    inFlightRef.current = true;
    setState((s) => ({ ...s, kind: "saving", pending: ops.length }));
    try {
      const res = await fetch(`/api/visits/${visitId}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ops }),
        cache: "no-store",
      });
      if (res.ok) {
        const body = (await res.json()) as SaveResponse;
        for (const op of ops) {
          const key = opKey(op);
          if (pendingRef.current[key]?.ts === op.ts) delete pendingRef.current[key];
        }
        writePendingOps(visitId, pendingRef.current);
        attemptRef.current = 0;
        setState({ kind: "saved", pending: pendingCount(), savedAt: body.savedAt, message: null });
        if (pendingCount() > 0) schedule(50);
        return;
      }
      const err = (await res.json().catch(() => null)) as SaveError | null;
      if (res.status === 401) {
        stoppedRef.current = true;
        setState((s) => ({
          ...s,
          kind: "signed_out",
          pending: ops.length,
          message: "You have been signed out. Your changes are kept on this device; sign in again to send them.",
        }));
        return;
      }
      if (res.status === 409) {
        stoppedRef.current = true;
        setState((s) => ({ ...s, kind: "locked", pending: ops.length, message: err?.message ?? null }));
        return;
      }
      if (res.status >= 400 && res.status < 500) {
        // The server will never accept these; drop them so they don't block later changes.
        for (const op of ops) delete pendingRef.current[opKey(op)];
        writePendingOps(visitId, pendingRef.current);
        setState((s) => ({ ...s, kind: "error", pending: pendingCount(), message: err?.message ?? "A change could not be saved." }));
        return;
      }
      throw new Error(`Save failed with ${res.status}`);
    } catch {
      const delay = BACKOFF_MS[Math.min(attemptRef.current, BACKOFF_MS.length - 1)] ?? 30000;
      attemptRef.current += 1;
      const offline = typeof navigator !== "undefined" && !navigator.onLine;
      setState((s) => ({ ...s, kind: offline ? "offline" : "retrying", pending: pendingCount() }));
      schedule(delay);
    } finally {
      inFlightRef.current = false;
    }
  }, [enabled, visitId, schedule]);

  flushRef.current = flush;

  const enqueue = useCallback(
    (op: SaveOp, delay = 250) => {
      if (!enabled) return;
      pendingRef.current[opKey(op)] = op;
      writePendingOps(visitId, pendingRef.current);
      setState((s) => ({ ...s, pending: pendingCount(), kind: s.kind === "idle" || s.kind === "saved" ? "saving" : s.kind }));
      schedule(delay);
    },
    [enabled, visitId, schedule],
  );

  useEffect(() => {
    if (!enabled) return;
    pendingRef.current = readPendingOps(visitId);
    if (pendingCount() > 0) {
      setState((s) => ({ ...s, pending: pendingCount() }));
      schedule(100);
    }
    const online = () => {
      attemptRef.current = 0;
      schedule(50);
    };
    const offline = () => setState((s) => ({ ...s, kind: pendingCount() > 0 ? "offline" : s.kind }));
    const visible = () => {
      if (document.visibilityState === "visible" && pendingCount() > 0) schedule(50);
    };
    const pagehide = () => {
      const ops = Object.values(pendingRef.current);
      if (ops.length === 0 || !navigator.sendBeacon) return;
      navigator.sendBeacon(
        `/api/visits/${visitId}/save`,
        new Blob([JSON.stringify({ ops })], { type: "application/json" }),
      );
    };
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("pagehide", pagehide);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("pagehide", pagehide);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [enabled, visitId, schedule]);

  /** Resolves true once everything queued has reached the server. */
  const flushNow = useCallback(async (): Promise<boolean> => {
    for (let i = 0; i < 20; i += 1) {
      if (pendingCount() === 0 && !inFlightRef.current) return true;
      await flush();
      if (pendingCount() === 0 && !inFlightRef.current) return true;
      await new Promise((r) => window.setTimeout(r, 250));
      if (stoppedRef.current || !navigator.onLine) return false;
    }
    return pendingCount() === 0;
  }, [flush]);

  const resume = useCallback(() => {
    stoppedRef.current = false;
    schedule(50);
  }, [schedule]);

  return { state, enqueue, flushNow, resume };
}
