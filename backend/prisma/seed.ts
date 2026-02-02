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

  const product = await prisma.product.upsert({
    where: { slug: "aurora-sneakers" },
    update: {},
    create: {
      name: "Aurora Sneakers",
      slug: "aurora-sneakers",
      description: "Lightweight sneakers designed for everyday comfort.",
      price: 129.99,
      currency: "USD",
      images: ["https://images.example.com/sneakers.jpg"],
      category: "Footwear",
      tags: ["sneakers", "new"],
      status: ProductStatus.ACTIVE,
      variants: {
        create: [
          {
            sku: "AUR-SNK-8-BLK",
            attributes: { size: "8", color: "Black" },
            priceOverride: 129.99
          },
          {
            sku: "AUR-SNK-9-WHT",
            attributes: { size: "9", color: "White" },
            priceOverride: 129.99
          }
        ]
      }
    },
    include: { variants: true }
  });

  for (const variant of product.variants) {
    await prisma.inventory.upsert({
      where: { variantId: variant.id },
      update: {},
      create: {
        variantId: variant.id,
        quantityOnHand: 50,
        quantityReserved: 0
      }
    });
  }

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
