"use client"

import { useState } from "react";
import { useClientFetch } from "@/lib/clientAuth";
import toast from "react-hot-toast";

type Props = {
  activeId: string | null;
  setChatEdit: React.Dispatch<React.SetStateAction<boolean>>;
  chatData: Conversation;
  setActiveId: React.Dispatch<React.SetStateAction<string | null>>;
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

function UpdateChat({ activeId, setChatEdit, chatData, setActiveId }: Props) {
  const clientFetch = useClientFetch();
  const [newName, setNewName] = useState("");
  const [currentName, setCurrentName] = useState<string | null>(
    chatData.name || null
  );
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(chatData.image || null);
  const [isEditing, setIsEditing] = useState(false)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return setFile(null);
    if (!f.type.startsWith("image/")) return toast.error("Only images allowed");
    if (f.size > 5 * 1024 * 1024) return toast.error("Max file size is 5MB");
    setFile(f);
    setPreview(URL.createObjectURL(f));
    return f
  };

  async function uploadToCloudinary(
    file: File | null,
    folder = "chat/profile"
  ) {
    if (!file) {
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
    form.append("file", file);

    const res = await fetch(url, { method: "POST", body: form });

    if (!res.ok) {
      const text = await res.text();
      throw new Error("Cloudinary upload failed: " + text);
    }

    return res.json();
  }

  const update = async () => {
     if (!activeId) {
      toast.error("No active chat selected");
      return;
    }
    
    try {
      
       const uploaded = await uploadToCloudinary(file);
      const imageUrl = uploaded?.secure_url ?? null;

      const res = await clientFetch(`api/chats/${activeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, image: imageUrl }),
      });

      if (!res.ok) {
        return toast.error("Update Failed");
      }

      const data = await res.json();
      setActiveId(null);
      setCurrentName(data?.data?.name);
      setPreview(data?.data?.image);
    } catch (err) {
      console.error(err);
    } finally {
      setActiveId(activeId);
    }
  };

  return (
    <div  onClick={() => setChatEdit(false)} className="fixed inset-0 flex items-center justify-center backdrop-blur-lg py-12 px-4">
      {currentName && preview && (
        <div onClick={(e) => e.stopPropagation()} className="bg-white/95 dark:bg-slate-900/90 shadow-2xl rounded-3xl p-8 md:p-12 text-slate-900 dark:text-slate-100">
           <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <img
            src={preview ?? chatData?.image}
            alt={`${chatData.name} avatar`}
            className="w-30 h-30 rounded-full object-cover"
          />

          <p onClick={async() => {
                if (preview && preview.startsWith("blob:")) URL.revokeObjectURL(preview);
                setFile(null)
                setPreview(null)
                await update()

              }} className="text-sm text-red-600 font-semibold hover:underline">Remove</p>

            <label
              htmlFor="profile-picture"
              className="inline-flex cursor-pointer items-center font-bold rounded-md border px-3 py-2 focus:ring-2 focus:ring-white transition duration-300"
            >
              Upload New Profile Picture
            </label>

            <input
              id="profile-picture"
              type="file"
              accept="image/*"
              onChange={async(e) => {
              handleFile(e)
            
              await update()
            }}
              className="hidden"
            />



          <div className="mt-5">
            <label className="block text-md font-semibold text-gray-700">
              Chat Name
            </label>

            {isEditing ? (
              <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:space-x-4 gap-3">
                <input
                  id="username"
                  name="username"
                  value={currentName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === "Escape") setIsEditing(false);
                    if (e.key === "Enter") {
                      if (newName.length) return toast.error("A Chat Name required");
                      e.preventDefault();
                      await update();
                      setIsEditing(false);
                    }
                  }}
                  className="flex justify-start px-3 py-2 rounded-lg border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={async() => {
                      if (newName.length === 0) return toast.error("Username required");
                      await update();
                      setIsEditing(false);
                    }}
                    className="bg-blue-500  px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-60"
                  >
                    Save
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setCurrentName(currentName ?? chatData?.name);
                    }}
                    className="bg-red-500  px-4 py-2 rounded-lg hover:opacity-90"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p
                className="mt-2 cursor-pointer text-gray-800"
                onClick={() => setIsEditing(true)}
              >
                {currentName}
              </p>
            )}

            <button onClick={() => setChatEdit(false)}>Go Back</button>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UpdateChat;
