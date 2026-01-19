"use client";
import { useClientFetch } from "@/lib/clientAuth";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/app/contexts/AuthContext";

type Props = {
  handleCreate: () => void;
  setNewChat: React.Dispatch<React.SetStateAction<Conversation | null>>;
};

type Conversation = {
  name: string | null;
    id: string;
    image: string | null;
    createdAt: Date;
    isGroup: boolean;
    lastMessageAt: Date | null;
    lastMessage: string | null;
  
};

type User = {
  username: string;
  email: string;
  id: string;
  image?: string;
};

const CreateChatHelper = ({ handleCreate, setNewChat }: Props) => {
  const { socket } = useAuth();
  const sock = socket.current;
  const [keyword, setKeyword] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [selectUsers, setSelectUsers] = useState<User[]>([]);
  const clientFetch = useClientFetch();
  const [next, setNext] = useState(false);
  const [chatName, setChatName] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadUsers() {
      try {
        const exclude = selectUsers.map((u) => u.id).join(",");
        const res = await clientFetch(
          `/api/users?keyword=` +
            keyword +
            (exclude ? `&exclude=${exclude}` : ``)
        );

        const data = await res.json();
        if (mounted) setUsers(Array.isArray(data.data) ? data.data : []);
      } catch (err) {
        console.error(err);
      }
    }

    loadUsers();

    return () => {
      mounted = false;
    };
  }, [keyword, clientFetch, selectUsers]);

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

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return setFile(null);
    if (!f.type.startsWith("image/")) return toast.error("Only images allowed");
    if (f.size > 5 * 1024 * 1024) return toast.success("Max file size is 5MB");
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSelect = (user: User) => {
    setSelectUsers((prev) => {
      if (prev.find((u) => u.id === user.id)) return prev;
      return [...prev, user];
    });
    setUsers((prev) => prev.filter((u) => u.id !== user.id));
  };

  const handleDelete = (user: User) => {
    setSelectUsers((prev) => prev.filter((u) => u.id !== user.id));

    setUsers((prev) => {
      if (prev.find((u) => u.id === user.id)) return prev;
      return [...prev, user];
    });
  };

  const handleNext = () => {
    setNext(!next);
  };

  const createChat = async (
    e: React.FormEvent<HTMLFormElement> | React.MouseEvent
  ) => {
    e.preventDefault();
    setError(null);

    const uploaded = await uploadToCloudinary(file);
    const imageUrl = uploaded?.secure_url ?? null;
    const id = selectUsers.map((u) => u.id);
    if (id.length === 0)
      return toast.error("Must have atleast one user to chat");
    if (id.length > 1 && !chatName) return toast.error("Must have a chat name");
    try {
      const res = await clientFetch("/api/chats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, image: imageUrl, name: chatName }),
      });

      if (res.status === 400) {
        toast.error("You already have that chat");
      }
      const data = await res.json();
      setNewChat(data.data);
      const memberIds = selectUsers.map((user) => user.id)
      sock?.emit("chat_create", {chat: data.data, memberIds});
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setChatName(null);
      setFile(null);
      setPreview(null);
      setSelectUsers([]);
      setNext(false);
      handleCreate();
    }
  };
  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          createChat(e);
        }}
        className="fixed inset-0 z-40 flex items-center justify-center p-4 backdrop-blur-lg min-h-screen"
        onClick={handleCreate}
      >
        <div
          className="min-h-70 relative z-50 rounded-xl flex flex-col items-center space-y-4 border border-white/20 bg-black
  bg-[radial-gradient(1200px_circle_at_20%_-10%,rgba(56,189,248,0.25),transparent_40%),radial-gradient(900px_circle_at_80%_10%,rgba(168,85,247,0.25),transparent_80%)] w-full max-w-md p-6  "
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleCreate}
            className="relative bottom-4 right-50 text-slate-400 hover:text-white text-xl font-bold"
          >
            ×
          </button>

          <h1 className="text-lg font-bold underline">Create New Chat</h1>

          {!next && (
            <div className="mt-5 w-full flex-col inline-block items-center justify-center">
              {selectUsers?.map((user: User) => (
                <span
                  key={user.id}
                  className="inline-flex mb-0.5 items-center gap-2 px-3 py-1 rounded-xl bg-white/10 backdrop-blur border border-white/10 text-sm shadow mr-2"
                >
                  {user.username}
                  <button
                    onClick={() => handleDelete(user)}
                    className="text-gray-300 hover:text-red-400 transition"
                  >
                    ×
                  </button>
                </span>
              ))}

              <input
                onChange={(e) => {
                  setKeyword(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !next && selectUsers.length > 1) {
                    e.preventDefault();
                    handleNext();
                  }
                  if (e.key === "Enter" && selectUsers.length === 1) {
                    e.preventDefault();
                    handleCreate();
                  }
                }}
                type="text"
                required
                placeholder="Search for User"
                className="w-full rounded-xl bg-[#262A33] border border-[#374151]
                   px-4 py-3 text-sm text-white outline-none
                   focus:ring-2 focus:ring-slate-200
                   transition"
              />
              <div className="mt-4 w-full max-h-60 overflow-y-auto space-y-2">
                {users?.map((user: User) => (
                  <div
                    key={user.id}
                    onClick={() => handleSelect(user)}
                    className="flex items-center gap-3 p-2 rounded-lg bg-[#262A33] hover:bg-[#313644] cursor-pointer transition"
                  >
                    <img
                      src={user.image || "/avatar.png"}
                      alt={user.username}
                      className="w-8 h-8 rounded-full object-cover"
                    />

                    <div className="flex flex-col">
                      <span className="text-sm truncate font-medium text-white">
                        {user.username}
                      </span>
                      <span className="text-xs truncate text-gray-400">
                        {user.email}
                      </span>
                    </div>
                  </div>
                ))}

                {users.length === 0 && keyword && (
                  <p className="text-sm text-gray-400 text-center">
                    No users found
                  </p>
                )}
                {users.length === 0 && keyword.length === 0 && (
                  <p className="text-sm text-gray-400 text-center">
                    Type To Find Users
                  </p>
                )}
              </div>
            </div>
          )}

          {selectUsers.length === 1 && (
            <button
              type="submit"
              onClick={createChat}
              className="shadow-lg mt-4  bg-[#334155] px-16 py-2 w-full/2 rounded-full font-medium active:scale-105 hover:bg-[#64748B] cursor-pointer focus:outline-none focus:ring focus:ring-slate-200 focus:ring-offset-1 active:bg-[#64748B]"
            >
              Create Chat
            </button>
          )}

          {selectUsers.length > 1 && !next && (
            <button
              onClick={handleNext}
              className="shadow-lg mt-4 bg-[#334155] px-16 py-2 w-full/2 rounded-full font-medium    active:scale-105 hover:bg-[#64748B] cursor-pointer focus:outline-none focus:ring focus:ring-slate-200 focus:ring-offset-1 active:bg-[#64748B]"
            >
              Next
            </button>
          )}

          {next && (
            <div className="flex flex-col w-full max-w-sm gap-y-4 items-center justify-center">
              <input
                type="text"
                required
                placeholder="Enter chat name"
                onChange={(e) => setChatName(e.target.value)}
                className="w-full rounded-xl bg-[#262A33] border border-[#374151]
                   px-4 py-3 text-sm mb-2 mt-4 outline-none
                   focus:ring-2 focus:ring-[#6B7280]
                   transition"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && selectUsers.length > 1 && !next) {
                    e.preventDefault();
                    handleCreate();
                  }
                }}
              />
              <label
                htmlFor="profile-picture"
                className="inline-flex cursor-pointer items-center font-bold rounded-md border border-dashed px-3 py-2  focus:ring-2 focus:ring-white transition duration-300"
              >
                {"Upload profile picture"}
              </label>

              <input
                id="profile-picture"
                type="file"
                accept="image/*"
                onChange={handleFile}
                className="hidden"
              />
              {preview && (
                <div className="flex items-center gap-3">
                  <img
                    src={preview}
                    alt="preview"
                    className="w-20 h-20 rounded-full object-cover"
                  />
                </div>
              )}

              <button
                type="submit"
                onClick={createChat}
                className="shadow-lg mt-4 bg-[#334155] px-16 py-2 w-full/2 rounded-full font-medium transform transition duration-300 hover:scale-105 active:scale-105 hover:bg-[#64748B] cursor-pointer focus:outline-none focus:ring focus:ring-[#6B7280] focus:ring-offset-1 active:bg-[#64748B]"
              >
                Create Chat
              </button>
            </div>
          )}
          {!users && <p>Type to find Users</p>}
        </div>
        {error && <p className="text-red-600">{error}</p>}
      </form>
    </div>
  );
};

export default CreateChatHelper;
