// Guard against Prisma re-introductions
if (Object.keys(require.cache).some(k => /prisma/i.test(k))) {
  throw new Error("Prisma detected. This project is Drizzle-only.");
}