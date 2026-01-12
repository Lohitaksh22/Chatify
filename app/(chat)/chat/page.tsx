"use client";
import { useState, useEffect, useCallback } from "react";
import { useClientFetch } from "@/lib/clientAuth";
import { error } from "console";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

type User = {
  username: string;
  image: string | null;
  email: string;
};

type Props = {
  setAccountOpen: React.Dispatch<React.SetStateAction<boolean>>;
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
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const getMe = useCallback(async () => {
     setIsLoading(true);
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
       setIsLoading(false);
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
      if (preview  && preview.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [getMe, preview]);

  const update = async (uploadFile?: File | null) => {
    try {
      let imageUrl: string | null = null;
       const fileToUpload = typeof uploadFile!== "undefined" ? uploadFile: file ?? null;

    const uploaded = await uploadToCloudinary(fileToUpload);


      console.log("upload url:", `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/upload`)

      imageUrl = uploaded.secure_url as string;
      if(imageUrl) console.log(imageUrl);
      

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

    await getMe()

    return res.json();
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>): File | null  => {
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
    return f
  };



  return (
    <div className="min-w-screen min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#020617]">
      <div
        className="flex flex-col items-center justify-start  space-y-4 w-full max-w-lg bg-[#DCE7F5] 
 shadow-xl rounded-2xl px-4 py-10 text-black"
      >
        <form
         
          className="space-y-6"
        >
          <h1 className=" flex justify-center items-center text-2xl font-extrabold text-from-[#0F172A] via-[#1E293B] to-[#020617] ">
            Edit profile
          </h1>

          <div>
            <label className="block text-md font-semibold text-gray-700">
              Username
            </label>

            {isEditing ? (
              <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:space-x-4 gap-3">
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
                  className="flex justify-start px-3 py-2 rounded-lg border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={async() => {
                      if (!username) return toast.error("Username required");
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
                      setUsername(account?.username ?? "");
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
                {username}
              </p>
            )}
          </div>

          <div>
            <label className="block text-md font-semibold text-gray-700">
              Email
            </label>

            {isEditingEmail ? (
              <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:space-x-4 gap-3">
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                   onKeyDown={async (e) => {
                    if (e.key === "Escape") setIsEditingEmail(false);;
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (!email) return toast.error("Email required");
                      if (!isValidEmail(email))
                        return toast.error("Use a valid @gmail.com address");
                      await update();
                      setIsEditingEmail(false);
                    }
                  }}
                  className="flex-1 px-3 py-2 rounded-lg border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!email) return toast.error("Email required");
                      if (!isValidEmail(email))
                        return toast.error("Use a valid @gmail.com address");
                      await update();
                      setIsEditingEmail(false);
                    }}
                    className="bg-blue-500  px-4 py-2 rounded-lg hover:opacity-90"
                  >
                    Save
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingEmail(false);
                      setEmail(account?.email ?? "");
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
                onClick={() => setIsEditingEmail(true)}
                onKeyDown={(e) => e.key === "Enter" && setIsEditingEmail(true)}
              >
                {email || <span className="text-gray-400">No email set</span>}
              </p>
            )}

            {email && !isValidEmail(email) && (
              <p className="text-red-500 text-sm mt-1">
                Email must be a valid @gmail.com address
              </p>
            )}
          </div>

          <label
           
            htmlFor="profile-picture"
            className="inline-flex cursor-pointer items-center font-bold rounded-md border px-3 py-2  focus:ring-2 focus:ring-white transition duration-300"
          >
            {"Upload New Profile Picture"}
          </label>

          <input
            id="profile-picture"
            type="file"
            accept="image/*"
            onChange={async(e) => {
              const newFile = handleFile(e)
              await update(newFile ?? null)
            }}
           
            className="hidden"
          />

          {preview && (
            <div className="flex items-center gap-3">
              <img
                src={preview}
                alt="preview"
                className="w-20 h-20 rounded-full object-cover"
              />

              <p onClick={async() => {
                if (preview && preview.startsWith("blob:")) URL.revokeObjectURL(preview);
                setFile(null)
                setPreview(null)
                await update()

              }} className="text-sm text-red-600 font-semibold hover:underline">Remove</p>
            </div>


          )}

          <div className="flex justify-center items-center">
            <button
              type="button"
              onClick={() => setIsEditingPassword(true)}
              className=" text-md font-semibold text-blue-600 hover:underline"
            >
              Change password
            </button>
          </div>

          <div className="flex justify-center items-center">
            <button
              type="button"
              onClick={() => router.push("/")}
              className=" text-md font-semibold bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#020617] text-gray-200 hover:opacity-90 active:scale-105 px-4 py-3 rounded-xl"
            >
              Back to Chats
            </button>
          </div>
        </form>
      </div>

      {isEditingPassword && (
        <div className=" fixed inset-0 z-50 flex items-center justify-center px-4 backdrop-blur-lg ">
          <div
            className="fixed inset-0  backdrop-blur-lg "
            onClick={() => setIsEditingPassword(false)}
          />
          <div className="relative z-10 w-full max-w-md  rounded-lg p-6 shadow-lg bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#020617]">
            <h3 className="text-lg font-bold">Change password</h3>

            <div className="mt-4 space-y-3">
              <label className="block text-sm font-medium">
                Current password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === "Enter") {
                    await checkPassword();
                  }

                  if (e.key === "Escape") {
                    setIsEditingPassword(false);
                  }
                }}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-white"
                autoComplete="current-password"
              />
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={async () => {
                    await checkPassword();
                  }}
                  className="bg-blue-500  px-4 py-2 rounded-lg"
                >
                  Verify
                </button>

                <button
                  type="button"
                  className=" bg-[#DCE7F5] text-slate-700 px-4 py-2 rounded-lg"
                  onClick={() => setIsEditingPassword(false)}
                >
                  Close
                </button>
              </div>

              {correctPassword && (
                <>
                  <label className="block text-sm font-medium mt-2">
                    New password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === "Escape") {
                        setIsEditingPassword(false);
                      }

                      if (e.key === "Enter") {
                        if (!validPassword(newPassword))
                          return toast.error("Password not strong enough");
                        await update();
                        setIsEditingPassword(false);
                      }
                    }}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-white"
                    autoComplete="new-password"
                  />

                  {!validPassword(newPassword) ? (
                    <div className=" flex flex-col items-center justify-center text-sm font-bold text-red-500 leading-relaxed mt-2 ">
                      Password must include:
                      <ul className="list-disc list-inside text-red-500 text-sm font-semibold ">
                        <li
                          className={
                            newPassword.length >= 8
                              ? "text-green-500"
                              : "text-red-500"
                          }
                        >
                          8+ characters{}
                        </li>
                        <li
                          className={
                            /[A-Z]/.test(newPassword) &&
                            /[a-z]/.test(newPassword)
                              ? "text-green-500"
                              : "text-red-500"
                          }
                        >
                          Upper & lower case
                        </li>
                        <li
                          className={
                            /[\d]/.test(newPassword)
                              ? "text-green-500"
                              : "text-red-500"
                          }
                        >
                          Number
                        </li>
                        <li
                          className={
                            /[!@#$%^&*(),.?":{}|<>]/.test(newPassword)
                              ? "text-green-500"
                              : "text-red-500"
                          }
                        >
                          Special character
                        </li>
                      </ul>
                      <button
                        type="button"
                        className="bg-[#DCE7F5] text-slate-700 font-normal  px-4 py-2 rounded-lg mt-3"
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
                          if (!validPassword(newPassword))
                            return toast.error("Password not strong enough");
                          await update();
                          setIsEditingPassword(false);
                        }}
                        className="bg-green-600  px-4 py-2 rounded-lg"
                      >
                        Update password
                      </button>

                      <button
                        type="button"
                        className="bg-[#DCE7F5] text-slate-700  px-4 py-2 rounded-lg"
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
