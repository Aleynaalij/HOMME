"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { galleryUrl } from "@/lib/gallery";
import { Notice, sb } from "../shared";

type Photo = { id: string; path: string; caption: string | null; sort_order: number };

/** Shrink big phone photos before upload (max 1600px, JPEG). */
async function compress(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.type === "image/heic") return file;
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) return file;
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return new Promise((res) => canvas.toBlob((b) => res(b ?? file), "image/jpeg", 0.85));
}

export function Gallery() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const { data } = await sb().from("gallery_photos").select("*").order("created_at", { ascending: false });
    setPhotos((data ?? []) as Photo[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function upload(files: FileList) {
    setMsg(null);
    const list = [...files];
    for (let i = 0; i < list.length; i++) {
      setBusy(`Uploading ${i + 1} of ${list.length}…`);
      const blob = await compress(list[i]);
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
      const { error } = await sb().storage.from("gallery").upload(path, blob, { contentType: blob.type || "image/jpeg" });
      if (error) {
        setMsg(error.message);
        break;
      }
      await sb().from("gallery_photos").insert({ path });
    }
    setBusy(null);
    load();
  }

  async function remove(p: Photo) {
    if (!confirm("Delete this photo?")) return;
    if (!p.path.startsWith("/")) await sb().storage.from("gallery").remove([p.path]);
    await sb().from("gallery_photos").delete().eq("id", p.id);
    load();
  }

  async function caption(p: Photo, text: string) {
    await sb().from("gallery_photos").update({ caption: text.trim() || null }).eq("id", p.id);
  }

  return (
    <div>
      <div className="card mb-5 flex flex-col items-center gap-3 p-6 text-center">
        <h2 className="font-display text-2xl font-bold">Your work</h2>
        <p className="text-sm text-muted">Fresh cuts sell themselves. Photos show in the gallery on your website for new clients.</p>
        <button className="btn-primary" disabled={!!busy} onClick={() => fileRef.current?.click()}>{busy ?? "Add photos"}</button>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && upload(e.target.files)} />
        <Notice msg={msg} tone="error" />
      </div>
      {photos.length === 0 && <p className="text-center text-sm text-muted">No photos yet.</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((p) => (
          <figure key={p.id} className="card overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={galleryUrl(p.path)} alt={p.caption ?? "Haircut by Tash"} className="aspect-square w-full object-cover" loading="lazy" />
            <figcaption className="flex items-center gap-1 p-2">
              <input className="input !rounded-lg !px-2 !py-1.5 text-xs" placeholder="Caption" defaultValue={p.caption ?? ""} onBlur={(e) => caption(p, e.target.value)} />
              <button className="px-2 text-danger" aria-label="Delete photo" onClick={() => remove(p)}>✕</button>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
