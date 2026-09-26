"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { btnPrimary, btnSecondary } from "@/components/admin/ui";

interface Report {
  created: number;
  updated: number;
  errors: { line: number; code: string; message: string }[];
}

export function ImportCsv() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);

  async function upload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return setError("Choose a CSV file first.");
    setBusy(true);
    setError(null);
    setReport(null);
    const body = new FormData();
    body.set("file", file);
    try {
      const res = await fetch("/api/admin/products/import", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Import failed");
      else {
        setReport(data);
        router.refresh();
      }
    } catch {
      setError("Upload failed. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={btnSecondary}>
        Import CSV
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Import CSV"
        >
          <div className="w-full max-w-lg rounded-lg bg-surface p-6">
            <h2 className="font-serif text-2xl font-semibold">Import products from CSV</h2>
            <p className="mt-2 text-[14px] text-muted">
              Rows are matched by <b>code</b>: existing designs are updated, new codes are created. Start from {}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- CSV file download */}
              <a href="/api/admin/export/products" className="font-semibold text-maroon underline">
                Export
              </a>{" "}
              to get the right columns. Sizes are separated by <code>|</code>, e.g. <code>M|L|XL</code>.
            </p>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="mt-4 block w-full text-[14px]" />
            {error && <p className="mt-3 text-[14px] font-medium text-maroon">{error}</p>}
            {report && (
              <div className="mt-4 rounded-md bg-cream p-3 text-[14px]">
                <p>
                  <b>{report.created}</b> created · <b>{report.updated}</b> updated · <b>{report.errors.length}</b>{" "}
                  skipped
                </p>
                {report.errors.length > 0 && (
                  <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-[13px] text-maroon">
                    {report.errors.map((e) => (
                      <li key={e.line}>
                        Line {e.line} ({e.code}): {e.message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className={btnSecondary}>
                Close
              </button>
              <button type="button" onClick={upload} disabled={busy} className={btnPrimary}>
                {busy ? "Importing…" : "Import"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
