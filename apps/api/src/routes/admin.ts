import { Router } from "express";
import { prisma } from "../prisma";
import { authenticate, requireRole } from "../middleware/auth";

export const adminRouter = Router();

adminRouter.get("/metrics", authenticate, requireRole("ADMIN"), async (_req, res) => {
  const [orderCount, revenueAgg, lowStock] = await Promise.all([
    prisma.order.count(),
    prisma.order.aggregate({ _sum: { total: true } }),
    prisma.inventory.findMany({
      where: { quantityOnHand: { lt: 5 } },
      include: { product: true, variant: true }
    })
  ]);

  res.json({
    totalOrders: orderCount,
    totalRevenue: Number(revenueAgg._sum.total ?? 0),
    lowStockItems: lowStock
  });
});
