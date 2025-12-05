import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Parse DATABASE_URL to extract connection parameters
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set');
}
const url = new URL(databaseUrl);

// Create PostgreSQL connection pool
const pool = new Pool({
  host: url.hostname,
  port: parseInt(url.port || '5432'),
  database: url.pathname.slice(1),
  user: url.username,
  password: url.password,
});

// Create Prisma adapter
const adapter = new PrismaPg(pool);

// Create Prisma client with adapter
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  // Create test users
  const passwordHash = await bcrypt.hash('password123', 10);

  const user1 = await prisma.user.upsert({
    where: { email: 'ghost@wraithnet.com' },
    update: {},
    create: {
      username: 'GhostWhisperer',
      email: 'ghost@wraithnet.com',
      passwordHash,
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'sysop@wraithnet.com' },
    update: {},
    create: {
      username: 'Sysop',
      email: 'sysop@wraithnet.com',
      passwordHash,
    },
  });

  console.log('✅ Created users:', { user1: user1.username, user2: user2.username });

  // Create sample threads
  const thread1 = await prisma.thread.create({
    data: {
      title: 'Welcome to WRAITHNET',
      authorId: user1.id,
      messages: {
        create: [
          {
            content:
              'Welcome to the haunted network. The spirits are restless tonight...',
            authorId: user1.id,
          },
        ],
      },
    },
  });

  const thread2 = await prisma.thread.create({
    data: {
      title: 'Strange Occurrences',
      authorId: user2.id,
      messages: {
        create: [
          {
            content: 'Has anyone else noticed the system behaving... oddly?',
            authorId: user2.id,
          },
          {
            content: 'Y̴e̷s̶.̷.̸.̴ ̷w̶e̴ ̸h̷a̸v̷e̴ ̶n̸o̷t̴i̸c̴e̶d̷',
            isGhostMessage: true,
            isCorrupted: true,
          },
        ],
      },
    },
  });

  console.log('✅ Created threads:', { thread1: thread1.title, thread2: thread2.title });

  // Create sample mailbox messages
  await prisma.mailMessage.createMany({
    data: [
      {
        userId: user1.id,
        type: 'SYSTEM_ALERT',
        subject: 'System Initialization',
        content: 'The WRAITHNET system has been initialized. The spirits await...',
      },
      {
        userId: user1.id,
        type: 'LORE_FRAGMENT',
        subject: 'Fragment I: The Beginning',
        content:
          'Long ago, this network was alive with voices. Now only echoes remain...',
      },
      {
        userId: user2.id,
        type: 'GHOST_WARNING',
        subject: 'Presence Detected',
        content: 'Something watches from the shadows of the system...',
        isRead: false,
      },
    ],
  });

  console.log('✅ Created mail messages');

  // Create a sample grave
  await prisma.grave.create({
    data: {
      userId: user1.id,
      fileName: 'forgotten_memories.txt',
      fileSize: 1024,
      fileType: 'text/plain',
      storageKey: 'graves/sample-key',
      epitaph: 'Here lies a file, forgotten by time, consumed by the void.',
      isPublic: true,
    },
  });

  console.log('✅ Created sample grave');

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
