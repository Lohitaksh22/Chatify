"use client";
import toast from "react-hot-toast";
import SettingsComp from "./SettingsComp";
import { useClientFetch } from "@/lib/clientAuth";
import { useState, useEffect, useCallback } from "react";
import {
  UserRoundX,
  UserStar,
  UserRoundPlus,
  DoorOpen,
  ChevronDown,
  Pen,
} from "lucide-react";
import AddUserToChatHelper from "./subcomponents/AddUserToChatHelper";
import UpdateChat from "./subcomponents/UpdateChat";
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
  image: string | null;
  lastMessage: string | null;
  lastMessageAt: Date | null;
  isGroup: boolean;
  members?: {
    memberId: string;
    joinedAt: Date;
    role: string;
    id: string;
    username: string;
    image: string | null;
  }[];
};

type Attachment = {
  id: string;
  type: string;
  url: string;
  messageId: string;
};

type Members = {
  memberId: string;
  joinedAt: Date;
  role: string;
  id: string;
  username: string;
  image: string | null;
};

type Member = {
  chatId: string;
  role: string;
  memberId: string;
  joinedAt: Date;
};

const RightBar = ({ activeId, setActiveId, reload, setReload }: Props) => {
  const clientFetch = useClientFetch();
  const [chatData, setChatData] = useState<Conversation | null>(null);
  const [attachData, setAttachData] = useState<Attachment[] | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [addingUser, setAddingUser] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeMedia, setActiveMedia] = useState<null | {
    url: string;
    type?: string;
  }>(null);
  const { socket } = useAuth();
  const sock = socket.current;
  const [chatEdit, setChatEdit] = useState(false);

  useEffect(() => {
    if (!sock || !activeId) return;

    sock.on(
      "promoted_member",
      ({ chatId, members }: { chatId: string; members: Member[] }) => {
        if (chatId !== activeId) return;
        setReload((prev) => prev + 1);
      }
    );

    sock.on(
      "removed_member",
      ({
        chatId,
        deletedMember,
      }: {
        chatId: string;
        deletedMember: Member;
      }) => {
        if (chatId !== activeId) return;
        setReload((prev) => prev + 1);
      }
    );

    sock.on(
      "left_member",
      ({ chatId, member }: { chatId: string; member: Member }) => {
        if (chatId !== activeId) return;
        setReload((prev) => prev + 1);
      }
    );

    sock.on(
      "added_members",
      ({ chatId, newMembers }: { chatId: string; newMembers: Member[] }) => {
        if (chatId !== activeId) return;
        setReload((prev) => prev + 1);
      }
    );

    sock.on(
      "chat_updated",
      ({
        chatid,
        updatedChat,
      }: {
        chatid: string;
        updatedChat: Conversation;
      }) => {
        if (chatid !== activeId) return;
        setChatData(updatedChat ?? null);
        setReload((prev) => prev + 1);
      }
    );

    return () => {
      sock.off("added_members");
      sock.off("promoted_member");
      sock.off("removed_member");
      sock.off("left_member");
      sock.off("chat_updated");
    };
  });

  const getChatInfo = useCallback(async () => {
    if (!activeId) return;
    try {
      const res = await clientFetch(`/api/chats/${activeId}`, {
        method: "GET",
      });
      if (!res.ok) {
        return;
      }

      const data = await res.json();

      const curUserId: string | null = data?.currentUserId ?? null;
      setCurrentUserId(curUserId);

      const conversation: Conversation | undefined = data?.data;
      if (!conversation) {
        setChatData(null);
        setAttachData(null);
        return;
      }

      const membersArr: Members[] = Array.isArray(conversation.members)
        ? conversation.members
        : [];

      const roleObj = membersArr.find((m) => m.id === curUserId);
      const getRole = roleObj?.role ?? null;
      setRole(getRole);

      const filteredMembers = membersArr.filter((m) => m.id !== curUserId);

      const conversationWithFilteredMembers: Conversation = {
        ...conversation,
        members: filteredMembers.length ? filteredMembers : undefined,
      };

      setChatData(conversationWithFilteredMembers);
      setAttachData(data?.attachmentsFound ?? null);
    } catch (err) {
      console.log(err);
    }
  }, [clientFetch, activeId]);

  useEffect(() => {
    if (!activeId) return;
    let mounted = true;

    (async () => {
      if (!mounted) return;
      await getChatInfo();
    })();

    return () => {
      mounted = false;
    };
  }, [activeId, getChatInfo, setActiveId, reload]);

  const promoteRole = async (username: string) => {
    if (!username || !activeId) return;
    try {
      const res = await clientFetch(`/api/chats/${activeId}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (!res.ok) {
        return toast.error(data.msg || "Unable to promote at the moment");
      }
      const member = data?.data;
      sock?.emit("promote_member", { chatId: activeId, member });
      getChatInfo();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteUser = async (username: string) => {
    if (!username || !activeId) return;
    try {
      const res = await clientFetch(`/api/chats/${activeId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });

      const data = await res.json();
      if (!res.ok) {
        return toast.error(data.msg || "Unable to promote at the moment");
      }
      const deletedMember = data?.data;
      sock?.emit("remove_member", { chatId: activeId, deletedMember });
      getChatInfo();
    } catch (err) {
      console.error(err);
    }
  };

  const leaveChat = async () => {
    if (!activeId) return;
    const prevChat = chatData;
    setChatData(null);
    setActiveId(null);
    toast.loading("Leaving...");

    try {
      const res = await clientFetch(`/api/chats/${activeId}/members/leave`, {
        method: "DELETE",
      });

      if (!res.ok) {
        setChatData(prevChat);
        setActiveId(activeId);
        toast.dismiss();
        toast.error("Unable to exit at the moment");
        return;
      }

      const data = await res.json();
      sock?.emit("leave_member", { chatId: activeId, member: data?.data });

      window.location.reload();
      toast.dismiss();
      toast.success("You have left the chat group");
    } catch (err) {
      setChatData(prevChat);
      setActiveId(activeId);
      toast.dismiss();
      toast.error("Could not leave chat");
      console.error(err);
    }
  };

  const addUserToChat = async (usernames: string[]) => {
    if (!usernames || !activeId) return;
    try {
      const res = await clientFetch(`/api/chats/${activeId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernames }),
      });

      const data = await res.json();
      if (!res.ok) {
        return toast.error(data.msg || "Unable to add at the moment");
      }
      const newMembers = data?.data;
      sock?.emit("add_members", { chatId: activeId, newMembers });
      getChatInfo();
    } catch (err) {
      console.error(err);
    } finally {
      setAddingUser(false);
    }
  };

  return (
    <div
      className=" overflow-auto no-scrollbar w-full h-screen p-6 rounded-2xl shadow-lg select-none flex flex-col items-center "
      onClick={() => {
        if (open) setOpen(false);
      }}
    >
      <div className="w-full">
        {chatData && (
          <div className="mt-5 flex flex-col items-center w-full ">
            <img
              src={chatData?.image ?? undefined}
              alt={`${chatData.name} avatar`}
              className="w-30 h-30 rounded-full object-cover"
            />

            <div className="mt-10 flex flex-col items-center justify-center space-y-2">
              <h1 className=" flex items-center justify-center gap-2 text-xl font-bold truncate mb-10">
                {chatData.name}
                {role === "admin" && (
                  <button
                    onClick={() => setChatEdit(!chatEdit)}
                    title="Edit This Chat"
                  >
                    <Pen size={15} />
                  </button>
                )}
              </h1>

              {chatEdit && (
                <UpdateChat
                  activeId={activeId}
                  setChatEdit={setChatEdit}
                  chatData={chatData}
                  setReload={setReload}
                />
              )}

              {chatData?.isGroup && (
                <>
                  <div className="w-full flex items-center justify-between px-2 mb-3">
                    <h3 className="flex items-center gap-2 font-semibold">
                      Members
                      {role === "admin" && (
                        <button
                          type="button"
                          onClick={() => setAddingUser(!addingUser)}
                        >
                          <UserRoundPlus
                            size={36}
                            className="p-2 hover:text-green-600 hover:font-extrabold active:scale-105 cursor-pointer"
                          />
                        </button>
                      )}
                    </h3>

                    <div className="flex items-center gap-2">
                      <span className="text-md">
                        {chatData.members?.length ?? 0}
                      </span>
                      {(chatData.members?.length ?? 0) === 0 && (
                        <div className="text-md text-gray-400 italic">
                          0 (Just You)
                        </div>
                      )}
                    </div>
                  </div>

                  {addingUser && (
                    <AddUserToChatHelper
                      addUserToChat={addUserToChat}
                      setAddingUser={setAddingUser}
                      activeId={activeId}
                    />
                  )}

                  <div
                    className={[
                      "space-y-2",
                      (chatData.members?.length ?? 0) > 2
                        ? "max-h-20 overflow-y-auto no-scrollbar pr-1"
                        : "",
                    ].join(" ")}
                  >
                    {chatData.members?.map((mem) => (
                      <div
                        key={mem.username}
                        className="flex items-center justify-center gap-3 p-2 rounded-lg bg-[#262A33] hover:bg-[#313644] border border-white/5 cursor-pointer transition min-w-full w-full px-4"
                      >
                        <img
                          src={mem.image || "/avatar.png"}
                          alt={mem.username}
                          className="w-8 aspect-square rounded-full object-cover overflow-hidden"
                        />

                        <div className="flex flex-col w-full">
                          <span className="text-sm truncate font-medium">
                            {mem.username}
                          </span>
                          <div className="flex flex-col text-xs truncate gap-1 text-gray-400">
                            <p>
                              Joined:{" "}
                              {mem.joinedAt
                                ? new Date(mem.joinedAt).toLocaleDateString(
                                    "en-GB"
                                  )
                                : ""}
                            </p>
                            <p>Role: {mem.role}</p>
                          </div>
                        </div>

                        {role === "admin" && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => promoteRole(mem.username)}
                              className="ml-1 hover:text-amber-400 hover:font-extrabold active:scale-105 cursor-pointer"
                              title="Promote"
                            >
                              <UserStar size={22} />
                            </button>

                            <button
                              onClick={() => deleteUser(mem.username)}
                              className="p-2 hover:text-red-600 hover:font-extrabold active:scale-105 cursor-pointer"
                              title="Remove"
                            >
                              <UserRoundX size={22} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {attachData?.length != 0 && (
                <div className="flex-1 mt-4 w-full items-center justify-center">
                  <button
                    onClick={() => setOpen((open) => !open)}
                    className="flex items-center justify-center gap-1 rounded-md font-semibold px-3 py-1 text-md"
                  >
                    Media
                    <ChevronDown
                      size={20}
                      className={open ? "rotate-180 transition" : "transition"}
                    />
                  </button>

                  {open && attachData && (
                    <div className="z-30 mt-2 w-full rounded-md border mb-4  p-3 shadow ">
                      <div className="max-h-30 overflow-y-auto no-scrollbar">
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-3 ">
                          {attachData.map((file) => {
                            const isImage =
                              file.type?.startsWith("image") ||
                              /\.(png|jpe?g|gif|webp)$/i.test(file.url);

                            const isVideo =
                              file.type?.startsWith("video") ||
                              /\.mp4$/i.test(file.url);

                            return (
                              <button
                                key={file.id}
                                onClick={(e) => {
                                  setActiveMedia(file);
                                  e.stopPropagation();
                                }}
                                className=" relative aspect-square  rounded-md "
                              >
                                {isImage && (
                                  <img
                                    src={file.url}
                                    alt=""
                                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                                  />
                                )}

                                {isVideo && (
                                  <video
                                    src={file.url}
                                    className="h-full w-full object-cover"
                                    muted
                                  />
                                )}

                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition" />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

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
            </div>
          </div>
        )}
      </div>
      <div className="mt-auto mx-auto w-full mb-4">
        <div className="flex justify-between items-center">
          <SettingsComp></SettingsComp>
          <button onClick={leaveChat} title="Leave the chat">
            <DoorOpen
              className="p-2 hover:text-red-600 hover:font-extrabold hover:scale-105 active:scale-105 cursor-pointer"
              size={40}
            />
          </button>
        </div>
      </div>
    </div>
  );
};

export default RightBar;
