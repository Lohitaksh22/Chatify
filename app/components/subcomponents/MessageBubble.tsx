"use client";

import { useEffect, useRef, useState } from "react";
import { dateCalc } from "@/lib/dateCalc";
import { Trash } from "lucide-react";
import toast from "react-hot-toast";
import { useClientFetch } from "@/lib/clientAuth";
import { useAuth } from "@/app/contexts/AuthContext";

type Message = {
  id: string;
  chatId: string;
  content: string;
  senderId: string;
  createdAt: string;
  edit: boolean;

  sender: {
    id: string;
    username: string;
    image: string | null;
  };

  messageReads: {
    userId: string;
    readAt: string;
  }[];

  attachments: {
    id: string;
    messageId: string;
    url: string;
    type: string;
  }[];

  latestReadby?: {
    id: string;
    username: string;
    image: string | null;
  }[];
};

type Props = {
  chatHistory: Message[];
  lastMessageId: string | null;
  currentUserId?: string | null;
  isGroup: boolean;
  latestReadby: {
    id: string;
    username: string;
    image: string | null;
  }[];
  activeId: string | null;
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function MessageBubbleComponent({
  chatHistory,
  lastMessageId,
  currentUserId,
  isGroup,
  latestReadby,
  activeId,
  setIsEditing,
}: Props) {
  const bottom = useRef<HTMLDivElement | null>(null);
  const container = useRef<HTMLDivElement | null>(null);
  const clientFetch = useClientFetch();

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "auto", block: "end" });
  }, [activeId]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [lastMessageId]);

  const isLastInSequence = (index: number) => {
    const next = chatHistory?.[index + 1];
    return !next || next.senderId !== chatHistory[index].senderId;
  };

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [edit, setEdit] = useState("");
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [activeMedia, setActiveMedia] = useState<null | {
    url: string;
    type?: string;
  }>(null);
  const { socket } = useAuth();
  const sock = socket.current;
  const [delivered, setDelivered] = useState(false);

  useEffect(() => {
    const touch =
      typeof window !== "undefined" &&
      ("ontouchstart" in window || navigator.maxTouchPoints > 0);
    setIsTouchDevice(Boolean(touch));
  }, []);

  const startEdit = (m: Message) => {
    if (m?.createdAt) {
      const time = dateCalc(m?.createdAt) as string;
      const editableTime = ["1", "2", "3", "4", "5"].map((n) => `${n}m ago`);
      editableTime.push("Just now");

      if (!editableTime.includes(time)) {
        return toast.error("Can not edit messages after 5 minutes being sent");
      }
    }
    if (m?.attachments?.length > 0)
      return toast.error("Can not Edit an Attachment");
    setEdit(m?.content);
    setEditingMessageId(m?.id);
  };

  const saveEdit = async () => {
    if (!editingMessageId || !activeId) return;
    if (edit.trim() === "") {
      return toast.error("Must have some text");
    }
    try {
      const res = await clientFetch(
        `/api/chats/${activeId}/messages/${editingMessageId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: edit }),
        }
      );
      if (!res.ok) {
        return toast.error("Unable to edit at the moment");
      }
      const data = await res.json();
      const editedMessage = data.data;

      sock?.emit("message_edit", editedMessage);
      setIsEditing(true);
    } catch (err) {
      console.log(err);
    } finally {
      setEditingMessageId(null);
      setEdit("");
    }
  };

  const deleteMessage = async () => {
    if (!editingMessageId || !activeId) return;
    try {
      const res = await clientFetch(
        `/api/chats/${activeId}/messages/${editingMessageId}`,
        {
          method: "DELETE",
        }
      );
      if (!res.ok) {
        return toast.error("Unable to delete at the moment");
      }
      const data = await res.json();
      const message = data.data;
      sock?.emit("message_delete", message);
      setIsEditing(true);
    } catch (err) {
      console.log(err);
    } finally {
      setEditingMessageId(null);
      setEdit("");
    }
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setEdit("");
  };

  const formatDivider = (date: Date) => {
    const today = new Date();

    const messageDay = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    ).getTime();
    const todayDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    ).getTime();

    const diffDays = Math.round(
      (messageDay - todayDay) / (24 * 60 * 60 * 1000)
    );

    if (diffDays === 0) return "Today";
    if (diffDays === -1) return "Yesterday";

    return date.toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const DateDivider = ({ label }: { label: string }) => (
    <div className="my-4 flex items-center gap-3">
      <div className="flex-1 h-px bg-slate-600/40" />
      <span className="text-xs text-slate-400 whitespace-nowrap px-2">
        {label}
      </span>
      <div className="flex-1 h-px bg-slate-600/40" />
    </div>
  );

  function isNewDay(current: Date, previous?: Date) {
    if (!previous) return true;

    return (
      current.getFullYear() !== previous.getFullYear() ||
      current.getMonth() !== previous.getMonth() ||
      current.getDate() !== previous.getDate()
    );
  }

  useEffect(() => {
    const lastMsg = chatHistory?.find((m) => m.id === lastMessageId);

    if (!lastMsg || !currentUserId) {
      setDelivered(false);
      return;
    }

    const readCount = (lastMsg.messageReads ?? []).filter(
      (read) => read.userId !== currentUserId
    ).length;

    const isMine = lastMsg.senderId === currentUserId;

    const showDeliver =
      lastMsg.id === lastMessageId &&
      readCount === 0 &&
      isMine &&
      lastMsg.edit === false;

    if (!showDeliver) {
      setDelivered(false);
      return;
    }

    const t = setTimeout(() => {
      setDelivered(true);
    }, 500);

    return () => clearTimeout(t);
  }, [chatHistory, lastMessageId, currentUserId]);

  return (
    <div
      ref={container}
      className="flex flex-col gap-4 px-4 py-3 overflow-auto"
    >
      {chatHistory?.map((m, i) => {
        const isMine = currentUserId ? m?.senderId === currentUserId : false;
        const readCount = (m.messageReads ?? []).filter(
          (read) => read.userId !== currentUserId
        ).length;
        const showReadCount = isMine && m.id === lastMessageId;
        const prev = chatHistory[i - 1];

        const isLastMessageOfSender = isLastInSequence(i);

        const handlers = {
          onClick: (e: React.MouseEvent | React.TouchEvent) => {
            if (!isMine) return;
            if (isTouchDevice) {
              startEdit(m);
            }
          },
          onDoubleClick: (e: React.MouseEvent) => {
            if (!isMine) return;
            if (!isTouchDevice) {
              startEdit(m);
            }
          },

          onContextMenu: (e: React.MouseEvent) => {
            e.preventDefault();
            startEdit(m);
          },
        };

        const showDateDivider = isNewDay(
          new Date(m.createdAt),
          prev ? new Date(prev.createdAt) : undefined
        );

        return (
          <div key={m.id} className="flex flex-col gap-2">
            {showDateDivider && (
              <DateDivider label={formatDivider(new Date(m.createdAt))} />
            )}
            <div
              className={`flex items-end  gap-3 ${
                isMine ? "justify-end" : "justify-start"
              }`}
            >
              {!isMine && isLastMessageOfSender && isGroup && (
                <img
                  src={m?.sender?.image ?? undefined}
                  alt={m?.sender?.username ?? ""}
                  className="w-8 h-8 rounded-full object-cover"
                />
              )}
              {!isMine && isLastMessageOfSender && !isGroup && (
                <img
                  src={m.sender?.image ?? ""}
                  alt={m.sender?.username ?? ""}
                  className="w-8 h-8 rounded-full object-cover"
                />
              )}

              <div
                className={`flex flex-col gap-2  w-fit max-w-[65%] ${
                  isMine ? "items-end" : "items-start"
                }`}
              >
                <div
                  {...handlers}
                  className={`mt-1 px-4 py-2  rounded-2xl text-sm break-words
                  ${
                    isMine
                      ? "bg-indigo-600/50 border-white  rounded-br-none"
                      : "bg-slate-700/40 rounded-bl-none"
                  }`}
                >
                  {!isMine && isGroup && isLastMessageOfSender && (
                    <div className="text-xs font-medium text-gray-600 mb-1">
                      {m.sender?.username}
                    </div>
                  )}

                  <p className="flex items-center">{m.content}</p>

                  {m.attachments?.length ? (
                    <div className="mt-3 grid  gap-2">
                      {m.attachments.map((a) => (
                        <div
                          key={a.id}
                          onClick={() => {
                            setActiveMedia(a);
                            toast.dismissAll();
                          }}
                          className="mt-1"
                        >
                          {a.type === "IMAGE" && (
                            <img
                              src={a.url}
                              alt="attachment"
                              className="max-h-40 w-full object-cover rounded"
                            />
                          )}

                          {a.type === "VIDEO" && (
                            <video
                              src={a.url}
                              controls
                              className="max-h-60 w-full rounded"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                {activeMedia && (
                  <div
                    className="fixed inset-0 z-[100] flex items-center justify-center  backdrop-blur-2xl"
                    onClick={() => setActiveMedia(null)}
                  >
                    <button
                      className="absolute top-4 right-4 rounded-full bg-black p-2 text-white hover:bg-slate-700"
                      onClick={() => setActiveMedia(null)}
                    >
                      ✕
                    </button>

                    <div className="max-h-[90vh] max-w-[90vw]">
                      {activeMedia.type?.startsWith("video") ||
                      /\.mp4$/i.test(activeMedia.url) ? (
                        <video
                          src={activeMedia.url}
                          controls
                          autoPlay
                          className="max-h-[90vh] max-w-[90vw] rounded-lg"
                        />
                      ) : (
                        <img
                          src={activeMedia.url}
                          alt=""
                          className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
                        />
                      )}
                    </div>
                  </div>
                )}

                <div className=" flex items-center justify-center ml-1 text-[10px] italic ">
                  {m.id === lastMessageId &&
                    readCount === 0 &&
                    isMine &&
                    m.edit === true && (
                      <span>Edited {dateCalc(m.createdAt)}</span>
                    )}

                  {showReadCount && isGroup && (
                    <span className="ml-2 flex items-center gap-1">
                      {readCount > 0 &&
                        latestReadby
                          ?.filter((u) => u.id !== currentUserId)
                          ?.map((u) => (
                            <img
                              key={u.id}
                              src={u.image ?? undefined}
                              className="w-3 h-3 rounded-full object-cover"
                            />
                          ))}
                    </span>
                  )}

                  {showReadCount && !isGroup && readCount === 1 && (
                    <span className="ml-1 text-[10px] italic">
                      Read {dateCalc(m.messageReads[0]?.readAt)}
                    </span>
                  )}

                  {m.id === lastMessageId && delivered && (
                    <span className="ml-1 text-[10px] italic">
                      Delivered {dateCalc(m.createdAt)}
                    </span>
                  )}
                </div>
              </div>
              {isMine && isGroup && isLastMessageOfSender && (
                <img
                  src={m.sender?.image ?? ""}
                  alt={m.sender?.username ?? ""}
                  className="w-8 h-8 rounded-full object-cover"
                />
              )}
              {isMine && !isGroup && isLastMessageOfSender && (
                <img
                  src={m.sender?.image ?? ""}
                  alt={m.sender?.username ?? ""}
                  className="w-8 h-8 rounded-full object-cover"
                />
              )}
            </div>
          </div>
        );
      })}

      <div ref={bottom} />

      {editingMessageId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-lg min-h-screen">
          <div className="  border border-white/20 bg-black rounded-xl shadow-2xl p-4 w-full max-w-lg bg-[radial-gradient(1200px_circle_at_20%_-10%,rgba(56,189,248,0.25),transparent_40%),radial-gradient(900px_circle_at_80%_10%,rgba(168,85,247,0.25),transparent_45%)] border border-white/20">
            <h3 className="font-semibold mb-2">Edit message</h3>
            <textarea
              value={edit}
              onChange={(e) => setEdit(e.target.value)}
              rows={4}
              className="w-full border p-2 rounded mb-3 no-scrollbar min-h-70 max-h-screen"
            />
            <div className="flex justify-between items-center">
              <div className="flex justify-start">
                <Trash
                  onClick={deleteMessage}
                  size={25}
                  className="text-red-500 hover:text-red-700 hover:font-extrabold active:scale-105"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={cancelEdit}
                  className="px-3 py-1 rounded hover:font-bold hover:border-none border active:scale-105"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  className="px-3 py-1 rounded bg-sky-600 hover:bg-sky-800 active:scale-105"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
