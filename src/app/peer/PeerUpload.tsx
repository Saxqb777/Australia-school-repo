"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

const MAX = 4_000_000;

/** Large photos are scaled down in the browser so they upload quickly and stay within the size limit. */
async function shrinkImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size <= 2_500_000) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 2200 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
  return blob ? new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" }) : file;
}

export function PeerUpload({ sampleHref }: { sampleHref: string | null }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function upload() {
    const chosen = input.current?.files?.[0];
    if (!chosen) {
      setMessage("Choose the PDF or photo of the completed form first.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const file = await shrinkImage(chosen);
      if (file.size > MAX) {
        setMessage("That file is over 4 MB. Scan at a lower resolution or take a smaller photo.");
        return;
      }
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/peer/upload", { method: "POST", body });
      const out = (await res.json().catch(() => null)) as { ok: true; id: string } | { ok: false; message: string } | null;
      if (!out || !out.ok) {
        setMessage(out && !out.ok ? out.message : "The form could not be read. Try again.");
        return;
      }
      router.push(`/peer/${out.id}`);
    } catch {
      setMessage("You appear to be offline. Uploading needs an internet connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border border-rule border-t-4 border-t-navy bg-sheet p-4" data-tour="peer-upload">
      <h2 className="font-cond text-lg font-semibold">Add a team leader observation</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Upload the completed Teacher Observation Form the team leader handed in: a PDF, a scan, or a clear photo of the
        printed form. The AI reads the names, class, date, every rating and the comments; you check them against the
        original before saving.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input ref={input} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="text-sm" aria-label="Completed form file" />
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void upload()}>
          {busy ? "Reading the form…" : "Upload and read"}
        </button>
      </div>
      {busy ? <p className="mt-2 text-sm text-ink-soft">This takes about 20 to 40 seconds for a full form.</p> : null}
      {message ? (
        <p role="alert" className="mt-3 border-l-2 border-navy bg-navy-wash px-3 py-2 text-sm">
          {message}
        </p>
      ) : null}
      {sampleHref ? (
        <p className="mt-3 text-sm">
          Demo: <a href={sampleHref} className="link" download>download a sample completed form</a> to try the upload.
        </p>
      ) : null}
    </div>
  );
}
