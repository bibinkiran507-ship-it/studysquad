import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Checking database setup for production...');

  // Find or use any existing registered user as the default room creator
  let user = await prisma.user.findFirst();

  if (!user) {
    console.log('No user registered yet. Waiting for real users to register.');
    return;
  }

  console.log(`Found real user: ${user.name} (${user.email})`);

  // Safe check: Only link squads that are orphaned (have no existing owner in database)
  const allUsers = await prisma.user.findMany({ select: { id: true } });
  const validUserIds = new Set(allUsers.map((u) => u.id));
  const squads = await prisma.squad.findMany({ select: { id: true, ownerId: true } });
  const orphanedSquads = squads.filter((s) => !validUserIds.has(s.ownerId));

  if (orphanedSquads.length > 0 && user) {
    for (const s of orphanedSquads) {
      await prisma.squad.update({
        where: { id: s.id },
        data: { ownerId: user.id },
      });
    }
    console.log(`Reassigned ${orphanedSquads.length} orphaned squads to default admin.`);
  }

  // Ensure no dummy/fake bot messages exist in the database
  const deleted = await prisma.message.deleteMany({
    where: {
      user: {
        email: {
          endsWith: '@studysquad.io',
        },
      },
    },
  });

  if (deleted.count > 0) {
    console.log(`Removed ${deleted.count} fake bot messages.`);
  }

  console.log('✅ Database is clean and ready for public multi-user hosting!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
