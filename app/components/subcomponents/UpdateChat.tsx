"use client";

import { useEffect, useState } from "react";
import { useClientFetch } from "@/lib/clientAuth";
import toast from "react-hot-toast";
import { useAuth } from "@/app/contexts/AuthContext";

type Props = {
  activeId: string | null;
  setChatEdit: React.Dispatch<React.SetStateAction<boolean>>;
  chatData: Conversation;
  setReload: React.Dispatch<React.SetStateAction<number>>;
};

type Conversation = {
  id: string;
  name: string;
  image: string | null;
  lastMessage: string | null;
  lastMessageAt: Date | null;
  isGroup: boolean;
  members?: {
    memberId: string;
    joinedAt: Date;
    role: string;
    id: string;
    username: string;
    image: string | null;
  }[];
};

export default function UpdateChat({
  activeId,
  setChatEdit,
  chatData,
  setReload,
}: Props) {
  const clientFetch = useClientFetch();
  const { socket } = useAuth();
  const sock = socket.current;

  const [savedName, setSavedName] = useState<string | null>(
    chatData.name ?? null
  );
  const [nameInput, setNameInput] = useState<string>(chatData.name ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(chatData.image ?? null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!sock) return;

    sock.on(
      "chat_updated",
      ({
        chatid,
        updatedChat,
      }: {
        chatid: string;
        updatedChat: Conversation;
      }) => {
        if (chatid !== activeId) return;
        setReload((i) => i + 1);
        setSavedName(updatedChat?.name);
        setPreview(updatedChat?.image);
      }
    );

    return () => {
      if (!sock) return;
      sock.off("chat_updated");
    };
  }, [sock, activeId, setReload]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (!f) {
      setFile(null);
      return;
    }
    if (!f.type.startsWith("image/")) {
      toast.error("Only images allowed");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast.error("Max file size is 5MB");
      return;
    }
    setFile(f);
    const objectUrl = URL.createObjectURL(f);
    setPreview(objectUrl);
    return f;
  };

  async function uploadToCloudinary(
    fileToUpload: File | null,
    folder = "chat/profile"
  ) {
    if (!fileToUpload) {
      return {
        public_id: "defaults/group-avatar",
        secure_url:
          "https://res.cloudinary.com/dptlaoyr2/image/upload/v1767468890/OIP.LLLUdzeToHgmTQZpFUTQswHaHa_wrkijz.jpg",
      };
    }

    const url = `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/upload`;
    const form = new FormData();
    form.append(
      "upload_preset",
      process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!
    );
    form.append("folder", folder);
    form.append("file", fileToUpload);

    const res = await fetch(url, { method: "POST", body: form });

    if (!res.ok) {
      const text = await res.text();
      throw new Error("Cloudinary upload failed: " + text);
    }

    return res.json();
  }

  const update = async (uploadFile?: File | null) => {
    if (!activeId) {
      toast.error("No active chat selected");
      return;
    }

    try {
     let imageUrl: string | null = null;
      const fileToUpload =
        typeof uploadFile !== "undefined" ? uploadFile : file ?? null;

      const uploaded = await uploadToCloudinary(fileToUpload);

      imageUrl = uploaded.secure_url as string;

      const res = await clientFetch(`api/chats/${activeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nameInput.trim() || savedName,
          image: imageUrl,
        }),
      });

      if (!res.ok) {
        toast.error("Update failed");
        return;
      }

      const data = await res.json();
      const updated = data?.data ?? null;
      sock?.emit("chat_update", { chatid: activeId, updatedChat: updated });
      toast.success("Chat updated successfully");
      setReload((i) => i + 1);
      setSavedName(updated?.name);
      setPreview(updated?.image);
    } catch (err) {
      console.error(err);
      toast.error("An error occurred");
    }
  };

  return (
    <div
      onClick={() => setChatEdit(false)}
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-lg py-12 px-4"
    >
      {savedName !== null && preview !== null && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl rounded-3xl p-8 md:p-12 bg-black  bg-[radial-gradient(1200px_circle_at_20%_-10%,rgba(56,189,248,0.25),transparent_40%),radial-gradient(900px_circle_at_80%_10%,rgba(168,85,247,0.25),transparent_45%)] shadow-2xl border border-white/20 text-slate-900 dark:text-slate-100"
        >
          <div className="flex flex-col items-start md:items-center gap-6">
            <h1 className="font-extrabold text-xl mb-2 ">Edit Your Chat</h1>

            <div className="flex flex-col items-center gap-6">
              <div className="flex items-center justify-center gap-6">
                <img
                  src={preview ?? chatData.image ?? undefined}
                  alt={`${chatData.name} avatar`}
                  className="w-36 h-36 rounded-full object-cover"
                />

                <button
                  onClick={async () => {
                    if (preview && preview.startsWith("blob:"))
                      URL.revokeObjectURL(preview);
                    setFile(null);
                    const newFile = null;
                    await update(newFile);
                  }}
                  className="text-sm font-semibold text-red-600 hover:underline"
                >
                  Remove
                </button>
              </div>
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="profile-picture"
                  className="inline-flex cursor-pointer items-center rounded-md border-dashed border px-3 py-2 font-semibold focus:ring-2 text-slate-400 focus:ring-white transition"
                >
                  Upload New Profile Picture
                </label>

                <input
                  id="profile-picture"
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const newFile = handleFile(e);
                    await update(newFile);
                  }}
                  className="hidden"
                />
              </div>
            </div>

            <div className="w-full mt-3">
              <label className="block text-md font-semibold underline">
                Chat Name:
              </label>

              {isEditing ? (
                <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:space-x-4 gap-3">
                  <input
                    id="chat-name"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === "Escape") {
                        setIsEditing(false);
                        setNameInput(savedName ?? "");
                      }
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (nameInput.trim().length === 0) {
                          toast.error("A chat name is required");
                          return;
                        }
                        await update();
                        setIsEditing(false);
                      }
                    }}
                    className="flex-1 px-3 py-2 rounded-lg border border-[#6B7280] focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-transparent transition"
                  />

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        if (nameInput.trim().length === 0) {
                          toast.error("Chat name required");
                          return;
                        }
                        await update();
                        setIsEditing(false);
                      }}
                      className="bg-green-600 px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-60"
                    >
                      Save
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setNameInput(savedName ?? chatData.name ?? "");
                      }}
                      className="bg-red-700 px-4 py-2 rounded-lg hover:opacity-90"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p
                  className="mt-2 cursor-pointer hover:shadow-md hover:bg-white/10 px-3 py-2 rounded-lg border border-transparent hover:border-white/30 transition w-fit"
                  onClick={() => {
                    setIsEditing(true);
                    setNameInput(savedName ?? chatData.name ?? "");
                  }}
                >
                  {savedName}
                </p>
              )}

              <div className="mt-6 flex justify-between">
                <button
                  onClick={() => setChatEdit(false)}
                  className="flex-1 items-center justify-center bg-gradient-to-br from-[#6632d7] to-[#230065] px-4 py-2 rounded-md border border-white/40 text-sm font-medium transition-all duration-200 hover:border-white/70 hover:opacity-80 hover:font-semibold active:scale-95"
                >
                  Go Back
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
