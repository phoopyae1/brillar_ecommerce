import { PrismaClient, ProductStatus, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Admin123!", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@brillar.com" },
    update: {},
    create: {
      email: "admin@brillar.com",
      name: "Admin User",
      passwordHash,
      role: Role.ADMIN
    }
  });

  // Seed data removed - use admin panel to add products
  console.log("Seeded admin", admin.email);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
