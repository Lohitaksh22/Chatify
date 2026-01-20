# Real-Time Chat Application

This is a real-time chat application built using Next.js. The project focuses on implementing core chat functionality, custom authentication, and real-time message broadcasting.

## Features

- User authentication with a custom login system (no third-party auth libraries)
- Token-based session handling using a custom Auth Provider
- Protected routes using layout-level authentication
- Real-time message broadcasting with Socket.IO
- API routes used for all backend functionality
- Database interactions handled with Prisma and PostgreSQL

## Tech Stack

**Frontend & Backend**
- Next.js

**Real-Time**
- Socket.IO

**Database**
- PostgreSQL
- Prisma ORM

## Project Purpose

This project was built to better understand how authentication, real-time communication, and backend APIs work together in a full-stack Next.js application.

## Notes

Socket.IO is currently used for broadcasting messages between connected users. The implementation prioritizes simplicity and reliability while maintaining database-backed message storage.
