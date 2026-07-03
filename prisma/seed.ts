import { PrismaClient, QuestionType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const q = (
  text: string,
  type: QuestionType,
  points: number,
  options: [string, boolean][]
) => ({
  text,
  type,
  points,
  options: { create: options.map(([t, isCorrect]) => ({ text: t, isCorrect })) },
});

async function main() {
  console.log("Seeding database…");

  // Clean slate (order matters because of FKs)
  await prisma.prize.deleteMany();
  await prisma.answer.deleteMany();
  await prisma.participation.deleteMany();
  await prisma.option.deleteMany();
  await prisma.question.deleteMany();
  await prisma.contest.deleteMany();
  await prisma.user.deleteMany();

  const password = await bcrypt.hash("password123", 10);

  const [admin, vip, user1, user2] = await Promise.all([
    prisma.user.create({ data: { name: "Admin", email: "admin@example.com", password, role: "ADMIN" } }),
    prisma.user.create({ data: { name: "Vicky VIP", email: "vip@example.com", password, role: "VIP" } }),
    prisma.user.create({ data: { name: "Nomi Normal", email: "user@example.com", password, role: "USER" } }),
    prisma.user.create({ data: { name: "Sana User", email: "sana@example.com", password, role: "USER" } }),
  ]);

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  // 1) ACTIVE normal contest
  const general = await prisma.contest.create({
    data: {
      name: "General Knowledge Challenge",
      description: "A quick GK quiz open to all signed-in users. Top scorer wins!",
      accessLevel: "NORMAL",
      startTime: new Date(now - day),
      endTime: new Date(now + 7 * day),
      prize: "Rs. 5,000 Gift Card",
      questions: {
        create: [
          q("What is the capital of Pakistan?", "SINGLE_SELECT", 2, [
            ["Karachi", false],
            ["Lahore", false],
            ["Islamabad", true],
            ["Peshawar", false],
          ]),
          q("Which of these are programming languages?", "MULTI_SELECT", 3, [
            ["Python", true],
            ["HTML", false],
            ["JavaScript", true],
            ["Photoshop", false],
          ]),
          q("The sun rises in the east.", "TRUE_FALSE", 1, [
            ["True", true],
            ["False", false],
          ]),
          q("2 + 2 × 2 = ?", "SINGLE_SELECT", 2, [
            ["8", false],
            ["6", true],
            ["4", false],
          ]),
        ],
      },
    },
  });

  // 2) ACTIVE VIP contest
  await prisma.contest.create({
    data: {
      name: "VIP Masters Cup",
      description: "Exclusive contest for VIP members only. Bigger prize, tougher questions.",
      accessLevel: "VIP",
      startTime: new Date(now - day),
      endTime: new Date(now + 5 * day),
      prize: "iPhone 17 Pro",
      questions: {
        create: [
          q("Which data structure uses FIFO?", "SINGLE_SELECT", 3, [
            ["Stack", false],
            ["Queue", true],
            ["Tree", false],
          ]),
          q("Select the NoSQL databases:", "MULTI_SELECT", 4, [
            ["MongoDB", true],
            ["PostgreSQL", false],
            ["Redis", true],
            ["MySQL", false],
          ]),
          q("HTTP status 429 means 'Too Many Requests'.", "TRUE_FALSE", 2, [
            ["True", true],
            ["False", false],
          ]),
        ],
      },
    },
  });

  // 3) ENDED + finalized contest with a winner (history/prize demo)
  const ended = await prisma.contest.create({
    data: {
      name: "Ramadan Quiz 2026",
      description: "A finished contest — check the leaderboard and prize history.",
      accessLevel: "NORMAL",
      startTime: new Date(now - 10 * day),
      endTime: new Date(now - 3 * day),
      prize: "Umrah Ticket",
      finalized: true,
      questions: {
        create: [
          q("How many days are in Ramadan (typically)?", "SINGLE_SELECT", 2, [
            ["29 or 30", true],
            ["31", false],
            ["28", false],
          ]),
          q("Fasting starts at Fajr.", "TRUE_FALSE", 1, [
            ["True", true],
            ["False", false],
          ]),
        ],
      },
    },
  });

  await prisma.participation.create({
    data: {
      userId: user1.id,
      contestId: ended.id,
      status: "SUBMITTED",
      score: 3,
      submittedAt: new Date(now - 4 * day),
    },
  });
  await prisma.participation.create({
    data: {
      userId: user2.id,
      contestId: ended.id,
      status: "SUBMITTED",
      score: 2,
      submittedAt: new Date(now - 4 * day),
    },
  });
  await prisma.prize.create({
    data: { userId: user1.id, contestId: ended.id, prizeName: "Umrah Ticket", score: 3 },
  });

  // user2 joined the active contest but never submitted (in-progress demo)
  await prisma.participation.create({
    data: { userId: user2.id, contestId: general.id, status: "IN_PROGRESS" },
  });

  console.log("Seed complete.");
  console.log("Accounts (password for all: password123):");
  console.log(`  ADMIN: ${admin.email}`);
  console.log(`  VIP:   ${vip.email}`);
  console.log(`  USER:  ${user1.email}, ${user2.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
