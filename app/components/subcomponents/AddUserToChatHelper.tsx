"use client";

import { useState, useEffect } from "react";
import { useClientFetch } from "@/lib/clientAuth";

type Props = {
  addUserToChat: (usernames: string[]) => Promise<string | undefined>;
  setAddingUser: React.Dispatch<React.SetStateAction<boolean>>;
  activeId: string | null
};

type User = {
  username: string;
  email: string;
  id: string;
  image?: string;
};

function AddUserToChatHelper({ addUserToChat, setAddingUser, activeId }: Props) {
  const [keyword, setKeyword] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [selectUsers, setSelectUsers] = useState<User[]>([]);
  const clientFetch = useClientFetch();

  useEffect(() => {
    let mounted = true;

    async function loadUsers() {
      try {
        const exclude = selectUsers.map((u) => u.id).join(",");
        const res = await clientFetch(
          `/api/chats/${activeId}/members?keyword=` +
            keyword +
            (exclude ? `&exclude=${exclude}` : ``),{method: "GET"}
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
  return (
    <div  onClick={() => setAddingUser(false)}
    className="fixed inset-0 z-40 flex items-center justify-center p-4 backdrop-blur-lg min-h-screen">
      <div
      onClick={(e) => e.stopPropagation()}
        className="min-h-70 relative z-50 rounded-xl flex flex-col items-center space-y-4 border border-white/20
  bg-[radial-gradient(1200px_circle_at_20%_-10%,rgba(56,189,248,0.25),transparent_40%),radial-gradient(900px_circle_at_80%_10%,rgba(168,85,247,0.25),transparent_80%)] w-full max-w-md p-6  "
      >
        
        <button
          onClick={() => setAddingUser(false)}
          className="relative bottom-4 right-50 text-gray-200 hover:text-gray-800 text-xl font-bold"
        >
          ×
        </button>

        <h1 className="text-lg font-bold underline">Add User to Chat</h1>
        

        { (
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
              type="text"
              required
              placeholder="Search for User"
              className="w-full rounded-xl bg-[#262A33] border border-[#374151]
                   px-4 py-3 text-sm outline-none
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
                <p className="mt-4 text-sm text-gray-400 text-center">
                  No users found
                </p>
              )}

               {users.length==0 && !keyword && <p className="mt-4 text-gray-400 text-sm font-bold text-center">Type to Find Users</p>}
            </div>
          </div>
        )}

        {selectUsers.length > 0 && (
          <button
            type="button"
            onClick={() => {
              if (selectUsers.length === 0) {
                return;
              }
              const usernames: string[] = selectUsers.map((u) => u.username);

              addUserToChat(usernames);
            }}
            className="shadow-lg mt-4  bg-[#334155] px-16 py-2 w-full/2 rounded-full font-medium transform transition duration-300 hover:scale-105 active:scale-105 hover:bg-[#64748B] cursor-pointer focus:outline-none focus:ring focus:ring-[#6B7280] focus:ring-offset-1 active:bg-[#64748B]"
          >
            Add User(s)
          </button>
        )}

       
      </div>
      
    </div>
  );
}

export default AddUserToChatHelper;
