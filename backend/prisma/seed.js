import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Checking database setup for production...');

  // Ensure at least one community host user exists for default squad ownership
  let user = await prisma.user.findFirst();
  if (!user) {
    console.log('🌱 Creating default StudySquad Community Admin...');
    user = await prisma.user.create({
      data: {
        name: 'StudySquad Admin',
        email: 'admin@studysquad.io',
        password: '$2a$10$wY9i1x9qY4Lg.4qF5H8r.eD2zZkM1W1m2V1p4a5b6c7d8e9f0g1h2', // securely hashed dummy
        avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=StudySquadAdmin',
        bio: 'Official StudySquad community space open to all real learners.',
      },
    });
  }

  console.log(`Using squad creator: ${user.name} (${user.email})`);

  // Check if squads table is empty (e.g. brand new cloud database deployment)
  const existingSquadsCount = await prisma.squad.count();
  if (existingSquadsCount === 0) {
    console.log('🌱 Pre-populating 6 starter study squads in database...');
    const starterSquads = [
      {
        name: 'LeetCode 75 & System Design',
        category: 'Competitive Coding',
        subject: 'Computer Science',
        description: 'Daily collaborative practice solving algorithmic problems and discussing architecture trade-offs.',
        platform: 'Google Meet',
        meetingUrl: 'https://meet.google.com/new',
        schedule: 'Daily @ 8:00 PM EST',
        maxMembers: 8,
        bannerGradient: 'from-blue-600 to-indigo-900',
        tasks: [
          'Solve 2 Medium Binary Search problems',
          'Review Dynamic Programming memoization patterns',
          'Peer mock interview & algorithmic review',
        ],
      },
      {
        name: 'Calculus III & Linear Algebra Sprint',
        category: 'Finals & Midterms',
        subject: 'Mathematics',
        description: 'Deep dive problem-solving for multivariate integrals, eigenvalues, and vector spaces.',
        platform: 'Google Meet',
        meetingUrl: 'https://meet.google.com/new',
        schedule: 'Mon, Wed, Fri @ 6:30 PM EST',
        maxMembers: 6,
        bannerGradient: 'from-amber-600 to-orange-900',
        tasks: [
          'Practice Stokes Theorem exam questions',
          'Derive Jacobian transformations',
        ],
      },
      {
        name: 'GATE 2027 / GRE Quant Crackers',
        category: 'GRE / GATE / GMAT',
        subject: 'Engineering',
        description: 'High-focus quant drills, formula reviews, and timed speed-run tests for competitive engineering exams.',
        platform: 'Zoom',
        meetingUrl: 'https://zoom.us/join',
        schedule: 'Weekends @ 10:00 AM EST',
        maxMembers: 6,
        bannerGradient: 'from-emerald-600 to-teal-900',
        tasks: [
          'Solve 30 Permutation & Probability questions',
          'Speed test: 20 Quant questions in 25 mins',
        ],
      },
      {
        name: 'Full-Stack Web Dev Capstone Squad',
        category: 'Group Projects',
        subject: 'Software Engineering',
        description: 'Building modern responsive web applications with React, Tailwind, and Node.js.',
        platform: 'Discord',
        meetingUrl: 'https://discord.com',
        schedule: 'Tue & Thu @ 7:00 PM EST',
        maxMembers: 6,
        bannerGradient: 'from-purple-600 to-pink-900',
        tasks: [
          'Setup PostgreSQL Prisma schema',
          'Implement JWT Auth & protected routes flow',
        ],
      },
      {
        name: '5 AM 100-Days Accountability Club',
        category: 'Daily Accountability',
        subject: 'General Study',
        description: 'Wake up early, silent study sessions using strict 50/10 Pomodoro intervals to build relentless discipline.',
        platform: 'Google Meet',
        meetingUrl: 'https://meet.google.com/new',
        schedule: 'Daily @ 5:30 AM EST',
        maxMembers: 10,
        bannerGradient: 'from-rose-600 to-red-900',
        tasks: [
          'Session 1: 50 min deep work',
          'Session 2: 50 min deep work',
          'Session 3: 50 min revision',
        ],
      },
      {
        name: 'Deep Learning & LLM Research Reading Group',
        category: 'Research & Thesis',
        subject: 'Artificial Intelligence',
        description: 'Reading seminal research papers on Transformers, diffusion models, and reasoning architectures.',
        platform: 'Zoom',
        meetingUrl: 'https://zoom.us/join',
        schedule: 'Every Sunday @ 4:00 PM EST',
        maxMembers: 6,
        bannerGradient: 'from-cyan-600 to-blue-900',
        tasks: [
          'Read "Attention Is All You Need" seminal paper',
          'Analyze DPO vs PPO paper comparisons',
        ],
      },
    ];

    for (const sq of starterSquads) {
      const { tasks, ...squadData } = sq;
      const createdSquad = await prisma.squad.create({
        data: {
          ...squadData,
          ownerId: user.id,
        },
      });

      // Add default study checklist tasks
      for (const t of tasks) {
        await prisma.task.create({
          data: {
            squadId: createdSquad.id,
            userId: user.id,
            text: t,
            completed: false,
          },
        });
      }
    }
    console.log('✅ Created 6 starter squads in database.');
  }

  // Reassign any orphaned squads to the current user
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

  console.log('✅ Database is clean, persistent, and ready for public multi-user hosting!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
