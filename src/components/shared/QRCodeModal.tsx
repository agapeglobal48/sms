"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

export default function QRCodeModal({
  assetId,
  serialKey,
  label,
  onClose,
}: {
  assetId: string;
  serialKey: string;
  label: string;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [url] = useState(() => `${window.location.origin}/asset/${assetId}`);

  useEffect(() => {
    if (!canvasRef.current || !url) return;
    QRCode.toCanvas(canvasRef.current, url, { width: 240, margin: 2 }, (err) => {
      if (err) setError("Could not generate QR code.");
    });
  }, [url]);

  function handleDownload() {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `qr-${serialKey.replace(/[^a-zA-Z0-9._-]/g, "_")}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  }

  function handlePrint() {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL("image/png");
    const printWindow = window.open("", "_blank", "width=400,height=500");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head><title>${label}</title></head>
        <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:sans-serif;padding:24px;">
          <img src="${dataUrl}" style="width:240px;height:240px;" />
          <p style="margin-top:12px;font-size:14px;">${label}</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-[60]">
      <div className="bg-surface rounded-xl w-full max-w-xs p-5 text-center">
        <div className="flex justify-between items-start mb-3">
          <h2 className="font-medium text-ink">{label}</h2>
          <button onClick={onClose} className="text-muted hover:text-ink text-sm">
            ✕
          </button>
        </div>

        {error ? (
          <p className="text-sm text-danger">{error}</p>
        ) : (
          <canvas ref={canvasRef} className="mx-auto" />
        )}

        <p className="text-xs text-muted mt-2">Serial: {serialKey}</p>
        <p className="text-xs text-muted mt-1">
          Scanning this opens a page with this asset&apos;s full info.
        </p>

        <div className="flex gap-2 mt-4">
          <button
            onClick={handleDownload}
            className="flex-1 rounded-lg bg-brand-light text-white text-sm font-medium py-2 hover:bg-brand transition-colors"
          >
            Download
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 rounded-lg border border-line text-sm font-medium py-2 text-ink hover:bg-paper"
          >
            Print
          </button>
        </div>
      </div>
    </div>
  );
}
