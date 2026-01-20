"use client";

import { useEffect, useState, useRef } from "react";
import { useClientFetch } from "@/lib/clientAuth";
import MessageBubbleComponent from "./subcomponents/MessageBubble";
import InputSend from "./subcomponents/InputSend";
import { useAuth } from "../contexts/AuthContext";

type Props = {
  activeId: string | null;
  setActiveId: React.Dispatch<React.SetStateAction<string | null>>;
  setReload: React.Dispatch<React.SetStateAction<number>>;
  reload: number;
};

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

type latestReadby = {
  id: string;
  username: string;
  image: string | null;
}[];

type User = {
  id: string;
  username: string;
  image: string | null;
};

export default function Messages({
  activeId,
  setActiveId,
  setReload,
  reload,
}: Props) {
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const { socket } = useAuth();
  const clientFetch = useClientFetch();
  const [lastMessageId, setLastMessageId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isGroup, setIsGroup] = useState(false);
  const [latestReadby, setLatestReadby] = useState<latestReadby>([]);
  const [isEditing, setIsEditing] = useState(false);
  const sock = socket?.current;
  const readTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!sock || !activeId) return;

    sock.emit("join", activeId);

    const onNew = (message: Message & { tempId?: string | null }) => {
      if (!message || message.chatId !== activeId) return;
      

      setChatHistory((prev) => {
        if (message.tempId) {
          return prev.map((m) => (m.id === message.tempId ? message : m));
        }
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
      setLastMessageId(message.id);

      if (message.senderId !== currentUserId && sock && activeId) {
        if (readTimer.current) clearTimeout(readTimer.current);
        

        readTimer.current = setTimeout(async () => {
          try {
            await clientFetch(
              `/api/chats/${activeId}/messages?limit=1&markRead=true`,
              { method: "GET" }
            );

            sock.emit("message_read", {
              messageId: message.id,
              chatId: activeId,
            });
          } catch (err) {
            console.error("Failed to mark read on new message", err);
          }

          
        }, 300);
      }
    };

    const onEdit = (message: Message) => {
      if (!message || message.chatId !== activeId) return;

      setChatHistory((prev) =>
        prev.map((m) => (m.id === message.id ? message : m))
      );
    };

    const onDelete = (messageId: string) => {
      setChatHistory((prev) => prev.filter((m) => m.id !== messageId));
    };

    const onLeft = ({ chatId, member }: { chatId: string; member: User }) => {
      if (chatId !== activeId) return;
      setChatHistory((prev) => [...prev]);
    };

   const onRead = async ({
  chatId,
  messageId,
  readerId,
 
}: {
  chatId: string;
  messageId: string;
  readerId: string;
 
}) => {

  if (chatId !== activeId) return;

  let readerUser = latestReadby.find((user) => user.id === readerId) ?? null;
 
  if (!readerUser) {
    const fromMsg = chatHistory.find((m) => m.sender?.id === readerId);
    if (fromMsg?.sender) {
      readerUser = fromMsg.sender;
    }
  }

  
  if (!readerUser) readerUser = { id: readerId, username: "", image: null };

  
  setChatHistory((prev) => {  
   
    return prev.map((m) => {
      if (m.id !== messageId) return m;

      const reads = m.messageReads ?? [];
      if (reads.some((r) => r.userId === readerId)) {
       return m;
      }

      const newEntry = {
        messageId: m.id,
        userId: readerId,
        readAt: new Date().toISOString(),
        user: readerUser,
      } 
     
      return { ...m, messageReads: [...reads, newEntry] };
    });
  });

  
  setLatestReadby((prev) => {
    if (prev.some((u) => u.id === readerUser!.id)) return prev;
    return [...prev, readerUser];
  });
};


    sock.on("left_member", onLeft);
    sock.on("message_read_by", onRead);
    sock.on("new_message", onNew);
    sock.on("edited_message", onEdit);
    sock.on("deleted_message", onDelete);

    return () => {
      sock.off("message_read_by", onRead);
      sock.off("new_message", onNew);
      sock.off("deleted_message", onDelete);
      sock.off("edited_message", onEdit);
      sock.off("left_member", onLeft);
      sock.emit("leave", activeId);
    };
  }, [
    activeId,
    sock,
    setReload,
    chatHistory,
    clientFetch,
    currentUser,
    currentUserId,
    latestReadby,
  ]);


  useEffect(() => {
    let mounted = true;

    async function loadMessages() {
      if (!activeId) {
        setChatHistory([]);
        setLastMessageId(null);
        setCurrentUserId(null);
        setIsGroup(false);
        setLatestReadby([]);
        return;
      }
      try {
        const res = await clientFetch(
          `/api/chats/${activeId}/messages?limit=10&markRead=false`,
          { method: "GET" }
        );
        if (!res.ok) {
          console.log("Error fetching messages");
        }

        if (!mounted) return;

        const data = await res.json();

        const messages: Message[] = Array.isArray(data.messages)
          ? data.messages
          : [];

        if (mounted) setChatHistory(messages);

        const latestId = data?.lastMessage?.id ?? messages.at(-1)?.id;

        if (readTimer.current) {
          clearTimeout(readTimer.current);
          readTimer.current = null;
        }

        if (sock && latestId && activeId) {
          readTimer.current = setTimeout(() => {
            if (sock && latestId) {
              sock.emit("message_read", {
                messageId: latestId,
                chatId: activeId,
              });
            }
          }, 500);
        }

        setLastMessageId(messages.at(-1)?.id ?? null);
        setCurrentUserId(data.currentUserId);
        setIsGroup(Boolean(data?.chat?.isGroup));
        setLatestReadby(data?.latestReadby ?? []);
        setNextCursor(data.nextCursor ?? null);
        setIsEditing(false);
        setCurrentUser(data?.currentUser ?? null);
      } catch (err) {
        if (mounted) setChatHistory([]);
        console.error(err);
      }
    }
    loadMessages();
    return () => {
      mounted = false;
    };
  }, [activeId, clientFetch, reload, sock, isEditing]);

  async function uploadToCloudinary(
    file: File,
    chatId: string
  ): Promise<{ publicId: string; url: string }> {
    if (!chatId) throw new Error("Missing chatId");

    const isVideo = file.type.startsWith("video/");
    const type = isVideo ? "video" : "image";

    const form = new FormData();
    form.append("file", file);
    form.append(
      "upload_preset",
      process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!
    );
    form.append("folder", `chats/${chatId}`);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/${type}/upload`,
      {
        method: "POST",
        body: form,
      }
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error("Cloudinary upload failed: " + text);
    }

    const data = await res.json();

    return {
      publicId: data.public_id,
      url: data.secure_url,
    };
  }

  const handleSubmit = async (
    content: string,
    file?: File | null,
    e?: React.FormEvent
  ) => {
    e?.preventDefault();

    if (!content && !file) return;

    const attachments: { url: string; type: string }[] = [];

    if (file) {
      const uploaded = await uploadToCloudinary(file, activeId ?? "");
      attachments.push({
        url: uploaded.url,
        type: file.type.startsWith("image/")
          ? "IMAGE"
          : file.type.startsWith("video/")
          ? "VIDEO"
          : "",
      });
    }

    try {
      const res = await clientFetch(`/api/chats/${activeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, attachments }),
      });

      if (!res.ok) {
        console.error("Failed to send message");
      }

      const data = await res.json();

      setChatHistory((prev) => [...prev, data.created]);
      sock?.emit("message_sent", data.created);
      setLastMessageId(data.created?.id ?? null);
      setNextCursor(data.nextCursor ?? null);

      setReload((i) => i + 1);
    } catch (err) {
      console.error(err);
    }
  };

  const loadMore = async () => {
    if (!activeId || !nextCursor) return;

    const res = await clientFetch(
      `/api/chats/${activeId}/messages?limit=20&cursor=${nextCursor}`,
      { method: "GET" }
    );

    if (!res.ok) return;

    const data = await res.json();

    const newMessages: Message[] = data.messages ?? [];

    setChatHistory((prev) => [...newMessages, ...prev]);
    setNextCursor(data.nextCursor ?? null);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto min-h-0 no-scrollbar relative pb-2 md:pb-0"
      >
        {nextCursor && (
          <div className="flex justify-center py-2">
            <button
              onClick={loadMore}
              className="text-sm text-violet-800 font-semibold hover:underline active:italic active:bold active:translate-x-2 transition-transform"
            >
              Load older messages
            </button>
          </div>
        )}
        <MessageBubbleComponent
          chatHistory={chatHistory}
          lastMessageId={lastMessageId}
          currentUserId={currentUserId}
          isGroup={isGroup}
          latestReadby={latestReadby}
          activeId={activeId}
          setIsEditing={setIsEditing}
        />
      </div>

      <div className="sticky bottom-0 border-t z-50 pb-[env(safe-area-inset-bottom)] md:static md:pb-0">
        <InputSend
          handleSubmit={handleSubmit}
          activeId={activeId}
          currentUser={currentUser}
        />
      </div>
    </div>
  );
}
