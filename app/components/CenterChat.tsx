"use client";

import { useEffect, useState } from "react";
import { useClientFetch } from "@/lib/clientAuth";
import Messages from "./Messages";

type Props = {
  activeId: string | null;
  setActiveId: React.Dispatch<React.SetStateAction<string | null>>;
    reload: number
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
  const [chatData, setChatData] = useState<Conversation | null>(null);
  useEffect(() => {
    let mounted = true;

    async function fetchChatData() {
      if (!activeId) return;
      try {
        const res = await clientFetch(`/api/chats/${activeId}`, {
          method: "GET",
        });
        if (!res.ok) {
          console.error("Failed to fetch chat data");
          return;
        }

        if (!mounted) return;

        const data = await res.json();
        console.log(data.data);
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
<main className="flex flex-col h-screen">
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
            </div>
          </div>
        )}
      </div>

      
      <div className="flex-1 flex overflow-hidden">
        
        <div className="flex-1 h-full">
          <Messages activeId={activeId} setActiveId={setActiveId} reload={reload} setReload={setReload} />
        </div>
      </div>

      
        
    </main>
  );
};

export default CenterChat;
