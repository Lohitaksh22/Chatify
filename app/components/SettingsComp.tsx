import { Settings } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";

import { LogOut, UserRoundPen } from 'lucide-react';


const SettingsComp = () => {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter()
  const {logout} = useAuth()
 

  const handleClick = () => {
    setIsOpen(!isOpen);
  };

  const logoutHandler = async () => {
       logout()
      router.push("/login")
  }
  return (
    <div className="relative inline-flex">
  <button
    onClick={handleClick}
    className="rounded-full p-2 hover:scale-105 cursorr-pointer transition"
  >
    <Settings />
  </button>

  {isOpen && (
    <div 
    onClick={handleClick}
    className="fixed inset-0 z-40 flex items-center justify-center backdrop-blur-xl p-6">
      <div
      onClick={(e) => e.stopPropagation()}
      className="relative z-50 w-full min-h-60 max-w-sm rounded-2xl bg-[radial-gradient(1200px_circle_at_20%_-10%,rgba(56,189,248,0.25),transparent_40%),radial-gradient(900px_circle_at_80%_10%,rgba(168,85,247,0.25),transparent_45%)] shadow-2xl p-6 space-y-10">
      
        <button
          onClick={handleClick}
          className="absolute top-4 left-4  hover:text-gray-700 transition text-xl"
 
        >
          ×
        </button>


        <h2 className="text-xl font-bold text-center">
          Settings
        </h2>

        <div className="flex flex-col gap-3">
          <button
            title="Update Your Account Credentials"
            onClick={() => router.push('/account')}
            className="flex items-center gap-3 rounded-lg bg-slate-400 border border-gray-200 px-4 py-3 hover:bg-gray-50 transition"
          >
            <UserRoundPen className="text-gray-700" />
            <span className="text-sm font-medium text-gray-800">
              Account Settings
            </span>
          </button>

          <button
            onClick={logoutHandler}
            className="flex items-center gap-3 rounded-lg border border-white/10 bg-slate-700 px-4 py-3 hover:bg-black transition"
          >
            <LogOut size={20} className="" />
            <span className="text-sm font-medium">
              Log out
            </span>
          </button>
        </div>
      </div>
    </div>
  )}
</div>

  );
};

export default SettingsComp;
