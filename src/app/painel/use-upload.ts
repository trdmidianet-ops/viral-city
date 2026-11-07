"use client";

import { useState } from "react";

/** Envia um vídeo do PC para /api/uploads mostrando o progresso. */
export function useUpload() {
  const [upload, setUpload] = useState<{ id: string; name: string } | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");

  function send(file: File) {
    setUpload(null);
    setError("");
    setProgress(0);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/uploads");
    xhr.setRequestHeader("x-filename", encodeURIComponent(file.name));
    xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      setProgress(null);
      const body = JSON.parse(xhr.responseText || "{}");
      if (xhr.status === 200) setUpload({ id: body.uploadId, name: body.name });
      else setError(body.error ?? "Falha no envio.");
    };
    xhr.onerror = () => {
      setProgress(null);
      setError("Falha no envio.");
    };
    xhr.send(file);
  }

  return { upload, progress, error, send };
}
