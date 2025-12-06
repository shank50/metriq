const prisma = require('../src/lib/prisma');

async function main() {
  try {
    const tenants = await prisma.tenant.findMany({ take: 1 });
    console.log(`Connected successfully. Sample tenant count: ${tenants.length}`);
  } catch (error) {
    console.error('Connection failed:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
