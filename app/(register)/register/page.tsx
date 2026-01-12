"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";



const Page = () => {
  const router = useRouter();
  const [username, setUsername] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [preview, setPreview] = useState<string | null>(null);

  async function uploadToCloudinary(
  file: File | null,
  folder = "users/registrations"
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

  return res.json();
}


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

  const handleUsername = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setUsername(e.target.value);
  };
  const handleEmail = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setEmail(e.target.value);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const f = e.target.files?.[0];
    if (!f) return setFile(null);
    if (!f.type.startsWith("image/")) return setError("Only images allowed");
    if (f.size > 5 * 1024 * 1024) return setError("Max file size is 5MB");
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handlePassword = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setPassword(e.target.value);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      let imageUrl: string | null = null;

     
        const uploaded = await uploadToCloudinary(file);
        imageUrl = uploaded.secure_url as string;
      
        

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, password, image: imageUrl }),
      });


      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.msg || "Registration failed");
      }

      router.push("/login");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#020617] min-h-screen flex items-center justify-center">
      <form className="flex flex-col items-center space-y-4 max-w-md w-full bg-[#1F2933]  border border-white/20 p-8 rounded-2xl shadow-xl shadow-black/90">
        <h1 className="text-3xl font-bold mb-4 text-center">Register Here</h1>

        <input
          onChange={handleUsername}
          type="text"
          required
          placeholder="Enter Username to Chat"
          className="w-full mt-5 outline-none bg-[#262A33] border border-[#374151] rounded-xl px-4 py-2
           focus:ring-2 focus:ring-slate-200 transition duration-300"
        />

        <input
          onChange={handleEmail}
          type="email"
          required
          placeholder="Enter Email"
          className="w-full  outline-none bg-[#262A33] border border-[#374151] rounded-xl px-4 py-2
           focus:ring-2 focus:ring-slate-200 transition duration-300"
        />

        {email && !isValidEmail(email) && (
          <p className="text-red-500 text-sm">
            Email must be a valid @gmail.com address
          </p>
        )}

        <input
          onChange={handlePassword}
          type="password"
          placeholder="Password"
          className="
        outline-none border bg-[#262A33] border-[#374151] rounded-xl px-4 py-2
          w-full invalid:border-pink-500 invalid:text-pink-500  focus:ring-2 focus:ring-slate-200 transition duration-300"
        />

        <label
          htmlFor="profile-picture"
          className="inline-flex cursor-pointer items-center font-bold rounded-md border px-3 py-2  focus:ring-2 focus:ring-white transition duration-300"
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

        {validPassword(password) && isValidEmail(email) ? (
          <button
            onClick={handleSubmit}
            type="submit"
            className="shadow-lg mt-4 mb-4 bg-[#334155] px-16 py-2 w-full rounded-full font-medium transform transition duration-300 hover:scale-105 active:scale-105 hover:bg-[#64748B] cursor-pointer focus:outline-none focus:ring focus:ring-slate-200 focus:ring-offset-1 active:bg-[#64748B]"
          >
            {isLoading ? "Signing up..." : "Sign Up"}
          </button>
        ) : (
          <div className= "text-sm font-bold  leading-relaxed mt-2" >
            Password must include:
            <ul className="list-disc list-inside text-red-500 text-sm font-semibold ">
              <li
                className={
                  password.length >= 8 ? "text-green-500" : "text-red-500"
                }
              >
                8+ characters{}
              </li>
              <li
                className={
                  /[A-Z]/.test(password) && /[a-z]/.test(password)
                    ? "text-green-500"
                    : "text-red-500"
                }
              >
                Upper & lower case
              </li>
              <li
                className={
                  /[\d]/.test(password) ? "text-green-500" : "text-red-500"
                }
              >
                Number
              </li>
              <li
                className={
                  /[!@#$%^&*(),.?":{}|<>]/.test(password)
                    ? "text-green-500"
                    : "text-red-500"
                }
              >
                Special character
              </li>
            </ul>
          </div>
        )}

        {error && <p className="text-red-600">{error}</p>}
      </form>
    </div>
  );
};

export default Page;
