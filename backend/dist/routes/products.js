"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productsRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const shared_1 = require("@brillar/shared");
exports.productsRouter = (0, express_1.Router)();
exports.productsRouter.get("/", async (req, res) => {
    const { q, category, status, sort = "createdAt", order = "desc", page = "1", pageSize = "12" } = req.query;
    const where = {};
    if (q) {
        where.OR = [
            { name: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } }
        ];
    }
    if (category) {
        where.category = category;
    }
    if (status) {
        where.status = status;
    }
    const pageNumber = Number(page);
    const sizeNumber = Number(pageSize);
    const [items, total] = await Promise.all([
        prisma_1.prisma.product.findMany({
            where,
            orderBy: { [sort]: order },
            skip: (pageNumber - 1) * sizeNumber,
            take: sizeNumber,
            include: { variants: true }
        }),
        prisma_1.prisma.product.count({ where })
    ]);
    // Ensure all products have inventory records (backfill missing ones)
    // Use Promise.allSettled to handle errors gracefully and not block the response
    await Promise.allSettled(items.map(async (product) => {
        if (product.variants.length > 0) {
            // For products with variants, ensure each variant has inventory
            await Promise.all(product.variants.map(async (variant) => {
                const existingInventory = await prisma_1.prisma.inventory.findFirst({
                    where: { variantId: variant.id }
                });
                if (!existingInventory) {
                    await prisma_1.prisma.inventory.create({
                        data: {
                            variantId: variant.id,
                            quantityOnHand: 0,
                            quantityReserved: 0
                        }
                    });
                }
            }));
        }
        else {
            // For products without variants, ensure product-level inventory exists
            const existingInventory = await prisma_1.prisma.inventory.findFirst({
                where: {
                    productId: product.id,
                    variantId: null
                }
            });
            if (!existingInventory) {
                await prisma_1.prisma.inventory.create({
                    data: {
                        productId: product.id,
                        quantityOnHand: 0,
                        quantityReserved: 0
                    }
                });
            }
        }
    }));
    res.json({
        items,
        total,
        page: pageNumber,
        pageSize: sizeNumber
    });
});
exports.productsRouter.get("/:id", async (req, res) => {
    const product = await prisma_1.prisma.product.findUnique({
        where: { id: req.params.id },
        include: { variants: true }
    });
    if (!product) {
        return res.status(404).json({ message: "Product not found" });
    }
    res.json(product);
});
exports.productsRouter.post("/", auth_1.authenticate, (0, auth_1.requireRole)("ADMIN"), (0, validate_1.validate)(shared_1.ProductInputSchema), async (req, res) => {
    try {
        // Check if slug already exists
        const existingProduct = await prisma_1.prisma.product.findUnique({
            where: { slug: req.body.slug }
        });
        if (existingProduct) {
            return res.status(400).json({
                message: `A product with the slug "${req.body.slug}" already exists. Please use a different slug.`
            });
        }
        const { stock, ...productData } = req.body;
        const initialStock = stock ? parseInt(stock) : 0;
        const product = await prisma_1.prisma.$transaction(async (tx) => {
            const created = await tx.product.create({
                data: {
                    ...productData,
                    variants: productData.variants
                        ? {
                            create: productData.variants.map((variant) => ({
                                sku: variant.sku,
                                attributes: variant.attributes,
                                priceOverride: variant.priceOverride
                            }))
                        }
                        : undefined
                },
                include: { variants: true }
            });
            if (created.variants.length > 0) {
                for (const variant of created.variants) {
                    await tx.inventory.create({
                        data: {
                            variantId: variant.id,
                            quantityOnHand: initialStock,
                            quantityReserved: 0
                        }
                    });
                }
            }
            else {
                await tx.inventory.create({
                    data: {
                        productId: created.id,
                        quantityOnHand: initialStock,
                        quantityReserved: 0
                    }
                });
            }
            return created;
        });
        res.status(201).json(product);
    }
    catch (error) {
        // Handle Prisma unique constraint errors
        if (error.code === "P2002") {
            if (error.meta?.target?.includes("slug")) {
                return res.status(400).json({
                    message: `A product with the slug "${req.body.slug}" already exists. Please use a different slug.`
                });
            }
        }
        throw error;
    }
});
exports.productsRouter.put("/:id", auth_1.authenticate, (0, auth_1.requireRole)("ADMIN"), (0, validate_1.validate)(shared_1.ProductInputSchema), async (req, res) => {
    const updateData = {
        name: req.body.name,
        slug: req.body.slug,
        description: req.body.description,
        price: req.body.price,
        currency: req.body.currency,
        images: req.body.images,
        category: req.body.category,
        tags: req.body.tags,
        status: req.body.status
    };
    // Include cost if provided, or set to null if not provided
    if (req.body.cost !== undefined) {
        updateData.cost = req.body.cost || null;
    }
    const product = await prisma_1.prisma.product.update({
        where: { id: req.params.id },
        data: updateData
    });
    res.json(product);
});
exports.productsRouter.delete("/:id", auth_1.authenticate, (0, auth_1.requireRole)("ADMIN"), async (req, res) => {
    await prisma_1.prisma.product.delete({ where: { id: req.params.id } });
    res.status(204).send();
});
