/*
  Warnings:

  - The primary key for the `ChatMember` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `ChatMember` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Chat" ADD COLUMN     "image" TEXT;

-- AlterTable
ALTER TABLE "ChatMember" DROP CONSTRAINT "ChatMember_pkey",
DROP COLUMN "id";
