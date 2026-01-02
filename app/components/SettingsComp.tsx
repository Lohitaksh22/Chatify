import { Settings } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

const SettingsComp = () => {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter()

  const handleClick = () => {
    setIsOpen(!isOpen);
  };

  const logout = async () => {
       await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        
      });
      router.push("/login")
  }
  return (
    <div className="inline-flex">
      <Settings onClick={handleClick}></Settings>

      {isOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 backdrop-blur-sm min-h-screen">
          <div className="relative z-50 rounded-xl flex flex-col items-center space-y-4 bg-[#F5F5F5] shadow-2xl w-full max-w-md p-6 ">
            <button
              onClick={handleClick}
              className="relative bottom-4 right-50 text-gray-600 hover:text-gray-800 text-xl font-bold"
            >
              ×
            </button>

            <button onClick={logout} className="bg-black">Logout</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsComp;
