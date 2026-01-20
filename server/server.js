import dotenv from "dotenv";
dotenv.config();
import { createServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";

const httpServer = createServer();

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  },
});

io.use((socket, next) => {
  try {
    const token = socket?.handshake?.auth?.token;

    if (!token) return next(new Error("Unauthorized"));

    const secret = process.env.ACCESS_TOKEN_SECRET;
    if (!secret) {
      return next(new Error("server misconfigured"));
    }
    const payload = jwt.verify(token, secret);

    const userId = payload?.id ?? payload?.sub;
    if (!userId) return next(new Error("Invalid token payload"));

    socket.data.user = { id: userId };

    next();
  } catch (err) {
    console.log(err);

    next(new Error("unauthenticated"));
  }
});

io.on("connection", (socket) => {
  const userId = socket?.data?.user?.id;
  if (!userId) {
    return
  }
   socket.join(`user:${userId}`);
  console.log("Socket connected", socket.id, "user:", socket.data.user?.id);

  socket.on("disconnect", (res) => {
    console.log("Socket disconnected", socket.id, "reason:", res);
  });

  
  socket.on("join", (chatId) => {
    socket.join(`chat:${chatId}`);
  });
  
  socket.on("typing", (payload) => {
    socket.to(`chat:${payload.chatId}`).emit("user_typing", {
      chatId: payload.chatId,
      username: payload.username,
    });
  });

  socket.on("stop_typing", ({ chatId, username }) => {
    socket.to(`chat:${chatId}`).emit("user_stop_typing", {
      chatId,
      username,
    });
  });

  socket.on("message_sent", (message) => {
    if (!message) return;
    socket.to(`chat:${message?.chatId}`).emit("new_message", message);
  });

  socket.on("message_read", ({ messageId, chatId }) => {
    if (!messageId || !chatId || !userId) return;
    io.to(`chat:${chatId}`).emit("message_read_by", { messageId, chatId, readerId: userId });
  });

  socket.on("message_edit", (message) => {
    if (!message) return;
    socket.to(`chat:${message?.chatId}`).emit("edited_message", message);
  });

  socket.on("message_delete", (message) => {
    if (!message) return;
    socket.to(`chat:${message?.chatId}`).emit("deleted_message", message);
  });

  socket.on("promote_member", ({ member, chatId }) => {
    if (!member || !chatId) return;
    socket.to(`chat:${chatId}`).emit("promoted_member", { chatId, member });
  });

  socket.on("delete_member", ({ member, chatId }) => {
    if (!member || !chatId) return;
    socket.to(`chat:${chatId}`).emit("deleted_member", { chatId, member });
  });

  socket.on("add_members", ({ members, chatId }) => {
    if (!members || !chatId) return;
    socket.to(`chat:${chatId}`).emit("added_members", { chatId, members });
  });

  socket.on("leave_member", ({ chatId, member }) => {
    if (!member || !chatId) return;
    socket.to(`chat:${chatId}`).emit("left_member", { chatId, member });
  });

  socket.on("leave", ( chatId ) => {
    if (!chatId) return;
    socket.leave(`chat:${chatId}`);
  });

  socket.on("chat_update", ({ chatId, updatedChat }) => {
    if (!chatId || !updatedChat) return;
    socket.to(`chat:${chatId}`).emit("chat_updated", { chatId, updatedChat });
  });

  socket.on("chat_create", ({chat, memberIds}) => {
    if (!chat) return;
    
  for (const id of memberIds) {
    io.to(`user:${id}`).emit("chat_created", chat);
  }
  });
});
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log("Socket server running on port", PORT);
});
