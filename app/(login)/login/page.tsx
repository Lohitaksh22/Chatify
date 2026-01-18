"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/app/contexts/AuthContext";
import toast from "react-hot-toast";

const Page = () => {
  const router = useRouter();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string | null>();
  const [isLoading, setIsLoading] = useState(false);
  const auth = useAuth()

  const validPassword = (password: string) => {
    if (!password) return false;
    const minLength = password.length >= 8;
    const hasNumber = /\d/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return minLength && hasNumber && hasUpper && hasLower && hasSpecial;
  }

    const isValidEmail = (email: string) => {
    const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    return gmailRegex.test(email);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.msg || "Login failed");
      }

      if(res.status === 401){
        toast.error("Invalid password Please enter a correct one")
      }
      const data = await res.json()
      auth?.setToken(data.accessToken)
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }

  const handleEmail = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setEmail(e.target.value);
  };

  const handlePassword = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setPassword(e.target.value);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#020617] flex items-center justify-center px-4 sm:px-6 ">
      <form className="flex flex-col items-center space-y-4 max-w-md w-full bg-[#1F2933] border border-white/20 p-8 rounded-2xl shadow-xl shadow-black/90">
        <h1 className="text-3xl font-bold mb-4 text-center">Login Here</h1>

        <input
          onChange={handleEmail}
          type="text"
          required
          placeholder="Enter Email"
          className="w-full mt-5 outline-none bg-[#262A33] border border-[#374151] rounded-xl px-4 py-2
           focus:ring-2 focus:ring-slate-200 transition duration-300"
        />

        <input
          onChange={handlePassword}
          type="password"
          placeholder="Password"
          required
          className="
        outline-none border bg-[#262A33] border-[#374151] rounded-xl px-4 py-2
          w-full invalid:border-pink-500 invalid:text-pink-500  focus:ring-2 focus:ring-slate-200 transition duration-300"
        />

        {error && <p className="text-red-600">{error}</p>}

        {isValidEmail(email) && validPassword(password) &&
          <button
            type="submit"
            onClick={handleSubmit}
             disabled={!isValidEmail(email) || !validPassword(password)}
            className="shadow-lg mt-4 disabled:cursor-not-allowed    bg-[#334155] px-16 py-2 w-full rounded-full font-medium transform transition duration-300 hover:scale-105 active:scale-105 hover:bg-[#64748B] cursor-pointer focus:outline-none focus:ring focus:ring-slate-200 focus:ring-offset-1 active:bg-[#64748B]"
          >
            {isLoading ? "Going to Messages..." : "Go to Messages"}
          </button>

        }
        

        <div className="flex space-x-2 mt-5 text-sm">
          <p>Visiting for the first time?</p>
          <a className="font-semibold" href="/register">
            Register here
          </a>
        </div>
      </form>
    </div>
  );
};

export default Page;
