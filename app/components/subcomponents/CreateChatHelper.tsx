"use client";
import { useState, useEffect } from "react";




type Props = {
  handleCreate: () => void;
};

type User = {
  username: string,
  email: string,
  id: string,
  image?: string
}

const CreateChatHelper = ({ handleCreate }: Props) => {
  const [keyword, setKeyword] = useState("");
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    let mounted = true;

    async function loadUsers() {
      try {
        const res =  await fetch("/api/users?keyword=" + keyword, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        
      });
       
        const data = await res.json();
        if (mounted) setUsers(Array.isArray(data.data) ? data.data : []);
      } catch (err) {
        console.error(err)
      }
    }

    loadUsers();

    return () => {
      mounted = false;
    };
  }, [keyword]);

  return (
    <div>
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4 backdrop-blur-sm min-h-screen">
        <div className="relative z-50 rounded-xl flex flex-col items-center space-y-4 bg-[radial-gradient(1200px_circle_at_20%_-10%,rgba(56,189,248,0.25),transparent_40%),radial-gradient(900px_circle_at_80%_10%,rgba(168,85,247,0.25),transparent_45%)] shadow-2xl w-full max-w-md p-6 ">
          <button
            onClick={handleCreate}
            className="relative bottom-4 right-50 text-gray-200 hover:text-gray-800 text-xl font-bold"
          >
            ×
          </button>

          <div>
            <input
              onChange={(e) => {
                setKeyword(e.target.value);
              }}
              type="text"
              required
              placeholder="Search for User"
              className="w-full mt-5 outline-none bg-[#262A33] border border-[#374151] rounded-xl px-4 py-2
           focus:ring-2 focus:ring-gray-300 transition duration-300"
            />
              <div className="mt-4 w-full max-h-60 overflow-y-auto space-y-2">
  {users?.map((user: User) => (
    <div
      key={user.id}
      className="flex items-center gap-3 p-2 rounded-lg bg-[#262A33] hover:bg-[#313644] cursor-pointer transition"
    >
      <img
        src={user.image || "/avatar.png"}
        alt={user.name}
        className="w-8 h-8 rounded-full object-cover"
      />

      <div className="flex flex-col">
        <span className="text-sm font-medium text-white">
          {user.username}
        </span>
        <span className="text-xs text-gray-400">
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
</div>
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateChatHelper;
