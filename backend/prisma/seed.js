"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    const passwordHash = await bcryptjs_1.default.hash("Admin123!", 10);
    const admin = await prisma.user.upsert({
        where: { email: "admin@brillar.com" },
        update: {},
        create: {
            email: "admin@brillar.com",
            name: "Admin User",
            passwordHash,
            role: client_1.Role.ADMIN
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
            status: client_1.ProductStatus.ACTIVE,
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
