import { Router } from "express";
import { Prisma, OrderStatus } from "@prisma/client";
import { prisma } from "../prisma";
import { authenticate, requireRole } from "../middleware/auth";
import { CheckoutSchema } from "@brillar/shared";
import { validate } from "../middleware/validate";
import { adjustInventory, consumeInventory } from "../services/inventoryService";

export const ordersRouter = Router();

ordersRouter.get("/", authenticate, async (req, res) => {
  const userId = req.user!.id;
  const userEmail = req.user!.email;
  
  console.log("=== Fetching Orders ===");
  console.log("User ID from token:", userId, "Type:", typeof userId);
  console.log("User email from token:", userEmail);
  
  // Strategy 1: Try to find orders by userId (normal case)
  let orders = await prisma.order.findMany({
    where: { userId },
    include: { items: true },
    orderBy: { createdAt: "desc" }
  });
  
  // Fetch product details for each order item
  for (const order of orders) {
    for (const item of order.items) {
      if (item.productId) {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: { id: true, name: true, images: true, slug: true }
        });
        (item as any).product = product;
      }
    }
  }
  
  console.log(`Strategy 1: Found ${orders.length} orders for user ID: ${userId}`);
  
  // Strategy 2: If no orders found, try to find by email (more reliable)
  if (orders.length === 0 && userEmail) {
    console.log("Strategy 2: No orders by userId, trying to find by email:", userEmail);
    
    // Find user by email first
    const userByEmail = await prisma.user.findUnique({
      where: { email: userEmail }
    });
    
    if (userByEmail) {
      console.log(`Found user by email. User ID: ${userByEmail.id}, Token User ID: ${userId}`);
      
      // Get orders for this user (by their actual userId in database)
      const ordersByEmailUser = await prisma.order.findMany({
        where: { userId: userByEmail.id },
        include: { items: true },
        orderBy: { createdAt: "desc" }
      });
      
      // Fetch product details for each order item
      for (const order of ordersByEmailUser) {
        for (const item of order.items) {
          if (item.productId) {
            const product = await prisma.product.findUnique({
              where: { id: item.productId },
              select: { id: true, name: true, images: true, slug: true }
            });
            (item as any).product = product;
          }
        }
      }
      
      console.log(`Found ${ordersByEmailUser.length} orders for user ID ${userByEmail.id}`);
      
      if (ordersByEmailUser.length > 0) {
        // If userIds don't match, update orders to use current userId from token
        if (userByEmail.id !== userId) {
          console.log("⚠️ User ID mismatch! Updating orders...");
          console.log(`  Database user ID: ${userByEmail.id}`);
          console.log(`  Token user ID: ${userId}`);
          
          await prisma.order.updateMany({
            where: { userId: userByEmail.id },
            data: { userId: userId }
          });
          
          console.log(`✓ Updated ${ordersByEmailUser.length} orders to use userId: ${userId}`);
        }
        
        orders = ordersByEmailUser;
      }
    } else {
      console.log("⚠️ No user found with email:", userEmail);
    }
  }
  
  // Strategy 3: Direct query by email using join (last resort)
  if (orders.length === 0 && userEmail) {
    console.log("Strategy 3: Trying direct query with user email join...");
    
    // Use raw query to find orders by email
    const ordersByEmail = await prisma.$queryRaw<any[]>`
      SELECT o.* FROM "Order" o
      INNER JOIN "User" u ON o."userId" = u.id
      WHERE u.email = ${userEmail}
      ORDER BY o."createdAt" DESC
    `;
    
    if (ordersByEmail && ordersByEmail.length > 0) {
      console.log(`Found ${ordersByEmail.length} orders via raw query`);
      
      // Get full order details with items
      const orderIds = ordersByEmail.map((o: any) => o.id);
      orders = await prisma.order.findMany({
        where: { id: { in: orderIds } },
        include: { items: true },
        orderBy: { createdAt: "desc" }
      });
      
      // Fetch product details for each order item
      for (const order of orders) {
        for (const item of order.items) {
          if (item.productId) {
            const product = await prisma.product.findUnique({
              where: { id: item.productId },
              select: { id: true, name: true, images: true, slug: true }
            });
            (item as any).product = product;
          }
        }
      }
      
      // Update orders to use correct userId
      if (orders.length > 0 && orders[0].userId !== userId) {
        console.log("Updating orders to use correct userId...");
        await prisma.order.updateMany({
          where: { id: { in: orderIds } },
          data: { userId: userId }
        });
        console.log("✓ Orders updated");
      }
    }
  }
  
  // Debug: Check total orders in database
  if (orders.length === 0) {
    const allOrdersCount = await prisma.order.count();
    console.log(`Total orders in database: ${allOrdersCount}`);
    
    if (allOrdersCount > 0) {
      const sampleOrders = await prisma.order.findMany({
        take: 5,
        select: { 
          id: true, 
          userId: true, 
          createdAt: true
        },
        orderBy: { createdAt: "desc" }
      });
      
      // Get user emails for these orders
      const userIds = [...new Set(sampleOrders.map(o => o.userId))];
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, email: true }
      });
      
      const ordersWithUsers = sampleOrders.map(order => ({
        ...order,
        userEmail: users.find(u => u.id === order.userId)?.email || "unknown"
      }));
        console.log("Sample orders:", JSON.stringify(ordersWithUsers, null, 2));
      console.warn("⚠️ Orders exist but none match current user!");
    }
  }
  
  // Final logging
  if (orders.length > 0) {
    console.log(`✓ SUCCESS: Returning ${orders.length} orders`);
    console.log("First order:", {
      id: orders[0].id,
      userId: orders[0].userId,
      total: orders[0].total,
      itemsCount: orders[0].items.length,
      createdAt: orders[0].createdAt
    });
  } else {
    console.warn("✗ FAILED: No orders found for user");
  }
  console.log("========================");
  
  res.json(orders);
});

ordersRouter.get("/:id", authenticate, async (req, res) => {
  const order = await prisma.order.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
    include: { items: true }
  });
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }
  
  // Fetch product details for each order item
  for (const item of order.items) {
    if (item.productId) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: { id: true, name: true, images: true, slug: true }
      });
      (item as any).product = product;
    }
  }
  
  res.json(order);
});

ordersRouter.post(
  "/checkout",
  authenticate,
  validate(CheckoutSchema),
  async (req, res) => {
    const cartId = req.headers["x-cart-id"] as string | undefined;
    
    // First try to find cart by cartId and userId
    let cart = await prisma.cart.findFirst({
      where: {
        id: cartId,
        userId: req.user!.id
      },
      include: { items: true }
    });

    // If not found, try to find by cartId only (guest cart)
    if (!cart && cartId) {
      cart = await prisma.cart.findUnique({
        where: { id: cartId },
        include: { items: true }
      });
      
      // If found as guest cart, update it to have userId
      if (cart) {
        cart = await prisma.cart.update({
          where: { id: cartId },
          data: { userId: req.user!.id },
          include: { items: true }
        });
      }
    }

    // If still not found, try to find user's existing cart
    if (!cart) {
      cart = await prisma.cart.findFirst({
        where: { userId: req.user!.id },
        include: { items: true }
      });
    }

    if (!cart || cart?.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    const order = await prisma.$transaction(async (tx) => {
      let total = 0;
      const orderItems: any[] = [];
      for (const item of cart?.items || []) {
        const product = await tx.product.findUnique({
          where: { id: item.productId }
        });
        if (!product) {
          throw new Error("Product not found");
        }
        const variant = item.variantId
          ? await tx.productVariant.findUnique({ where: { id: item.variantId } })
          : null;
        const price = Number(variant?.priceOverride ?? product.price);
        total += price * item.quantity;

        const column = item.variantId ? "variantId" : "productId";
        const inventoryRows = await tx.$queryRaw<any[]>(
          Prisma.sql`
            SELECT * FROM "Inventory"
            WHERE ${Prisma.raw(`\"${column}\"`)} = ${item.variantId ?? item.productId}
            LIMIT 1
            FOR UPDATE
          `
        );
        const inventory = inventoryRows[0];
        if (!inventory) {
          throw new Error("Inventory record not found");
        }
        const adjustment = consumeInventory(inventory, item.quantity);
        await tx.inventory.update({
          where: { id: inventory.id },
          data: {
            quantityOnHand: adjustment.quantityOnHand,
            quantityReserved: adjustment.quantityReserved
          }
        });
        await tx.inventoryMovement.create({
          data: {
            inventoryId: inventory.id,
            type: "OUT",
            quantity: item.quantity,
            reference: `order:${cart?.id}`,
            createdBy: req.user?.id
          }
        });

        orderItems.push({
          productId: product.id,
          variantId: variant?.id,
          name: product.name,
          sku: variant?.sku,
          price,
          quantity: item.quantity
        });
      }

      const userId = req.user!.id;
      console.log("Creating order for user ID:", userId);

      const created = await tx.order.create({
        data: {
          userId,
          status: "PAID",
          total,
          currency: "USD",
          items: {
            create: orderItems
          }
        },
        include: { items: true }
      });

      console.log("Order created successfully:", {
        id: created.id,
        userId: created.userId,
        total: created.total,
        itemsCount: created.items.length
      });

      await tx.cartItem.deleteMany({ where: { cartId: cart?.id } });

      return created;
    });

    res.status(201).json(order);
  }
);

ordersRouter.get(
  "/admin/all",
  authenticate,
  requireRole("ADMIN"),
  async (_req, res) => {
    const orders = await prisma.order.findMany({
      include: { items: true, user: true },
      orderBy: { createdAt: "desc" }
    });
    res.json(orders);
  }
);

ordersRouter.patch(
  "/admin/:id/status",
  authenticate,
  requireRole("ADMIN"),
  async (req, res) => {
    const { status } = req.body as { status: string };
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { items: true }
    });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (["CANCELLED", "REFUNDED"].includes(status)) {
      await prisma.$transaction(async (tx) => {
        for (const item of order.items) {
          const inventory = await tx.inventory.findFirst({
            where: {
              productId: item.variantId ? undefined : item.productId,
              variantId: item.variantId ?? undefined
            }
          });
          if (!inventory) {
            continue;
          }
          const adjustment = adjustInventory(inventory, item.quantity);
          await tx.inventory.update({
            where: { id: inventory.id },
            data: {
              quantityReserved: adjustment.quantityReserved,
              quantityOnHand: adjustment.quantityOnHand
            }
          });
          await tx.inventoryMovement.create({
            data: {
              inventoryId: inventory.id,
              type: "IN",
              quantity: item.quantity,
              reference: `order:${order.id}`,
              createdBy: req.user?.id
            }
          });
        }
      });
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status: status as OrderStatus }
    });

    res.json(updated);
  }
);
