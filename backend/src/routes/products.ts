import { Router } from "express";
import { prisma } from "../prisma";
import { authenticate, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { ProductInputSchema } from "@brillar/shared";

export const productsRouter = Router();

productsRouter.get("/", async (req, res) => {
  const {
    q,
    category,
    status,
    sort = "createdAt",
    order = "desc",
    page = "1",
    pageSize = "12"
  } = req.query;

  const where: any = {};
  if (q) {
    where.OR = [
      { name: { contains: q as string, mode: "insensitive" } },
      { description: { contains: q as string, mode: "insensitive" } }
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
    prisma.product.findMany({
      where,
      orderBy: { [sort as string]: order },
      skip: (pageNumber - 1) * sizeNumber,
      take: sizeNumber,
      include: { variants: true }
    }),
    prisma.product.count({ where })
  ]);

  res.json({
    items,
    total,
    page: pageNumber,
    pageSize: sizeNumber
  });
});

productsRouter.get("/:id", async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { id: req.params.id },
    include: { variants: true }
  });
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }
  res.json(product);
});

productsRouter.post(
  "/",
  authenticate,
  requireRole("ADMIN"),
  validate(ProductInputSchema),
  async (req, res) => {
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          ...req.body,
          variants: req.body.variants
            ? {
                create: req.body.variants.map((variant: any) => ({
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
      } else {
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
  }
);

productsRouter.put(
  "/:id",
  authenticate,
  requireRole("ADMIN"),
  validate(ProductInputSchema),
  async (req, res) => {
    const product = await prisma.product.update({
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
  }
);

productsRouter.delete(
  "/:id",
  authenticate,
  requireRole("ADMIN"),
  async (req, res) => {
    await prisma.product.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }
);
