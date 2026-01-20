"use client";

import CenterChat from "./CenterChat";
import LeftBar from "./LeftBar";
import RightBar from "./RightBar";
import { useEffect, useState } from "react";
import { Info, SquareMenu } from 'lucide-react';

type forMobile = "list" | "chat" | "info";

const ChatLayout = () => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  const [mobileView, setMobileView] = useState<forMobile>("list");

  useEffect(() => {
    if (!activeId) {
      setMobileView("list");
    } else {
      setMobileView("chat");
    }
  }, [activeId]);


  return (
    <div className=" bg-[radial-gradient(1200px_circle_at_20%_-10%,rgba(56,189,248,0.25),transparent_40%),radial-gradient(900px_circle_at_80%_10%,rgba(168,85,247,0.25),transparent_45%)] h-dvh overflow-x-hidden p-6">
      <div className="mx-auto h-full max-w-[1300px] rounded-2xl shadow-2xl border border-white/30 overflow-hidden ">
        <div className="md:hidden border-b border-white/5 bg-slate-900/70">
          
          <div className="flex items-center justify-between px-3 py-2">
            <button
              onClick={() => setMobileView("list")}
              className={`p-2 rounded-md ${
                mobileView === "list" ? "bg-white/6" : "hover:bg-white/3 text-gray-400"
              }`}
            >
             <SquareMenu />
            </button>

            <button
              disabled={!activeId}
              onClick={() => setMobileView("chat")}
              className={`text-lg font-semibold ${
                mobileView === "chat" ? "" : "text-gray-400"
              }`}
            >
              Chat
            </button>

            <button
              onClick={() => setMobileView("info")}
              className={`p-2 rounded-md ${
                mobileView === "info" ? "bg-white/6" : "hover:bg-white/3 text-gray-400"
              }`}
            >
              <Info />
            </button>
          </div>
        </div>

        <div className="h-full grid md:grid-cols-[minmax(220px,260px)_minmax(0,1.6fr)_minmax(220px,260px)]">
          <div className={`${mobileView === "list" ? "flex" : "hidden"} md:flex
              border-r border-gray-500 flex-col bg-gradient-to-b from-slate-900 to-slate-800 min-h-0`}>
            <LeftBar activeId={activeId} setActiveId={setActiveId} />
          </div>

          <div className={`${mobileView === "chat" ? "flex" : "hidden"} md:flex
              border-r border-gray-500 flex-col bg-gradient-to-b from-slate-900 to-slate-800 min-h-0`}>
            <CenterChat
              activeId={activeId}
              setActiveId={setActiveId}
              reload={reload}
              setReload={setReload}
            />
          </div>

          <div className={`${mobileView === "info" ? "flex" : "hidden"} md:flex
              border-r border-gray-500 flex-col bg-gradient-to-b from-slate-900 to-slate-800 min-h-0`}>
            <RightBar
              activeId={activeId}
              setActiveId={setActiveId}
              reload={reload}
              setReload={setReload}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatLayout;
