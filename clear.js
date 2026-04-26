const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.teacher.deleteMany({});
  console.log('Deleted teachers');
}
main().catch(console.error).finally(() => prisma.$disconnect());
