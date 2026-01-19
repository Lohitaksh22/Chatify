"use client";

import React, { useEffect, useState } from "react";
import { MessageCirclePlus, Search } from "lucide-react";
import { useClientFetch } from "@/lib/clientAuth";
import CreateChatHelper from "./subcomponents/CreateChatHelper";
import { dateCalc } from "@/lib/dateCalc";
import { useAuth } from "../contexts/AuthContext";

type Conversation = {
  name: string | null;
    id: string;
    image: string | null;
    createdAt: Date;
    isGroup: boolean;
    lastMessageAt: Date | null;
    lastMessage: string | null;
  
};

type Props = {
  activeId: string | null
  setActiveId: React.Dispatch<React.SetStateAction<string | null>>
}

const LeftBar = ({activeId, setActiveId}: Props) => {
  const [chat, setChat] = useState<Conversation[]>();
 
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const clientFetch = useClientFetch();
  const [keyword, setKeyword] = useState("");
  const [reloadChats, setReloadChats] = useState(0);
  const {socket} = useAuth()
  const sock = socket.current
  const [newChat, setNewChat] = useState<Conversation | null>(null);



  const handleCreate = () => {
    setIsCreateOpen(!isCreateOpen);
    setReloadChats((i) => i + 1);
  };

  useEffect(() => {
    if (!sock) return;   

    sock.on("left_member", () => {
      setReloadChats((i) => i + 1);
    });

    sock.on("new_message", () => {
      setReloadChats((i) => i + 1);
    }); 

    sock.on("chat_updated", ({ chatId, updatedChat }: { chatId: string; updatedChat: Conversation }) => { 
      if (chatId !== activeId) return;
      setChat(prev => {
        if (!prev) return prev; 
        return prev.map(currentChat => currentChat.id === chatId ? updatedChat : currentChat);
      });
      setReloadChats((i) => i + 1);
    });

    sock.on("chat_created", (chat: Conversation) => {
      setChat(prev => {
    if (!prev) return [chat];         
    return [...prev, chat];    
      });
      setReloadChats((i) => i + 1);
    })

    return () => {
      sock.off("new_message");
      sock.off("left_member");
      sock.off("chat_updated");
      sock.off("chat_created")
    };      
  }, [sock, activeId]);

 
  

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const url = keyword.trim()
          ? `/api/chats/search?keyword=${encodeURIComponent(keyword.trim())}`
          : `/api/chats`;

        const res = await clientFetch(url, { method: "GET" });
        if (!mounted) return;

        if (!res.ok) {
          setChat([]);
          return;
        }

        const payload = await res.json();
        const gotChats = Array.isArray(payload.data) ? payload.data : [];

        if (!mounted) return;

        setChat(gotChats);
        console.log(gotChats);
        

        if (!activeId && gotChats.length > 0) {
          setActiveId(gotChats[0].id);
        }
      } catch (err) {
        console.error(err);
        if (mounted) setChat([]);
      }
    }

    load();
    

    return () => {
      mounted = false;
    };
  }, [keyword, clientFetch, activeId, reloadChats, setActiveId]);
  


  return (
    <>
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className=" w-full  h-screen   p-6 py-8 rounded-2xl shadow-lg select-none flex flex-col">
        <div className="flex items-center mb-4 justify-between">
          <h1 className="font-bold text-2xl cursor-pointer text-white">
            Chatify
          </h1>
          <button
            className="p-2 rounded-full hover:opacity-80 active:scale-95 transition"
          >
            <MessageCirclePlus color="white" onClick={handleCreate} />
          </button>
        </div>
        {isCreateOpen && <CreateChatHelper handleCreate={handleCreate} setNewChat={setNewChat} />}

        <div className="relative w-full mt-5 mb-7">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search"
            value={keyword}
            className="w-full pl-10 pr-3 py-2 rounded-2xl bg-[#262A33] placeholder:text-gray-400 text-sm  outline-none focus:ring-2 focus:ring-slate-200"
            onChange={(e) => {
              setKeyword(e.target.value);
            }}
          />
        </div>

        <div className="flex flex-col overflow-auto flex-1 mb-10 scroll-smooth no-scrollbar ">
          {chat ? (
            chat?.map((c) => {
              const isActive = c.id === activeId;
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setActiveId(c.id);
                  }}
                  className={`w-full flex items-center gap-4  px-3 py-4 rounded-lg transition text-left mb-5  
                ${
                  isActive
                    ? "bg-white/6 ring-1 ring-indigo-400/20"
                    : "hover:bg-white/3"
                }
              `}
                  
                >
                  <div className="flex">
                    <img
                      src={c?.image ?? undefined}
    
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p
                        className={`text-sm font-medium truncate ${
                          isActive ? "text-white font-extrabold" : ""
                        }`}
                      >
                        {c.name}
                      </p>
                      <span className="text-xs text-gray-400">
                        {dateCalc(c?.lastMessageAt ?? "")}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-1 mb-2">
                      <p
                        className={`${
                          isActive ? "" : "text-gray-400"
                        } truncate text-xs`}
                      >
                        {c.lastMessage ?? "No messages yet"}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="flex items-center justify-center mx-auto">
              <p className="text-gray-600  font-bold text-sm">No Chats Found</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default LeftBar;
