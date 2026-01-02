"use client";

import React, { useState } from "react";
import { MessageCirclePlus, Search } from "lucide-react";
import { clientFetch } from "@/lib/clientAuth";
import CreateChatHelper from "./subcomponents/CreateChatHelper";

type Conversation = {
  id: string;
  name: string;
  last?: string;
  seen?: boolean;
  pressed?: boolean;
};

const conversations: Conversation[] = [];

const LeftBar = () => {
  const [activeId, setActiveId] = useState<string | null>(
    conversations[0]?.id ?? null
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const handleCreate = () => {
    setIsCreateOpen(!isCreateOpen);
  };

  return (
    <>
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className=" w-full  h-screen   p-6 rounded-2xl shadow-lg select-none flex flex-col">
        <div className="flex items-center mb-4 justify-between">
          <h1 className="font-bold text-2xl cursor-pointer text-white">
            Chatify
          </h1>
          <button
            aria-label="New chat"
            className="p-2 rounded-full hover:opacity-80 active:scale-95 transition"
          >
            <MessageCirclePlus color="white" onClick={handleCreate} />
          </button>
        </div>
        {isCreateOpen && (
          <CreateChatHelper handleCreate={handleCreate} />
        )}

        <div className="relative w-full mt-5 mb-7">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="text"
            aria-label="Search conversations"
            placeholder="Search"
            className="w-full pl-10 pr-3 py-2 rounded-2xl bg-[#071428]/60 placeholder:text-gray-400 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-gray-300"
            value=""
            onChange={() => {}}
          />
        </div>

        <div className="flex-1 overflow-auto scroll-smooth no-scrollbar space-y-2">
          {conversations.map((c) => {
            const isActive = c.id === activeId;
            return (
              <button
                key={c.id}
                onClick={() => {
                  setActiveId(c.id);
                  c.pressed = true;
                  c.seen = true;
                }}
                className={`w-full flex items-center gap-4 p-3 rounded-lg transition text-left
                ${
                  isActive
                    ? "bg-white/6 ring-1 ring-indigo-400/20"
                    : "hover:bg-white/3"
                }
              `}
                aria-current={isActive ? "true" : undefined}
              >
                {!c.seen && !c.pressed && (
                  <span className="mr-2 inline-flex items-center justify-center  text-xs font-semibold rounded-full text-blue-500">
                    •
                  </span>
                )}
                <div className="flex">
                  <img
                    src="https://images.unsplash.com/photo-1766338796939-52e90070d198?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHx0b3BpYy1mZWVkfDJ8Ym84alFLVGFFMFl8fGVufDB8fHx8fA%3D%3D"
                    alt={`${c.name} avatar`}
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
                    <span className="text-xs text-gray-400">11:35</span>
                  </div>

                  <div className="flex items-center justify-between mt-1">
                    <p
                      className={`${
                        isActive ? "" : "text-gray-400"
                      } truncate text-xs`}
                    >
                      {c.last ?? "No messages yet"}
                    </p>
                    {!c.seen && (
                      <span className="ml-3 text-xs text-gray-500">Read</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default LeftBar;
