import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, RefreshCcw, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { validateAvatarFile, validateAvatarSourceFile } from "@/lib/profile";

interface AvatarCropDialogProps {
  initialFile?: File | null;
  onClose: () => void;
  onSave: (croppedFile: File) => Promise<{ error: string | null } | void>;
}

const CROP_SIZE = 280;
const OUTPUT_SIZE = 512;

export function AvatarCropDialog({ initialFile = null, onClose, onSave }: AvatarCropDialogProps) {
  const [file, setFile] = useState<File | null>(initialFile);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  useEffect(() => {
    if (!file) {
      setImage(null);
      return;
    }

    let active = true;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (!active) return;
      setImage(img);
      setError(null);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    img.onerror = () => {
      if (active) {
        setImage(null);
        setError("Couldn't load that image. Try another file.");
      }
    };
    img.src = url;
    return () => {
      active = false;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const minZoomScale = image ? Math.max(CROP_SIZE / image.width, CROP_SIZE / image.height) : 1;
  const currentScale = minZoomScale * zoom;
  const maxOffset = image
    ? {
        x: Math.max(0, (image.width * currentScale - CROP_SIZE) / 2),
        y: Math.max(0, (image.height * currentScale - CROP_SIZE) / 2),
      }
    : { x: 0, y: 0 };

  useEffect(() => {
    setOffset((prev) => ({
      x: Math.max(-maxOffset.x, Math.min(maxOffset.x, prev.x)),
      y: Math.max(-maxOffset.y, Math.min(maxOffset.y, prev.y)),
    }));
  }, [maxOffset.x, maxOffset.y]);

  useEffect(() => {
    if (!image || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, CROP_SIZE, CROP_SIZE);
    ctx.save();
    ctx.translate(CROP_SIZE / 2 + offset.x, CROP_SIZE / 2 + offset.y);
    ctx.scale(currentScale, currentScale);
    ctx.drawImage(image, -image.width / 2, -image.height / 2);
    ctx.restore();
  }, [image, offset, currentScale]);

  const chooseFile = (nextFile?: File) => {
    if (!nextFile) return;
    const validationError = validateAvatarSourceFile(nextFile);
    if (validationError) {
      setError(validationError);
      return;
    }
    setFile(nextFile);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!image || saving) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setOffset({
      x: Math.max(-maxOffset.x, Math.min(maxOffset.x, e.clientX - dragStart.x)),
      y: Math.max(-maxOffset.y, Math.min(maxOffset.y, e.clientY - dragStart.y)),
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const exportCroppedFile = async () => {
    if (!image) throw new Error("No image selected.");
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = OUTPUT_SIZE;
    exportCanvas.height = OUTPUT_SIZE;
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) throw new Error("Could not process the image.");

    const exportScale = OUTPUT_SIZE / CROP_SIZE;
    ctx.save();
    ctx.translate(OUTPUT_SIZE / 2 + offset.x * exportScale, OUTPUT_SIZE / 2 + offset.y * exportScale);
    ctx.scale(currentScale * exportScale, currentScale * exportScale);
    ctx.drawImage(image, -image.width / 2, -image.height / 2);
    ctx.restore();

    for (const quality of [0.9, 0.82, 0.72]) {
      const blob = await new Promise<Blob | null>((resolve) => exportCanvas.toBlob(resolve, "image/webp", quality));
      if (!blob) continue;
      const cropped = new File([blob], "avatar.webp", { type: "image/webp" });
      if (!validateAvatarFile(cropped)) return cropped;
    }
    throw new Error("The cropped image is still too large. Try a smaller photo.");
  };

  const handleSave = async () => {
    if (!image || saving) return;
    setSaving(true);
    setError(null);
    try {
      const croppedFile = await exportCroppedFile();
      const result = await onSave(croppedFile);
      if (result?.error) {
        setError(result.error);
        return;
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't process that image.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6 backdrop-blur-sm">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={() => !saving && onClose()}
        aria-label="Close avatar editor"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="avatar-editor-title"
        className="relative z-10 flex max-h-[calc(100dvh-2rem)] w-full max-w-[430px] flex-col overflow-hidden rounded-2xl border border-[var(--color-border-strong)] bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border-strong)] px-5 py-4">
          <div>
            <h2 id="avatar-editor-title" className="font-display text-lg font-semibold text-[var(--ff-ink)]">
              Adjust avatar
            </h2>
            <p className="text-xs text-[var(--color-ink-faint)]">Choose, position, then save a square crop.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-full p-1.5 text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)] disabled:opacity-50"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col items-center overflow-auto p-5 sm:p-6">
          {error && (
            <div className="mb-4 w-full rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {!file ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                chooseFile(e.dataTransfer.files[0]);
              }}
              className="flex min-h-[240px] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-2)] px-5 text-center transition-colors hover:border-[var(--color-ash)] hover:bg-white"
            >
              <span className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-white text-[var(--color-ink-soft)] shadow-sm">
                <ImagePlus size={20} />
              </span>
              <span className="text-sm font-medium text-[var(--color-ink)]">Choose an image</span>
              <span className="mt-1 text-xs text-[var(--color-ink-faint)]">
                PNG, JPEG, WebP or GIF. The final upload is cropped and compressed.
              </span>
            </button>
          ) : !image && !error ? (
            <div className="grid h-[280px] w-[280px] place-items-center rounded-full bg-[var(--ff-blue-chalk)]">
              <Loader2 size={24} className="animate-spin text-[var(--color-ink-soft)]" />
            </div>
          ) : image ? (
            <div className="flex w-full flex-col items-center gap-5">
              <div
                className="relative cursor-move touch-none select-none overflow-hidden rounded-full bg-[var(--ff-blue-chalk)] shadow-inner"
                style={{ width: CROP_SIZE, height: CROP_SIZE }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
              >
                <canvas ref={canvasRef} width={CROP_SIZE} height={CROP_SIZE} className="pointer-events-none block" />
                <div className="pointer-events-none absolute inset-0 rounded-full border border-black/10 shadow-[inset_0_0_0_9999px_rgba(255,255,255,0.02)]" />
              </div>

              <div className="flex w-full items-center gap-3">
                <span className="text-xs font-medium text-[var(--color-ink-soft)]">Zoom</span>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.01"
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-1 accent-[var(--ff-violet)]"
                  disabled={saving}
                />
                <button
                  type="button"
                  onClick={() => {
                    setZoom(1);
                    setOffset({ x: 0, y: 0 });
                  }}
                  disabled={saving}
                  className="shrink-0 rounded-full p-1.5 text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)] disabled:opacity-50"
                  aria-label="Reset crop"
                  title="Reset crop"
                >
                  <RefreshCcw size={16} />
                </button>
              </div>

              <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={saving}>
                <Upload size={14} /> Choose another
              </Button>
            </div>
          ) : null}

          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              chooseFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[var(--color-border-strong)] bg-[var(--color-surface-2)] px-5 py-4">
          <Button type="button" variant="ghost" size="md" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" variant="primary" size="md" onClick={handleSave} disabled={!image || saving}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : "Save avatar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
