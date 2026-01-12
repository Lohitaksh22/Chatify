"use client";

import { useEffect, useState } from "react";
import { useClientFetch } from "@/lib/clientAuth";
import MessageBubbleComponent from "./subcomponents/MessageBubble";
import InputSend from "./subcomponents/InputSend";

type Props = {
  activeId: string | null;
  setActiveId: React.Dispatch<React.SetStateAction<string | null>>;
   setReload: React.Dispatch<React.SetStateAction<number>>;
   reload: number
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

export default function Messages({ activeId, setActiveId, setReload , reload}: Props) {
  const [chatHistory, setChatHistory] = useState<Message[]>([]);

  const clientFetch = useClientFetch();
  const [lastMessageId, setLastMessageId] = useState<string | null>(null);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isGroup, setIsGroup] = useState(false);
  const [latestReadby, setLatestReadby] = useState<latestReadby>([]);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!activeId) {
      setChatHistory([]);
      setLastMessageId(null);
      setCurrentUserId(null);
      setIsGroup(false);
      setLatestReadby([]);
      return;
    }

    let mounted = true;

    async function loadMessages() {
      try {
        const res = await clientFetch(
          `/api/chats/${activeId}/messages?limit=50&markRead=true`,
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
        setLastMessageId(messages.at(-1)?.id ?? null);
        setCurrentUserId(data.currentUserId);
        setIsGroup(Boolean(data?.chat?.isGroup));
        setLatestReadby(data?.latestReadby ?? []);
        console.log(data.messages.attachments);
        setIsEditing(false);
      } catch (err) {
        if (mounted) setChatHistory([]);
        console.error(err);
      }
    }
    loadMessages();
    return () => {
      mounted = false;
    };
  }, [activeId, clientFetch, isEditing, reload]);

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

      setReload((i) => i + 1);

      const data = await res.json();
      setChatHistory((prev) =>
        prev ? [...prev, data.created] : [data.created]
      );
      setLastMessageId(data.created?.id ?? null);
    } catch (err) {
      console.error(err);
    } finally {
      setActiveId(activeId);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 h-full overflow-y-auto no-scrollbar relative">
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

      <div className="sticky bottom-0 border-t">
        <InputSend handleSubmit={handleSubmit} />
      </div>
    </div>
  );
}
