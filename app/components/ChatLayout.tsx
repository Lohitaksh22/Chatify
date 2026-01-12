"use client"

import CenterChat from "./CenterChat"
import LeftBar from "./LeftBar"
import RightBar from "./RightBar"
import { useState } from "react"

const ChatLayout = () => {
   const [activeId, setActiveId] = useState<string | null>(null);
   const [reload, setReload] = useState(0)
  return (
    <div className=" bg-[radial-gradient(1200px_circle_at_20%_-10%,rgba(56,189,248,0.25),transparent_40%),radial-gradient(900px_circle_at_80%_10%,rgba(168,85,247,0.25),transparent_45%)] h-screen overflow-hidden p-6">
      <div className="mx-auto h-full max-w-[1300px] rounded-2xl shadow-2xl border border-white/30 overflow-hidden ">
        <div
          className="grid h-full "
          style={{
            gridTemplateColumns: "minmax(260px,300px) 1fr minmax(260px,300px) ",
          }}
        >
         
          <div className=" border-r border-r-gray-500 flex flex-col bg-gradient-to-b from-slate-900 to-slate-800">
            <LeftBar activeId={activeId} setActiveId={setActiveId}  />
          </div>

          
          <div className=" border-r border-r-gray-500 flex flex-col bg-gradient-to-b from-slate-900 to-slate-800">
            <CenterChat activeId={activeId} setActiveId={setActiveId} reload={reload} setReload={setReload} />
          </div>

          
          <div className="flex flex-col bg-gradient-to-b from-slate-900 to-slate-800">
            <RightBar activeId={activeId} setActiveId={setActiveId} reload={reload} setReload={setReload} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChatLayout
