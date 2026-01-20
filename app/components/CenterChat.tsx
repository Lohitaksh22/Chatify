"use client";

import React, { useEffect, useRef, useState } from "react";
import { useClientFetch } from "@/lib/clientAuth";
import Messages from "./Messages";
import { useAuth } from "../contexts/AuthContext";

type Props = {
  activeId: string | null;
  setActiveId: React.Dispatch<React.SetStateAction<string | null>>;
  reload: number;
  setReload: React.Dispatch<React.SetStateAction<number>>;
};

type Conversation = {
  id: string;
  name: string;
  lastMessage?: string;
  lastMessageAt?: Date;
  image?: string;
};

const CenterChat = ({ activeId, setActiveId, reload, setReload }: Props) => {
  const clientFetch = useClientFetch();
  const { socket } = useAuth();
  const [chatData, setChatData] = useState<Conversation | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const lastJoinedRef = useRef<string | null>(null);

  // Join/leave rooms + typing listeners
  useEffect(() => {
    const sock = socket?.current;
    if (!sock) return;

    

    const onUserTyping = ({ chatId, username }: { chatId: string; username: string }) => {
      if (!activeId || chatId !== activeId) return;
      setTypingUsers((prev) => (prev.includes(username) ? prev : [...prev, username]));
    };

    const onUserStopTyping = ({ chatId, username }: { chatId: string; username: string }) => {
      if (!activeId || chatId !== activeId) return;
      setTypingUsers((prev) => prev.filter((u) => u !== username));
    };

    sock.on("user_typing", onUserTyping);
    sock.on("user_stop_typing", onUserStopTyping);

   
    

    return () => {
      sock.off("user_typing", onUserTyping);
      sock.off("user_stop_typing", onUserStopTyping);
     
    };
  }, [socket, activeId]);


  useEffect(() => {
    let mounted = true;

    async function fetchChatData() {
      if (!activeId) return;
      try {
        const res = await clientFetch(`/api/chats/${activeId}`, { method: "GET" });
        if (!res.ok) return;

        const data = await res.json();
        if (!mounted) return;
        setChatData(data.data);
      } catch (err) {
        if (mounted) setChatData(null);
        console.error(err);
      }
    }

    fetchChatData();
    return () => {
      mounted = false;
    };
  }, [activeId, setActiveId, clientFetch, reload]);

  

  return (
    <main className="flex flex-col h-full min-h-0">
      <div className="shrink-0 border-b px-6 py-4">
        {chatData && (
          <div className="flex items-center">
            <img
              src={chatData?.image}
              alt={`${chatData.name} avatar`}
              className="w-12 h-12 rounded-full object-cover"
            />
            <div className="ml-4">
              <h1 className="text-xl font-bold truncate">{chatData.name}</h1>

              {typingUsers.length > 0 && (
                <span className="text-[11px] text-slate-400">
                  {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 min-h-0">
          <Messages
            activeId={activeId}
            setActiveId={setActiveId}
            reload={reload}
            setReload={setReload}
          />
        </div>
      </div>
    </main>
  );
};

export default CenterChat;
