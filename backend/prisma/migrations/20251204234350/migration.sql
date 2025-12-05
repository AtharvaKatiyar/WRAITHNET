-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('SEANCE_TRANSCRIPT', 'GHOST_WARNING', 'SYSTEM_ALERT', 'LORE_FRAGMENT', 'PUZZLE_PIECE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "threads" (
    "id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "is_ghost_thread" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "author_id" TEXT,
    "content" TEXT NOT NULL,
    "is_corrupted" BOOLEAN NOT NULL DEFAULT false,
    "is_ghost_message" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "graves" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "file_type" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "epitaph" TEXT NOT NULL,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "buried_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "raised_at" TIMESTAMP(3),
    "corruption_applied" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "graves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ghost_comments" (
    "id" TEXT NOT NULL,
    "grave_id" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ghost_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mail_messages" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "MessageType" NOT NULL,
    "subject" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mail_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "current_scene_id" TEXT NOT NULL,
    "history" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "variables" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sysop_access" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "unlocked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "puzzle_solution" TEXT NOT NULL,

    CONSTRAINT "sysop_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hidden_threads" (
    "id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "unlock_condition" TEXT NOT NULL,
    "is_revealed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "hidden_threads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "threads_author_id_idx" ON "threads"("author_id");

-- CreateIndex
CREATE INDEX "threads_created_at_idx" ON "threads"("created_at");

-- CreateIndex
CREATE INDEX "messages_thread_id_idx" ON "messages"("thread_id");

-- CreateIndex
CREATE INDEX "messages_author_id_idx" ON "messages"("author_id");

-- CreateIndex
CREATE INDEX "messages_created_at_idx" ON "messages"("created_at");

-- CreateIndex
CREATE INDEX "graves_user_id_idx" ON "graves"("user_id");

-- CreateIndex
CREATE INDEX "graves_is_public_idx" ON "graves"("is_public");

-- CreateIndex
CREATE INDEX "graves_buried_at_idx" ON "graves"("buried_at");

-- CreateIndex
CREATE INDEX "ghost_comments_grave_id_idx" ON "ghost_comments"("grave_id");

-- CreateIndex
CREATE INDEX "mail_messages_user_id_idx" ON "mail_messages"("user_id");

-- CreateIndex
CREATE INDEX "mail_messages_is_read_idx" ON "mail_messages"("is_read");

-- CreateIndex
CREATE INDEX "mail_messages_created_at_idx" ON "mail_messages"("created_at");

-- CreateIndex
CREATE INDEX "game_sessions_user_id_idx" ON "game_sessions"("user_id");

-- CreateIndex
CREATE INDEX "game_sessions_game_id_idx" ON "game_sessions"("game_id");

-- CreateIndex
CREATE UNIQUE INDEX "sysop_access_user_id_key" ON "sysop_access"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "hidden_threads_thread_id_key" ON "hidden_threads"("thread_id");

-- CreateIndex
CREATE INDEX "hidden_threads_is_revealed_idx" ON "hidden_threads"("is_revealed");

-- AddForeignKey
ALTER TABLE "threads" ADD CONSTRAINT "threads_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "graves" ADD CONSTRAINT "graves_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ghost_comments" ADD CONSTRAINT "ghost_comments_grave_id_fkey" FOREIGN KEY ("grave_id") REFERENCES "graves"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mail_messages" ADD CONSTRAINT "mail_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sysop_access" ADD CONSTRAINT "sysop_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
