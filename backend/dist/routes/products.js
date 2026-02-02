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
    const product = await prisma_1.prisma.$transaction(async (tx) => {
        const created = await tx.product.create({
            data: {
                ...req.body,
                variants: req.body.variants
                    ? {
                        create: req.body.variants.map((variant) => ({
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
                        quantityOnHand: 0,
                        quantityReserved: 0
                    }
                });
            }
        }
        else {
            await tx.inventory.create({
                data: {
                    productId: created.id,
                    quantityOnHand: 0,
                    quantityReserved: 0
                }
            });
        }
        return created;
    });
    res.status(201).json(product);
});
exports.productsRouter.put("/:id", auth_1.authenticate, (0, auth_1.requireRole)("ADMIN"), (0, validate_1.validate)(shared_1.ProductInputSchema), async (req, res) => {
    const product = await prisma_1.prisma.product.update({
        where: { id: req.params.id },
        data: {
            name: req.body.name,
            slug: req.body.slug,
            description: req.body.description,
            price: req.body.price,
            currency: req.body.currency,
            images: req.body.images,
            category: req.body.category,
            tags: req.body.tags,
            status: req.body.status
        }
    });
    res.json(product);
});
exports.productsRouter.delete("/:id", auth_1.authenticate, (0, auth_1.requireRole)("ADMIN"), async (req, res) => {
    await prisma_1.prisma.product.delete({ where: { id: req.params.id } });
    res.status(204).send();
});
