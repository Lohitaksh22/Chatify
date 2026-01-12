"use client";

import React, { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Upload, Send } from "lucide-react";

type Props = {
  handleSubmit: (content: string, file?: File | null) => void;

  maxFileBytes?: number;
};

export default function InputSend({
  handleSubmit,

  maxFileBytes = 5 * 1024 * 1024,
}: Props) {
  const [inputVal, setInputVal] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const validateFile = (f: File) => {
    if (f.size > maxFileBytes) {
      toast.error(
        `Max file size is ${Math.round(maxFileBytes / 1024 / 1024)}MB`
      );
      return false;
    }
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (!f) return;

    if (!validateFile(f)) {
      e.currentTarget.value = "";
      return setFile(null);
    }

    if (preview) {
      URL.revokeObjectURL(preview);
    }
    const url = URL.createObjectURL(f);
    setFile(f);
    setPreview(url);
    setOpen(true);
  };

  const clearFile = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
      setOpen(false);
    }
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (submitting) return;
    const content = inputVal.trim();

    if (!content && !file) {
      toast.error("Type a message or attach a file");
      return;
    }

    try {
      setSubmitting(true);
      await handleSubmit(content, file);
      setInputVal("");
      clearFile();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Send failed: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="relative h-25">
      <form onSubmit={onSubmit} className="w-full max-w-3xl mt-4 ">
        <div className="flex  gap-3 px-4  ">
          <div className="flex-1">
            {preview && open && (
              <div className="fixed inset-0 z-40 flex items-center justify-center p-4 backdrop-blur-lg min-h-screen ">
                <div className="relative z-50 rounded-xl flex flex-col items-center space-y-4 bg-[radial-gradient(1200px_circle_at_20%_-10%,rgba(56,189,248,0.25),transparent_40%),radial-gradient(900px_circle_at_80%_10%,rgba(168,85,247,0.25),transparent_45%)] shadow-2xl w-full max-w-md p-6">
                  <img
                    src={preview}
                    alt="preview"
                    className="max-h-50 rounded-md object-cover"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={clearFile}
                      className="text-xs px-2 py-1 bg-gray-700 rounded text-white"
                    >
                      Remove
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                      }}
                      className="text-xs px-2 py-1 bg-gray-700 rounded text-white"
                    >
                      Close Preview and Save Image
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="relative w-full ">
              <label
                title="Attach image/video"
                onClick={() => fileInputRef.current?.click()}
                className="absolute left-1 top-1/2 -translate-y-1/2 z-10 inline-flex items-center justify-center rounded-md border border-dashed p-2 text-sm cursor-pointer hover:bg-indigo-700 transition"
              >
                <Upload size={18} />
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileChange}
                className="hidden"
              />

              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Message…"
                disabled={submitting}
                className="w-full rounded-xl bg-[#262A33] border border-[#2f3438] pl-12 pr-12 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-200 transition"
              />

              <button
                type="submit"
                disabled={submitting}
                className={`absolute right-1 top-1/2 -translate-y-1/2 inline-flex items-center justify-center rounded-md p-2 transition
      ${
        submitting
          ? "bg-indigo-400/60 cursor-wait"
          : "bg-indigo-600 hover:bg-indigo-500"
      }
     `}
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
