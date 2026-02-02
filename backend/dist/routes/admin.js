"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
exports.adminRouter = (0, express_1.Router)();
exports.adminRouter.get("/metrics", auth_1.authenticate, (0, auth_1.requireRole)("ADMIN"), async (_req, res) => {
    const [orderCount, revenueAgg, lowStock] = await Promise.all([
        prisma_1.prisma.order.count(),
        prisma_1.prisma.order.aggregate({ _sum: { total: true } }),
        prisma_1.prisma.inventory.findMany({
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
