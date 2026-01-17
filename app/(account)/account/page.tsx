"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useClientFetch } from "@/lib/clientAuth";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

type User = {
  username: string;
  image: string | null;
  email: string;
};

const Page = () => {
  const [account, setAccount] = useState<User>();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [correctPassword, setCorrectPassword] = useState(false);
  const clientFetch = useClientFetch();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const getMe = useCallback(async () => {
    try {
      const res = await clientFetch("/api/users/me", {
        method: "GET",
      });

      if (!res.ok) {
        return;
      }

      const data = await res.json();

      const account = data?.data;
      setAccount(account);

      const username: string = data?.data?.username;
      setUsername(username);

      const image: string = data?.data?.image;
      setPreview(image);

      const email: string = data?.data?.email;
      setEmail(email);
    } catch (err) {
      console.error(err);
    } finally {
      setCurrentPassword("");
      setNewPassword("");
      setCorrectPassword(false);
    }
  }, [clientFetch]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!mounted) return;
      await getMe();
    })();

    return () => {
      mounted = false;
      if (preview && preview.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [getMe, preview]);

  const update = async (uploadFile?: File | null) => {
    try {
      let imageUrl: string | null = null;
      const fileToUpload =
        typeof uploadFile !== "undefined" ? uploadFile : file ?? null;

      const uploaded = await uploadToCloudinary(fileToUpload);

      imageUrl = uploaded.secure_url as string;

      const res = await clientFetch("/api/users/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          image: imageUrl,
          email,
          password: newPassword,
        }),
      });
      if (!res.ok) return toast.error("Can not update at the moment");
      getMe();
      toast.success("Account Updated");
    } catch (err) {
      console.error(err);
    }
  };

  const checkPassword = async () => {
    try {
      const res = await clientFetch("/api/users/me", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: currentPassword }),
      });

      if (!res.ok) {
        setCorrectPassword(false);
        return toast.error("Password Incorrect");
      }
      setCorrectPassword(true);
      return toast.success("Password Accepted");
    } catch (err) {
      console.error(err);
    }
  };

  const isValidEmail = (email: string) => {
    const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    return gmailRegex.test(email);
  };

  const validPassword = (password: string) => {
    if (!password) return false;
    const minLength = password.length >= 8;
    const hasNumber = /\d/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return minLength && hasNumber && hasUpper && hasLower && hasSpecial;
  };

  async function uploadToCloudinary(
    file: File | null,
    folder = "users/avatars"
  ) {
    if (!file) {
      return {
        public_id: "defaults/user-avatar",
        secure_url:
          "https://res.cloudinary.com/dptlaoyr2/image/upload/v1767468846/OIP.ghDeAxQENeJRnpp7tlZyCwHaHa_orc4ru.jpg",
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

    await getMe();

    return res.json();
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>): File | null => {
    const f = e.target.files?.[0];
    if (!f) {
      if (preview && preview.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
      setFile(null);
      setPreview(null);
      return null;
    }

    if (!f.type.startsWith("image/")) {
      toast.error("Only images allowed");
      return null;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast.error("Max file size is 5MB");
      return null;
    }

    setFile(f);
    setPreview(URL.createObjectURL(f));
    return f;
  };

  return (
  <div className="min-w-screen min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#020617] p-6">
  <div className="w-full max-w-lg flex flex-col items-center space-y-4 bg-gradient-to-b from-[#162434]/90 to-[#1d2d3a]/90 border border-white/10 shadow-2xl rounded-2xl px-6 py-10">
    <form className="w-full space-y-6" onSubmit={(e) => e.preventDefault()}>
      <h1 className="w-full text-center text-2xl font-extrabold ">
        Edit profile
      </h1>

      <div>
        <label htmlFor="username" className="block text-sm font-semibold  mb-2">
          Username
        </label>

        {isEditing ? (
          <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-3">
            <input
              id="username"
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === "Escape") setIsEditing(false);
                if (e.key === "Enter") {
                  if (!username) return toast.error("Username required");
                  e.preventDefault();
                  await update();
                  setIsEditing(false);
                }
              }}
              className="flex-1 px-3 py-2 rounded-lg bg-[#0F172A]/50 border border-[#334155] text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#60A5FA]/50"
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  if (!username) return toast.error("Username required");
                  await update();
                  setIsEditing(false);
                }}
                className="px-4 py-2 rounded-lg bg-gradient-to-br from-[#3B82F6] to-[#60A5FA] text-white font-semibold hover:opacity-95 disabled:opacity-60"
              >
                Save
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setUsername(account?.username ?? "");
                }}
                className="px-4 py-2 rounded-lg bg-[#475569] text-slate-100 hover:bg-[#64748B]"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p
            className="mt-2 cursor-pointer text-slate-100 hover:text-white"
            onClick={() => setIsEditing(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && setIsEditing(true)}
          >
            {username || <span className="text-slate-400">No username set</span>}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-semibold mb-2">
          Email
        </label>

        {isEditingEmail ? (
          <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-3">
            <input
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === "Escape") setIsEditingEmail(false);
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (!email) return toast.error("Email required");
                  if (!isValidEmail(email)) return toast.error("Use a valid @gmail.com address");
                  await update();
                  setIsEditingEmail(false);
                }
              }}
              className="flex-1 px-3 py-2 rounded-lg bg-[#0F172A]/50 border border-[#334155] text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#60A5FA]/50"
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  if (!email) return toast.error("Email required");
                  if (!isValidEmail(email)) return toast.error("Use a valid @gmail.com address");
                  await update();
                  setIsEditingEmail(false);
                }}
                className="px-4 py-2 rounded-lg bg-gradient-to-br from-[#3B82F6] to-[#60A5FA] text-white font-semibold hover:opacity-95"
              >
                Save
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsEditingEmail(false);
                  setEmail(account?.email ?? "");
                }}
                className="px-4 py-2 rounded-lg bg-[#475569] text-slate-100 hover:bg-[#64748B]"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p
            className="mt-2 cursor-pointer text-slate-100 hover:text-white"
            onClick={() => setIsEditingEmail(true)}
            
          >
            {email || <span className="text-slate-400">No email set</span>}
          </p>
        )}

        {email && !isValidEmail(email) && (
          <p className="text-red-400 text-sm mt-1">
            Email must be a valid @gmail.com address
          </p>
        )}
      </div>

      <div className="flex items-center justify-center">
        <label
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center cursor-pointer font-semibold rounded-md border border-[#60A5FA]/40 px-4 py-2 bg-[#1E293B]/70 text-slate-100 hover:bg-[#1E293B]"
        >
          Upload New Profile Picture
        </label>
        <input
          ref={fileInputRef}
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

      {preview && (
        <div className="flex items-center justify-center gap-4">
          <img src={preview} alt="preview" className="w-20 h-20 rounded-full object-cover ring-2 ring-white/20" />
          <p
            onClick={async () => {
              if (preview && preview.startsWith("blob:")) URL.revokeObjectURL(preview);
              setFile(null);
              const newFile = null;
              await update(newFile);
            }}
            className="text-sm text-rose-400 font-semibold hover:underline cursor-pointer"
          >
            Remove
          </p>
        </div>
      )}

      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => setIsEditingPassword(true)}
          className="text-md font-semibold text-sky-400 hover:underline"
        >
          Change password
        </button>
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="text-md font-semibold bg-gradient-to-br from-[#7d3bf6] to-[#3902b0]  px-4 py-3 rounded-xl hover:opacity-95 active:scale-95 transition"
        >
          Back to Chats
        </button>
      </div>
    </form>
  </div>

  {isEditingPassword && (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="fixed inset-0 backdrop-blur-xl" onClick={() => setIsEditingPassword(false)} />
      <div className="relative z-10 w-full max-w-md rounded-lg p-6 shadow-xl bg-gradient-to-br from-[#0B1220] via-[#111C2F] to-[#020617] border border-white/10">
        <h3 className="text-lg font-bold">Change password</h3>

        <div className="mt-4 space-y-3">
          <label className="block text-sm font-medium text-slate-200">
            Current password
          </label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === "Enter") await checkPassword();
              if (e.key === "Escape") setIsEditingPassword(false);
            }}
            className="w-full px-3 py-2 rounded-lg bg-[#0F172A]/60 border border-[#334155] text-slate-100 focus:outline-none focus:ring-2 focus:ring-white/20"
            autoComplete="current-password"
          />

          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={async () => {
                await checkPassword();
              }}
              className="px-4 py-2 rounded-lg bg-gradient-to-br from-[#3B82F6] to-[#60A5FA] text-white font-semibold"
            >
              Verify
            </button>

            <button
              type="button"
              className="px-4 py-2 rounded-lg bg-[#CBD5E1] text-slate-800 hover:bg-[#E2E8F0]"
              onClick={() => setIsEditingPassword(false)}
            >
              Close
            </button>
          </div>

          {correctPassword && (
            <>
              <label className="block text-sm font-medium text-slate-200 mt-2">
                New password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === "Escape") setIsEditingPassword(false);
                  if (e.key === "Enter") {
                    if (!validPassword(newPassword)) return toast.error("Password not strong enough");
                    await update();
                    setIsEditingPassword(false);
                  }
                }}
                className="w-full px-3 py-2 rounded-lg bg-[#0F172A]/60 border border-[#334155] text-slate-100 focus:outline-none focus:ring-2 focus:ring-white/20"
                autoComplete="new-password"
              />

              {!validPassword(newPassword) ? (
                <div className="flex flex-col items-center text-sm font-bold text-red-400 mt-2">
                  <div>Password must include:</div>
                  <ul className="list-disc list-inside mt-2 text-sm font-semibold">
                    <li className={newPassword.length >= 8 ? "text-green-400" : "text-red-400"}>8+ characters</li>
                    <li className={/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) ? "text-green-400" : "text-red-400"}>Upper & lower case</li>
                    <li className={/[\d]/.test(newPassword) ? "text-green-400" : "text-red-400"}>Number</li>
                    <li className={/[!@#$%^&*(),.?\":{}|<>]/.test(newPassword) ? "text-green-400" : "text-red-400"}>Special character</li>
                  </ul>
                  <button
                    type="button"
                    className="mt-3 px-4 py-2 rounded-lg bg-[#CBD5E1] text-slate-800"
                    onClick={() => setIsEditingPassword(false)}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!validPassword(newPassword)) return toast.error("Password not strong enough");
                      await update();
                      setIsEditingPassword(false);
                    }}
                    className="px-4 py-2 rounded-lg bg-emerald-500 text-white font-semibold"
                  >
                    Update password
                  </button>

                  <button
                    type="button"
                    className="px-4 py-2 rounded-lg bg-[#CBD5E1] text-slate-800"
                    onClick={() => setIsEditingPassword(false)}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )}
</div>

  );
};

export default Page;
