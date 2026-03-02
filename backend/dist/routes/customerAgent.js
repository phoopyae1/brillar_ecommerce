"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.customerAgentRouter = void 0;
const express_1 = require("express");
const client_1 = require("@prisma/client");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const inventoryService_1 = require("../services/inventoryService");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
exports.customerAgentRouter = (0, express_1.Router)();
// POST endpoint to get all products with prices - Customer only
exports.customerAgentRouter.post("/product-list", auth_1.tryRefreshToken, auth_1.authenticate, (0, auth_1.requireRole)("CUSTOMER"), async (req, res) => {
    let trimmedCustomerId;
    try {
        // Extract customerId from request body (only field allowed)
        const { customerId: bodyCustomerId, ...rest } = req.body;
        // Check if any extra fields were provided
        if (Object.keys(rest).length > 0) {
            return res.status(400).json({
                message: "Request body should only contain 'customerId' field",
                received: Object.keys(req.body),
                allowedFields: ["customerId"],
                extraFields: Object.keys(rest)
            });
        }
        console.log("Product list request received:", {
            customerIdFromBody: bodyCustomerId,
            customerIdFromToken: req.user?.id
        });
        // Validate request body
        if (!req.body || typeof req.body !== 'object') {
            return res.status(400).json({
                message: "Invalid request body. Expected JSON object with 'customerId' field"
            });
        }
        // customerId is REQUIRED in request body
        if (!bodyCustomerId) {
            return res.status(400).json({
                message: "Customer ID is required in request body",
                received: req.body,
                requiredFields: ["customerId"]
            });
        }
        const customerId = bodyCustomerId;
        // Validate customerId format - must be a non-empty string
        if (typeof customerId !== 'string' || customerId.trim() === '') {
            return res.status(400).json({
                message: "Customer ID must be a non-empty string",
                received: { customerId, customerIdType: typeof customerId }
            });
        }
        trimmedCustomerId = String(customerId).trim();
        // Security check: customerId in body must match the authenticated user's ID
        if (req.user && trimmedCustomerId !== req.user.id) {
            return res.status(403).json({
                message: "Customer ID in request body must match the authenticated user's ID",
                providedCustomerId: trimmedCustomerId,
                authenticatedUserId: req.user.id
            });
        }
        // Verify customer exists and is a customer (REQUIRED)
        try {
            const customer = await prisma_1.prisma.user.findUnique({
                where: { id: trimmedCustomerId },
                select: { id: true, role: true, email: true }
            });
            if (!customer) {
                return res.status(404).json({
                    message: "Customer not found",
                    customerId: trimmedCustomerId
                });
            }
            if (customer.role !== "CUSTOMER") {
                return res.status(403).json({
                    message: "User is not a customer",
                    customerId: trimmedCustomerId,
                    role: customer.role,
                    email: customer.email
                });
            }
            console.log(`Customer verified: ${trimmedCustomerId} (${customer.email})`);
        }
        catch (customerError) {
            console.error("Error verifying customer:", customerError);
            return res.status(500).json({
                message: "Failed to verify customer",
                customerId: trimmedCustomerId,
                error: customerError.message
            });
        }
        // Build where clause - only show active products
        const where = {
            status: "ACTIVE"
        };
        // Default pagination
        const pageNumber = 1;
        const sizeNumber = 100; // Return more products by default
        const skip = 0;
        // Default sorting
        const sortField = "createdAt";
        const sortOrder = "desc";
        // Fetch products with variants and inventory
        const [products, total] = await Promise.all([
            prisma_1.prisma.product.findMany({
                where,
                orderBy: { [sortField]: sortOrder },
                skip,
                take: sizeNumber,
                include: {
                    variants: {
                        include: {
                            inventory: true
                        }
                    },
                    inventory: true
                }
            }),
            prisma_1.prisma.product.count({ where })
        ]);
        // Format products for customer view (exclude cost, include available stock)
        const formattedProducts = products.map(product => {
            // Calculate available stock for product
            let availableStock = 0;
            let isInStock = false;
            let isLowStock = false;
            if (product.variants.length > 0) {
                // For products with variants, sum up all variant inventory
                product.variants.forEach(variant => {
                    if (variant.inventory && variant.inventory.length > 0) {
                        const variantInventory = variant.inventory[0];
                        const available = variantInventory.quantityOnHand - variantInventory.quantityReserved;
                        availableStock += available;
                    }
                });
            }
            else {
                // For products without variants, use product-level inventory
                if (product.inventory && product.inventory.length > 0) {
                    const productInventory = product.inventory[0];
                    availableStock = productInventory.quantityOnHand - productInventory.quantityReserved;
                }
            }
            isInStock = availableStock > 0;
            isLowStock = availableStock > 0 && availableStock < 10;
            // Format variants (exclude cost, include stock info)
            const formattedVariants = product.variants.map(variant => {
                let variantAvailableStock = 0;
                let variantIsInStock = false;
                let variantIsLowStock = false;
                if (variant.inventory && variant.inventory.length > 0) {
                    const variantInventory = variant.inventory[0];
                    variantAvailableStock = variantInventory.quantityOnHand - variantInventory.quantityReserved;
                    variantIsInStock = variantAvailableStock > 0;
                    variantIsLowStock = variantAvailableStock > 0 && variantAvailableStock < 10;
                }
                return {
                    id: variant.id,
                    sku: variant.sku,
                    attributes: variant.attributes,
                    priceOverride: variant.priceOverride,
                    availableStock: variantAvailableStock,
                    isInStock: variantIsInStock,
                    isLowStock: variantIsLowStock
                };
            });
            return {
                id: product.id,
                name: product.name,
                slug: product.slug,
                description: product.description,
                price: product.price,
                currency: product.currency,
                images: product.images,
                category: product.category,
                tags: product.tags,
                status: product.status,
                createdAt: product.createdAt,
                updatedAt: product.updatedAt,
                availableStock,
                isInStock,
                isLowStock,
                variants: formattedVariants
            };
        });
        // Get unique categories
        const categories = await prisma_1.prisma.product.findMany({
            where: { status: "ACTIVE" },
            select: { category: true },
            distinct: ["category"]
        });
        console.log(`Product list fetched successfully: ${formattedProducts.length} products for customer: ${trimmedCustomerId}`);
        res.json({
            products: formattedProducts,
            pagination: {
                page: pageNumber,
                pageSize: sizeNumber,
                total,
                totalPages: Math.ceil(total / sizeNumber)
            },
            filters: {
                availableCategories: categories.map(c => c.category).filter(Boolean),
                status: "ACTIVE"
            },
            customerId: trimmedCustomerId
        });
    }
    catch (error) {
        console.error("Error fetching product list:", error);
        res.status(500).json({
            message: "Failed to fetch product list",
            error: error.message,
            customerId: trimmedCustomerId || req.body?.customerId || "unknown"
        });
    }
});
// Helper function to verify customer
async function verifyCustomer(customerId, authenticatedUserId) {
    // Security check: customerId must match the authenticated user's ID
    if (authenticatedUserId && customerId !== authenticatedUserId) {
        return {
            error: {
                status: 403,
                message: "Customer ID in request body must match the authenticated user's ID",
                providedCustomerId: customerId,
                authenticatedUserId: authenticatedUserId
            }
        };
    }
    // Verify customer exists and is a customer
    const customer = await prisma_1.prisma.user.findUnique({
        where: { id: customerId },
        select: { id: true, role: true, email: true }
    });
    if (!customer) {
        return {
            error: {
                status: 404,
                message: "Customer not found",
                customerId: customerId
            }
        };
    }
    if (customer.role !== "CUSTOMER") {
        return {
            error: {
                status: 403,
                message: "User is not a customer",
                customerId: customerId,
                role: customer.role,
                email: customer.email
            }
        };
    }
    return { customer };
}
// POST endpoint to get all orders for a customer - Customer only
exports.customerAgentRouter.post("/orders-list", auth_1.tryRefreshToken, auth_1.authenticate, (0, auth_1.requireRole)("CUSTOMER"), async (req, res) => {
    let trimmedCustomerId;
    try {
        // Extract customerId from request body (only field allowed)
        const { customerId: bodyCustomerId, ...rest } = req.body;
        // Check if any extra fields were provided
        if (Object.keys(rest).length > 0) {
            return res.status(400).json({
                message: "Request body should only contain 'customerId' field",
                received: Object.keys(req.body),
                allowedFields: ["customerId"],
                extraFields: Object.keys(rest)
            });
        }
        console.log("Orders list request received:", {
            customerIdFromBody: bodyCustomerId,
            customerIdFromToken: req.user?.id
        });
        // Validate request body
        if (!req.body || typeof req.body !== 'object') {
            return res.status(400).json({
                message: "Invalid request body. Expected JSON object with 'customerId' field"
            });
        }
        // customerId is REQUIRED in request body
        if (!bodyCustomerId) {
            return res.status(400).json({
                message: "Customer ID is required in request body",
                received: req.body,
                requiredFields: ["customerId"]
            });
        }
        const customerId = bodyCustomerId;
        // Validate customerId format
        if (typeof customerId !== 'string' || customerId.trim() === '') {
            return res.status(400).json({
                message: "Customer ID must be a non-empty string",
                received: { customerId, customerIdType: typeof customerId }
            });
        }
        trimmedCustomerId = String(customerId).trim();
        // Verify customer
        const verification = await verifyCustomer(trimmedCustomerId, req.user?.id);
        if (verification.error) {
            return res.status(verification.error.status).json(verification.error);
        }
        console.log(`Customer verified: ${trimmedCustomerId} (${verification.customer.email})`);
        // Fetch orders for the customer
        let orders;
        try {
            orders = await prisma_1.prisma.order.findMany({
                where: { userId: trimmedCustomerId },
                include: {
                    items: true
                },
                orderBy: { createdAt: "desc" }
            });
        }
        catch (prismaError) {
            // If Prisma client doesn't recognize new enum values, use raw SQL
            if (prismaError.message?.includes("not found in enum") || prismaError.code === "P2003") {
                console.warn("Prisma client out of sync with database enum. Using raw SQL fallback.");
                const rawOrders = await prisma_1.prisma.$queryRaw `
            SELECT o.*, 
                   json_agg(
                     json_build_object(
                       'id', oi.id,
                       'orderId', oi."orderId",
                       'productId', oi."productId",
                       'variantId', oi."variantId",
                       'name', oi.name,
                       'quantity', oi.quantity,
                       'price', oi.price,
                       'sku', oi.sku
                     )
                   ) FILTER (WHERE oi.id IS NOT NULL) as items
            FROM "Order" o
            LEFT JOIN "OrderItem" oi ON oi."orderId" = o.id
            WHERE o."userId" = ${trimmedCustomerId}
            GROUP BY o.id
            ORDER BY o."createdAt" DESC
          `;
                orders = rawOrders.map((order) => ({
                    ...order,
                    items: order.items || []
                }));
            }
            else {
                throw prismaError;
            }
        }
        // Fetch product details for each order item
        for (const order of orders) {
            for (const item of order.items) {
                if (item.productId) {
                    const product = await prisma_1.prisma.product.findUnique({
                        where: { id: item.productId },
                        select: { id: true, name: true, images: true, slug: true, category: true }
                    });
                    item.product = product;
                }
            }
        }
        // Helper function to format order status
        const getStatusText = (status) => {
            const statusMap = {
                "PENDING": "Processing",
                "PAID": "Order Confirmed",
                "PREPARING_TO_SHIP": "Preparing to Ship",
                "READY_TO_SHIP": "Ready to Ship",
                "FULFILLED": "Shipped",
                "CANCELLED": "Cancelled",
                "REFUNDED": "Refunded"
            };
            return statusMap[status] || status;
        };
        // Calculate total with tax (10% tax rate)
        const TAX_RATE = 0.1;
        const formattedOrders = orders.map(order => ({
            ...order,
            status: order.status,
            statusText: getStatusText(order.status),
            totalWithTax: Number(order.total) * (1 + TAX_RATE),
            taxAmount: Number(order.total) * TAX_RATE
        }));
        console.log(`Orders list fetched successfully: ${formattedOrders.length} orders for customer: ${trimmedCustomerId}`);
        res.json({
            orders: formattedOrders,
            total: formattedOrders.length,
            customerId: trimmedCustomerId
        });
    }
    catch (error) {
        console.error("Error fetching orders list:", error);
        res.status(500).json({
            message: "Failed to fetch orders list",
            error: error.message,
            customerId: trimmedCustomerId || req.body?.customerId || "unknown"
        });
    }
});
// POST endpoint to get order details - Customer only
exports.customerAgentRouter.post("/order-details", auth_1.tryRefreshToken, auth_1.authenticate, (0, auth_1.requireRole)("CUSTOMER"), async (req, res) => {
    let trimmedCustomerId;
    try {
        // Extract customerId from request body (only field allowed)
        const { customerId: bodyCustomerId, ...rest } = req.body;
        // Check if any extra fields were provided
        if (Object.keys(rest).length > 0) {
            return res.status(400).json({
                message: "Request body should only contain 'customerId' field",
                received: Object.keys(req.body),
                allowedFields: ["customerId"],
                extraFields: Object.keys(rest)
            });
        }
        console.log("Order details request received:", {
            customerIdFromBody: bodyCustomerId,
            customerIdFromToken: req.user?.id
        });
        // Validate request body
        if (!req.body || typeof req.body !== 'object') {
            return res.status(400).json({
                message: "Invalid request body. Expected JSON object with 'customerId' field"
            });
        }
        // customerId is REQUIRED in request body
        if (!bodyCustomerId) {
            return res.status(400).json({
                message: "Customer ID is required in request body",
                received: req.body,
                requiredFields: ["customerId"]
            });
        }
        const customerId = bodyCustomerId;
        // Validate customerId format
        if (typeof customerId !== 'string' || customerId.trim() === '') {
            return res.status(400).json({
                message: "Customer ID must be a non-empty string",
                received: { customerId, customerIdType: typeof customerId }
            });
        }
        trimmedCustomerId = String(customerId).trim();
        // Verify customer
        const verification = await verifyCustomer(trimmedCustomerId, req.user?.id);
        if (verification.error) {
            return res.status(verification.error.status).json(verification.error);
        }
        console.log(`Customer verified: ${trimmedCustomerId} (${verification.customer.email})`);
        // Fetch all orders for the customer with full details
        let orders;
        try {
            orders = await prisma_1.prisma.order.findMany({
                where: {
                    userId: trimmedCustomerId
                },
                include: {
                    items: true
                },
                orderBy: { createdAt: "desc" }
            });
        }
        catch (prismaError) {
            // If Prisma client doesn't recognize new enum values, use raw SQL
            if (prismaError.message?.includes("not found in enum") || prismaError.code === "P2003") {
                console.warn("Prisma client out of sync with database enum. Using raw SQL fallback.");
                const rawOrders = await prisma_1.prisma.$queryRaw `
            SELECT o.*, 
                   json_agg(
                     json_build_object(
                       'id', oi.id,
                       'orderId', oi."orderId",
                       'productId', oi."productId",
                       'variantId', oi."variantId",
                       'name', oi.name,
                       'quantity', oi.quantity,
                       'price', oi.price,
                       'sku', oi.sku
                     )
                   ) FILTER (WHERE oi.id IS NOT NULL) as items
            FROM "Order" o
            LEFT JOIN "OrderItem" oi ON oi."orderId" = o.id
            WHERE o."userId" = ${trimmedCustomerId}
            GROUP BY o.id
            ORDER BY o."createdAt" DESC
          `;
                orders = rawOrders.map((order) => ({
                    ...order,
                    items: order.items || []
                }));
            }
            else {
                throw prismaError;
            }
        }
        // Fetch product details for each order item
        for (const order of orders) {
            for (const item of order.items) {
                if (item.productId) {
                    const product = await prisma_1.prisma.product.findUnique({
                        where: { id: item.productId },
                        select: {
                            id: true,
                            name: true,
                            images: true,
                            slug: true,
                            category: true,
                            description: true,
                            price: true,
                            currency: true
                        }
                    });
                    item.product = product;
                }
            }
        }
        // Helper function to format order status
        const getStatusText = (status) => {
            const statusMap = {
                "PENDING": "Processing",
                "PAID": "Order Confirmed",
                "PREPARING_TO_SHIP": "Preparing to Ship",
                "READY_TO_SHIP": "Ready to Ship",
                "FULFILLED": "Shipped",
                "CANCELLED": "Cancelled",
                "REFUNDED": "Refunded"
            };
            return statusMap[status] || status;
        };
        // Calculate total with tax (10% tax rate) for each order
        const TAX_RATE = 0.1;
        const formattedOrders = orders.map(order => ({
            ...order,
            status: order.status,
            statusText: getStatusText(order.status),
            totalWithTax: Number(order.total) * (1 + TAX_RATE),
            taxAmount: Number(order.total) * TAX_RATE,
            subtotal: Number(order.total)
        }));
        console.log(`Order details fetched successfully: ${formattedOrders.length} orders for customer: ${trimmedCustomerId}`);
        res.json({
            orders: formattedOrders,
            total: formattedOrders.length,
            customerId: trimmedCustomerId
        });
    }
    catch (error) {
        console.error("Error fetching order details:", error);
        res.status(500).json({
            message: "Failed to fetch order details",
            error: error.message,
            customerId: trimmedCustomerId || req.body?.customerId || "unknown"
        });
    }
});
// Helper function to get or create cart
async function getOrCreateCart(userId, cartId) {
    if (userId) {
        const existing = await prisma_1.prisma.cart.findFirst({ where: { userId } });
        if (existing)
            return existing;
        return prisma_1.prisma.cart.create({ data: { userId } });
    }
    if (cartId) {
        const existing = await prisma_1.prisma.cart.findUnique({ where: { id: cartId } });
        if (existing)
            return existing;
    }
    return prisma_1.prisma.cart.create({ data: {} });
}
// POST endpoint to buy it again - add all items from a previous order to cart
exports.customerAgentRouter.post("/buy-it-again", auth_1.tryRefreshToken, auth_1.authenticate, (0, auth_1.requireRole)("CUSTOMER"), async (req, res) => {
    let trimmedCustomerId;
    try {
        // Extract customerId, orderId, or productName from request body
        // Note: refreshToken may be added by fetchWithAuth, but we ignore it as it's handled by middleware
        const { customerId: bodyCustomerId, orderId, productName, refreshToken, ...rest } = req.body;
        // Check if any extra fields were provided (excluding refreshToken which is handled by middleware)
        const allowedFields = ["customerId", "orderId", "productName", "refreshToken"];
        const receivedFields = Object.keys(req.body);
        const extraFields = receivedFields.filter(field => !allowedFields.includes(field));
        if (extraFields.length > 0) {
            return res.status(400).json({
                message: "Request body should only contain 'customerId' and either 'orderId' OR 'productName' fields",
                received: receivedFields,
                allowedFields: ["customerId", "orderId", "productName"],
                extraFields: extraFields
            });
        }
        console.log("Buy it again request received:", {
            customerIdFromBody: bodyCustomerId,
            orderId: orderId,
            productName: productName,
            customerIdFromToken: req.user?.id
        });
        // Validate request body
        if (!req.body || typeof req.body !== 'object') {
            return res.status(400).json({
                message: "Invalid request body. Expected JSON object with 'customerId' and either 'orderId' or 'productName' fields"
            });
        }
        // customerId is REQUIRED in request body
        if (!bodyCustomerId) {
            return res.status(400).json({
                message: "Customer ID is required in request body",
                received: req.body,
                requiredFields: ["customerId", "orderId or productName"]
            });
        }
        // Either orderId OR productName is REQUIRED in request body
        if (!orderId && !productName) {
            return res.status(400).json({
                message: "Either 'orderId' or 'productName' is required in request body",
                received: req.body,
                requiredFields: ["customerId", "orderId or productName"]
            });
        }
        // Cannot provide both orderId and productName
        if (orderId && productName) {
            return res.status(400).json({
                message: "Please provide either 'orderId' OR 'productName', not both",
                received: req.body
            });
        }
        const customerId = bodyCustomerId;
        // Validate customerId format
        if (typeof customerId !== 'string' || customerId.trim() === '') {
            return res.status(400).json({
                message: "Customer ID must be a non-empty string",
                received: { customerId, customerIdType: typeof customerId }
            });
        }
        trimmedCustomerId = String(customerId).trim();
        let trimmedOrderId;
        // If productName is provided, find the most recent order containing that product
        if (productName) {
            if (typeof productName !== 'string' || productName.trim() === '') {
                return res.status(400).json({
                    message: "Product name must be a non-empty string",
                    received: { productName, productNameType: typeof productName }
                });
            }
            const trimmedProductName = String(productName).trim();
            // Find the most recent order that contains a product with this name
            try {
                const ordersWithProduct = await prisma_1.prisma.order.findMany({
                    where: {
                        userId: trimmedCustomerId,
                        items: {
                            some: {
                                name: {
                                    contains: trimmedProductName,
                                    mode: "insensitive"
                                }
                            }
                        }
                    },
                    include: {
                        items: true
                    },
                    orderBy: {
                        createdAt: "desc"
                    },
                    take: 1
                });
                if (ordersWithProduct.length === 0) {
                    return res.status(404).json({
                        message: "No order found containing a product with that name",
                        productName: trimmedProductName,
                        customerId: trimmedCustomerId,
                        note: "Make sure the product name matches an item in one of your previous orders"
                    });
                }
                trimmedOrderId = ordersWithProduct[0].id;
                console.log(`Found order ${trimmedOrderId} for product name "${trimmedProductName}"`);
            }
            catch (prismaError) {
                // If Prisma client doesn't recognize new enum values, use raw SQL
                if (prismaError.message?.includes("not found in enum") || prismaError.code === "P2003") {
                    console.warn("Prisma client out of sync with database enum. Using raw SQL fallback.");
                    const rawOrders = await prisma_1.prisma.$queryRaw `
              SELECT DISTINCT o.*
              FROM "Order" o
              INNER JOIN "OrderItem" oi ON oi."orderId" = o.id
              WHERE o."userId" = ${trimmedCustomerId}
                AND LOWER(oi.name) LIKE LOWER(${'%' + trimmedProductName + '%'})
              ORDER BY o."createdAt" DESC
              LIMIT 1
            `;
                    if (rawOrders.length === 0) {
                        return res.status(404).json({
                            message: "No order found containing a product with that name",
                            productName: trimmedProductName,
                            customerId: trimmedCustomerId,
                            note: "Make sure the product name matches an item in one of your previous orders"
                        });
                    }
                    trimmedOrderId = rawOrders[0].id;
                    console.log(`Found order ${trimmedOrderId} for product name "${trimmedProductName}"`);
                }
                else {
                    throw prismaError;
                }
            }
        }
        else {
            // Validate orderId format
            if (typeof orderId !== 'string' || orderId.trim() === '') {
                return res.status(400).json({
                    message: "Order ID must be a non-empty string",
                    received: { orderId, orderIdType: typeof orderId }
                });
            }
            trimmedOrderId = String(orderId).trim();
        }
        // Verify customer
        const verification = await verifyCustomer(trimmedCustomerId, req.user?.id);
        if (verification.error) {
            return res.status(verification.error.status).json(verification.error);
        }
        console.log(`Customer verified: ${trimmedCustomerId} (${verification.customer.email})`);
        // Fetch the order and verify it belongs to the customer
        let order;
        try {
            order = await prisma_1.prisma.order.findFirst({
                where: {
                    id: trimmedOrderId,
                    userId: trimmedCustomerId
                },
                include: {
                    items: true
                }
            });
        }
        catch (prismaError) {
            // If Prisma client doesn't recognize new enum values, use raw SQL
            if (prismaError.message?.includes("not found in enum") || prismaError.code === "P2003") {
                console.warn("Prisma client out of sync with database enum. Using raw SQL fallback.");
                const rawOrders = await prisma_1.prisma.$queryRaw `
            SELECT o.*, 
                   json_agg(
                     json_build_object(
                       'id', oi.id,
                       'orderId', oi."orderId",
                       'productId', oi."productId",
                       'variantId', oi."variantId",
                       'name', oi.name,
                       'quantity', oi.quantity,
                       'price', oi.price,
                       'sku', oi.sku
                     )
                   ) FILTER (WHERE oi.id IS NOT NULL) as items
            FROM "Order" o
            LEFT JOIN "OrderItem" oi ON oi."orderId" = o.id
            WHERE o.id = ${trimmedOrderId} AND o."userId" = ${trimmedCustomerId}
            GROUP BY o.id
          `;
                if (rawOrders.length === 0) {
                    order = null;
                }
                else {
                    order = {
                        ...rawOrders[0],
                        items: rawOrders[0].items || []
                    };
                }
            }
            else {
                throw prismaError;
            }
        }
        if (!order) {
            return res.status(404).json({
                message: "Order not found",
                orderId: trimmedOrderId,
                customerId: trimmedCustomerId,
                note: "Make sure the order belongs to the specified customer"
            });
        }
        if (!order.items || order.items.length === 0) {
            return res.status(400).json({
                message: "Order has no items to add to cart",
                orderId: trimmedOrderId
            });
        }
        // Get or create customer's cart
        const cart = await getOrCreateCart(trimmedCustomerId);
        // Import inventory service
        const { reserveInventory } = await Promise.resolve().then(() => __importStar(require("../services/inventoryService")));
        // Add items to cart with inventory checks
        const addedItems = [];
        const skippedItems = [];
        const errors = [];
        for (const orderItem of order.items) {
            try {
                // Check if product still exists
                const product = await prisma_1.prisma.product.findUnique({
                    where: { id: orderItem.productId },
                    select: { id: true, status: true }
                });
                if (!product || product.status !== "ACTIVE") {
                    skippedItems.push({
                        productId: orderItem.productId,
                        name: orderItem.name,
                        reason: "Product no longer available"
                    });
                    continue;
                }
                // Check if variant still exists (if applicable)
                if (orderItem.variantId) {
                    const variant = await prisma_1.prisma.productVariant.findUnique({
                        where: { id: orderItem.variantId },
                        select: { id: true, productId: true }
                    });
                    if (!variant || variant.productId !== orderItem.productId) {
                        skippedItems.push({
                            productId: orderItem.productId,
                            variantId: orderItem.variantId,
                            name: orderItem.name,
                            reason: "Variant no longer available"
                        });
                        continue;
                    }
                }
                // Check inventory availability
                const column = orderItem.variantId ? "variantId" : "productId";
                const inventoryRows = await prisma_1.prisma.$queryRaw(client_1.Prisma.sql `
              SELECT * FROM "Inventory"
              WHERE ${client_1.Prisma.raw(`"${column}"`)} = ${orderItem.variantId ?? orderItem.productId}
              LIMIT 1
            `);
                const inventory = inventoryRows[0];
                if (!inventory) {
                    skippedItems.push({
                        productId: orderItem.productId,
                        variantId: orderItem.variantId,
                        name: orderItem.name,
                        reason: "Inventory not found"
                    });
                    continue;
                }
                const availableStock = inventory.quantityOnHand - inventory.quantityReserved;
                if (availableStock < orderItem.quantity) {
                    skippedItems.push({
                        productId: orderItem.productId,
                        variantId: orderItem.variantId,
                        name: orderItem.name,
                        requestedQuantity: orderItem.quantity,
                        availableStock: availableStock,
                        reason: `Insufficient stock. Only ${availableStock} available`
                    });
                    continue;
                }
                // Add item to cart with inventory reservation
                await prisma_1.prisma.$transaction(async (tx) => {
                    // Lock inventory row
                    const lockedInventory = await tx.$queryRaw(client_1.Prisma.sql `
                SELECT * FROM "Inventory"
                WHERE ${client_1.Prisma.raw(`"${column}"`)} = ${orderItem.variantId ?? orderItem.productId}
                LIMIT 1
                FOR UPDATE
              `);
                    if (!lockedInventory[0]) {
                        throw new Error("Inventory not found");
                    }
                    const inv = lockedInventory[0];
                    const adjustment = reserveInventory(inv, orderItem.quantity);
                    await tx.inventory.update({
                        where: { id: inv.id },
                        data: { quantityReserved: adjustment.quantityReserved }
                    });
                    await tx.inventoryMovement.create({
                        data: {
                            inventoryId: inv.id,
                            type: "RESERVE",
                            quantity: orderItem.quantity,
                            reference: `cart:${cart.id}`,
                            createdBy: trimmedCustomerId
                        }
                    });
                    // Check if item already exists in cart
                    const existingItem = await tx.cartItem.findFirst({
                        where: {
                            cartId: cart.id,
                            productId: orderItem.productId,
                            variantId: orderItem.variantId || null
                        }
                    });
                    if (existingItem) {
                        // Update quantity
                        await tx.cartItem.update({
                            where: { id: existingItem.id },
                            data: { quantity: existingItem.quantity + orderItem.quantity }
                        });
                        addedItems.push({
                            ...existingItem,
                            quantity: existingItem.quantity + orderItem.quantity,
                            action: "updated"
                        });
                    }
                    else {
                        // Create new cart item
                        const newItem = await tx.cartItem.create({
                            data: {
                                cartId: cart.id,
                                productId: orderItem.productId,
                                variantId: orderItem.variantId || null,
                                quantity: orderItem.quantity
                            }
                        });
                        addedItems.push({
                            ...newItem,
                            action: "added"
                        });
                    }
                });
            }
            catch (error) {
                console.error(`Error adding item ${orderItem.id} to cart:`, error);
                errors.push({
                    productId: orderItem.productId,
                    variantId: orderItem.variantId,
                    name: orderItem.name,
                    error: error.message
                });
            }
        }
        console.log(`Buy it again completed: ${addedItems.length} items added, ${skippedItems.length} skipped, ${errors.length} errors`);
        res.json({
            success: true,
            cartId: cart.id,
            addedItems: addedItems.length,
            skippedItems: skippedItems.length,
            errors: errors.length,
            details: {
                added: addedItems,
                skipped: skippedItems,
                errors: errors
            },
            customerId: trimmedCustomerId,
            orderId: trimmedOrderId
        });
    }
    catch (error) {
        console.error("Error in buy it again:", error);
        res.status(500).json({
            message: "Failed to add items to cart",
            error: error.message,
            customerId: trimmedCustomerId || req.body?.customerId || "unknown",
            orderId: req.body?.orderId || "unknown"
        });
    }
});
// POST endpoint to create an order - Customer only
exports.customerAgentRouter.post("/create-order", auth_1.tryRefreshToken, auth_1.authenticate, (0, auth_1.requireRole)("CUSTOMER"), async (req, res) => {
    let trimmedCustomerId;
    try {
        // Extract customerId and items from request body
        const { customerId: bodyCustomerId, items, refreshToken, ...rest } = req.body;
        // Note: items array can contain productId OR productName (with optional category)
        // So we don't validate the structure of items array here, just that it exists
        // Check if any extra fields were provided (excluding refreshToken)
        const allowedFields = ["customerId", "items", "refreshToken"];
        const receivedFields = Object.keys(req.body);
        const extraFields = receivedFields.filter(field => !allowedFields.includes(field));
        if (extraFields.length > 0) {
            return res.status(400).json({
                message: "Request body should only contain 'customerId' and 'items' fields",
                received: receivedFields,
                allowedFields: ["customerId", "items"],
                extraFields: extraFields,
                note: "Each item in 'items' array can have either 'productId' OR 'productName' (with optional 'category')"
            });
        }
        console.log("Create order request received:", {
            customerIdFromBody: bodyCustomerId,
            itemsCount: items?.length,
            customerIdFromToken: req.user?.id
        });
        // Validate request body
        if (!req.body || typeof req.body !== 'object') {
            return res.status(400).json({
                message: "Invalid request body. Expected JSON object with 'customerId' and 'items' fields"
            });
        }
        // customerId is REQUIRED
        if (!bodyCustomerId) {
            return res.status(400).json({
                message: "Customer ID is required in request body",
                received: req.body,
                requiredFields: ["customerId", "items"]
            });
        }
        // items is REQUIRED
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                message: "Items array is required and must not be empty",
                received: req.body
            });
        }
        const customerId = bodyCustomerId;
        // Validate customerId format
        if (typeof customerId !== 'string' || customerId.trim() === '') {
            return res.status(400).json({
                message: "Customer ID must be a non-empty string",
                received: { customerId, customerIdType: typeof customerId }
            });
        }
        trimmedCustomerId = String(customerId).trim();
        // Verify customer
        const verification = await verifyCustomer(trimmedCustomerId, req.user?.id);
        if (verification.error) {
            return res.status(verification.error.status).json(verification.error);
        }
        console.log(`Customer verified: ${trimmedCustomerId} (${verification.customer.email})`);
        // Validate items structure
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            // Either productId OR productName is required
            if (!item.productId && !item.productName) {
                return res.status(400).json({
                    message: `Item at index ${i} must have either 'productId' or 'productName'`,
                    item: item
                });
            }
            // Cannot provide both
            if (item.productId && item.productName) {
                return res.status(400).json({
                    message: `Item at index ${i} cannot have both 'productId' and 'productName'. Please provide only one.`,
                    item: item
                });
            }
            if (!item.quantity || typeof item.quantity !== 'number' || item.quantity <= 0) {
                return res.status(400).json({
                    message: `Item at index ${i} must have a positive 'quantity'`,
                    item: item
                });
            }
        }
        // Create order with inventory checks
        const order = await prisma_1.prisma.$transaction(async (tx) => {
            let total = 0;
            const orderItems = [];
            for (const item of items) {
                // Get product - either by productId or productName
                let product = null;
                if (item.productId) {
                    // Find by productId
                    product = await tx.product.findUnique({
                        where: { id: item.productId },
                        select: { id: true, name: true, price: true, status: true }
                    });
                    if (!product) {
                        throw new Error(`Product not found: ${item.productId}`);
                    }
                }
                else if (item.productName) {
                    // Find by productName (with optional category)
                    const productWhere = { name: item.productName.trim() };
                    if (item.category) {
                        productWhere.category = item.category.trim();
                    }
                    const matchingProducts = await tx.product.findMany({
                        where: productWhere,
                        select: { id: true, name: true, price: true, status: true, category: true }
                    });
                    if (matchingProducts.length === 0) {
                        throw new Error(`Product not found: ${item.productName}${item.category ? ` (category: ${item.category})` : ''}`);
                    }
                    else if (matchingProducts.length > 1 && !item.category) {
                        throw new Error(`Multiple products found with name "${item.productName}". Please provide a 'category' to be more specific. Matching products: ${matchingProducts.map(p => `${p.name} (${p.category})`).join(', ')}`);
                    }
                    else {
                        product = matchingProducts[0];
                    }
                }
                if (!product) {
                    throw new Error(`Product identification failed. Please provide either 'productId' or 'productName'.`);
                }
                if (product.status !== "ACTIVE") {
                    throw new Error(`Product ${product.name} is not available`);
                }
                // Get variant if provided
                const variant = item.variantId
                    ? await tx.productVariant.findUnique({
                        where: { id: item.variantId },
                        select: { id: true, priceOverride: true, sku: true, productId: true }
                    })
                    : null;
                if (item.variantId && !variant) {
                    throw new Error(`Variant not found: ${item.variantId}`);
                }
                if (variant && variant.productId !== product.id) {
                    throw new Error(`Variant does not belong to product ${product.id}`);
                }
                const price = Number(variant?.priceOverride ?? product.price);
                total += price * item.quantity;
                // Check and consume inventory
                const column = item.variantId ? "variantId" : "productId";
                const inventoryRows = await tx.$queryRaw(client_1.Prisma.sql `
              SELECT * FROM "Inventory"
              WHERE ${client_1.Prisma.raw(`"${column}"`)} = ${item.variantId ?? product.id}
              LIMIT 1
              FOR UPDATE
            `);
                const inventory = inventoryRows[0];
                if (!inventory) {
                    throw new Error(`Inventory not found for ${item.variantId ? 'variant' : 'product'}: ${item.variantId ?? product.id}`);
                }
                const availableStock = inventory.quantityOnHand - inventory.quantityReserved;
                if (availableStock < item.quantity) {
                    throw new Error(`Insufficient stock for ${product.name}. Available: ${availableStock}, Requested: ${item.quantity}`);
                }
                const adjustment = (0, inventoryService_1.consumeInventory)(inventory, item.quantity);
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
                        reference: `order:customer-${trimmedCustomerId}`,
                        createdBy: trimmedCustomerId
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
            // Create order
            const created = await tx.order.create({
                data: {
                    userId: trimmedCustomerId,
                    status: "PAID",
                    total,
                    currency: "USD",
                    items: {
                        create: orderItems
                    }
                },
                include: { items: true }
            });
            console.log(`Order created successfully: ${created.id} for customer ${trimmedCustomerId}`);
            return created;
        });
        // Fetch product details for response
        for (const item of order.items) {
            if (item.productId) {
                const product = await prisma_1.prisma.product.findUnique({
                    where: { id: item.productId },
                    select: { id: true, name: true, images: true, slug: true, category: true }
                });
                item.product = product;
            }
        }
        // Helper function to format order status
        const getStatusText = (status) => {
            const statusMap = {
                "PENDING": "Processing",
                "PAID": "Order Confirmed",
                "PREPARING_TO_SHIP": "Preparing to Ship",
                "READY_TO_SHIP": "Ready to Ship",
                "FULFILLED": "Shipped",
                "CANCELLED": "Cancelled",
                "REFUNDED": "Refunded"
            };
            return statusMap[status] || status;
        };
        const TAX_RATE = 0.1;
        const formattedOrder = {
            ...order,
            status: order.status,
            statusText: getStatusText(order.status),
            totalWithTax: Number(order.total) * (1 + TAX_RATE),
            taxAmount: Number(order.total) * TAX_RATE,
            subtotal: Number(order.total)
        };
        res.status(201).json({
            success: true,
            order: formattedOrder,
            customerId: trimmedCustomerId
        });
    }
    catch (error) {
        console.error("Error creating order:", error);
        res.status(500).json({
            message: "Failed to create order",
            error: error.message,
            customerId: trimmedCustomerId || req.body?.customerId || "unknown"
        });
    }
});
// POST endpoint to cancel an order - Customer only
exports.customerAgentRouter.post("/cancel-order", auth_1.tryRefreshToken, auth_1.authenticate, (0, auth_1.requireRole)("CUSTOMER"), async (req, res) => {
    let trimmedCustomerId;
    try {
        // Extract customerId and orderId from request body
        const { customerId: bodyCustomerId, orderId, refreshToken, ...rest } = req.body;
        // Check if any extra fields were provided (excluding refreshToken)
        const allowedFields = ["customerId", "orderId", "refreshToken"];
        const receivedFields = Object.keys(req.body);
        const extraFields = receivedFields.filter(field => !allowedFields.includes(field));
        if (extraFields.length > 0) {
            return res.status(400).json({
                message: "Request body should only contain 'customerId' and 'orderId' fields",
                received: receivedFields,
                allowedFields: ["customerId", "orderId"],
                extraFields: extraFields
            });
        }
        console.log("Cancel order request received:", {
            customerIdFromBody: bodyCustomerId,
            orderId: orderId,
            customerIdFromToken: req.user?.id
        });
        // Validate request body
        if (!req.body || typeof req.body !== 'object') {
            return res.status(400).json({
                message: "Invalid request body. Expected JSON object with 'customerId' and 'orderId' fields"
            });
        }
        // customerId is REQUIRED
        if (!bodyCustomerId) {
            return res.status(400).json({
                message: "Customer ID is required in request body",
                received: req.body,
                requiredFields: ["customerId", "orderId"]
            });
        }
        // orderId is REQUIRED
        if (!orderId) {
            return res.status(400).json({
                message: "Order ID is required in request body",
                received: req.body,
                requiredFields: ["customerId", "orderId"]
            });
        }
        const customerId = bodyCustomerId;
        // Validate customerId format
        if (typeof customerId !== 'string' || customerId.trim() === '') {
            return res.status(400).json({
                message: "Customer ID must be a non-empty string",
                received: { customerId, customerIdType: typeof customerId }
            });
        }
        // Validate orderId format
        if (typeof orderId !== 'string' || orderId.trim() === '') {
            return res.status(400).json({
                message: "Order ID must be a non-empty string",
                received: { orderId, orderIdType: typeof orderId }
            });
        }
        trimmedCustomerId = String(customerId).trim();
        const trimmedOrderId = String(orderId).trim();
        // Verify customer
        const verification = await verifyCustomer(trimmedCustomerId, req.user?.id);
        if (verification.error) {
            return res.status(verification.error.status).json(verification.error);
        }
        console.log(`Customer verified: ${trimmedCustomerId} (${verification.customer.email})`);
        // Fetch the order and verify it belongs to the customer
        let order = null;
        try {
            order = await prisma_1.prisma.order.findFirst({
                where: {
                    id: trimmedOrderId,
                    userId: trimmedCustomerId
                },
                include: { items: true }
            });
        }
        catch (prismaError) {
            if (prismaError.message?.includes("not found in enum") || prismaError.code === "P2003") {
                console.warn("Prisma client out of sync. Using raw SQL fallback.");
                const rawOrders = await prisma_1.prisma.$queryRaw `
            SELECT o.*, 
                   json_agg(
                     json_build_object(
                       'id', oi.id,
                       'orderId', oi."orderId",
                       'productId', oi."productId",
                       'variantId', oi."variantId",
                       'name', oi.name,
                       'quantity', oi.quantity,
                       'price', oi.price,
                       'sku', oi.sku
                     )
                   ) FILTER (WHERE oi.id IS NOT NULL) as items
            FROM "Order" o
            LEFT JOIN "OrderItem" oi ON oi."orderId" = o.id
            WHERE o.id = ${trimmedOrderId} AND o."userId" = ${trimmedCustomerId}
            GROUP BY o.id
          `;
                if (rawOrders.length === 0) {
                    order = null;
                }
                else {
                    order = {
                        ...rawOrders[0],
                        items: rawOrders[0].items || []
                    };
                }
            }
            else {
                throw prismaError;
            }
        }
        if (!order) {
            return res.status(404).json({
                message: "Order not found",
                orderId: trimmedOrderId,
                customerId: trimmedCustomerId,
                note: "Make sure the order belongs to the specified customer"
            });
        }
        // Check if order can be cancelled
        const cancellableStatuses = ["PENDING", "PAID", "PREPARING_TO_SHIP"];
        if (!cancellableStatuses.includes(order.status)) {
            return res.status(400).json({
                message: `Order cannot be cancelled. Current status: ${order.status}`,
                orderId: trimmedOrderId,
                currentStatus: order.status,
                cancellableStatuses: cancellableStatuses
            });
        }
        // Cancel order and restore inventory
        const cancelledOrder = await prisma_1.prisma.$transaction(async (tx) => {
            // Restore inventory for each item
            for (const item of order.items) {
                const inventory = await tx.inventory.findFirst({
                    where: {
                        productId: item.variantId ? undefined : item.productId,
                        variantId: item.variantId ?? undefined
                    }
                });
                if (inventory) {
                    const adjustment = (0, inventoryService_1.adjustInventory)(inventory, item.quantity);
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
                            type: "IN",
                            quantity: item.quantity,
                            reference: `order:${order.id}:cancelled`,
                            createdBy: trimmedCustomerId
                        }
                    });
                }
            }
            // Update order status
            try {
                const updated = await tx.order.update({
                    where: { id: order.id },
                    data: { status: "CANCELLED" }
                });
                return updated;
            }
            catch (prismaError) {
                // If Prisma enum error, use raw SQL
                if (prismaError.code === 'P2003' ||
                    prismaError.name === 'PrismaClientValidationError' ||
                    prismaError.message?.includes('Invalid value')) {
                    await tx.$executeRaw `
              UPDATE "Order" 
              SET status = 'CANCELLED'::"OrderStatus"
              WHERE id = ${order.id}
            `;
                    return await tx.order.findUnique({ where: { id: order.id } });
                }
                throw prismaError;
            }
        });
        console.log(`Order ${trimmedOrderId} cancelled successfully by customer ${trimmedCustomerId}`);
        res.json({
            success: true,
            message: "Order cancelled successfully",
            order: cancelledOrder,
            customerId: trimmedCustomerId,
            orderId: trimmedOrderId
        });
    }
    catch (error) {
        console.error("Error cancelling order:", error);
        res.status(500).json({
            message: "Failed to cancel order",
            error: error.message,
            customerId: trimmedCustomerId || req.body?.customerId || "unknown",
            orderId: req.body?.orderId || "unknown"
        });
    }
});
// POST endpoint to get customer profile - Customer only
exports.customerAgentRouter.post("/profile", auth_1.tryRefreshToken, auth_1.authenticate, (0, auth_1.requireRole)("CUSTOMER"), async (req, res) => {
    let trimmedCustomerId;
    try {
        // Extract customerId from request body (only field allowed)
        const { customerId: bodyCustomerId, ...rest } = req.body;
        // Check if any extra fields were provided
        if (Object.keys(rest).length > 0) {
            return res.status(400).json({
                message: "Request body should only contain 'customerId' field",
                received: Object.keys(req.body),
                allowedFields: ["customerId"],
                extraFields: Object.keys(rest)
            });
        }
        // Validate request body
        if (!req.body || typeof req.body !== 'object') {
            return res.status(400).json({
                message: "Invalid request body. Expected JSON object with 'customerId' field"
            });
        }
        // customerId is REQUIRED in request body
        if (!bodyCustomerId) {
            return res.status(400).json({
                message: "Customer ID is required in request body",
                received: req.body,
                requiredFields: ["customerId"]
            });
        }
        const customerId = bodyCustomerId;
        // Validate customerId format - must be a non-empty string
        if (typeof customerId !== 'string' || customerId.trim() === '') {
            return res.status(400).json({
                message: "Customer ID must be a non-empty string",
                received: { customerId, customerIdType: typeof customerId }
            });
        }
        trimmedCustomerId = String(customerId).trim();
        // Security check: customerId in body must match the authenticated user's ID
        if (req.user && trimmedCustomerId !== req.user.id) {
            return res.status(403).json({
                message: "Customer ID in request body must match the authenticated user's ID",
                providedCustomerId: trimmedCustomerId,
                authenticatedUserId: req.user.id
            });
        }
        // Fetch customer profile
        const customer = await prisma_1.prisma.user.findUnique({
            where: { id: trimmedCustomerId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
                updatedAt: true
            }
        });
        if (!customer) {
            return res.status(404).json({
                message: "Customer not found",
                customerId: trimmedCustomerId
            });
        }
        if (customer.role !== "CUSTOMER") {
            return res.status(403).json({
                message: "User is not a customer",
                customerId: trimmedCustomerId,
                role: customer.role
            });
        }
        console.log(`Customer profile fetched successfully: ${trimmedCustomerId}`);
        res.json({
            success: true,
            profile: customer,
            customerId: trimmedCustomerId
        });
    }
    catch (error) {
        console.error("Error fetching customer profile:", error);
        res.status(500).json({
            message: "Failed to fetch customer profile",
            error: error.message,
            customerId: trimmedCustomerId || req.body?.customerId || "unknown"
        });
    }
});
// POST endpoint to update customer profile - Customer only
exports.customerAgentRouter.post("/profile/update", auth_1.tryRefreshToken, auth_1.authenticate, (0, auth_1.requireRole)("CUSTOMER"), async (req, res) => {
    let trimmedCustomerId;
    try {
        // Extract customerId and update fields from request body
        const { customerId: bodyCustomerId, name, email, ...rest } = req.body;
        // Validate request body
        if (!req.body || typeof req.body !== 'object') {
            return res.status(400).json({
                message: "Invalid request body. Expected JSON object with 'customerId' and optional 'name' or 'email' fields"
            });
        }
        // customerId is REQUIRED in request body
        if (!bodyCustomerId) {
            return res.status(400).json({
                message: "Customer ID is required in request body",
                received: req.body,
                requiredFields: ["customerId"]
            });
        }
        const customerId = bodyCustomerId;
        // Validate customerId format - must be a non-empty string
        if (typeof customerId !== 'string' || customerId.trim() === '') {
            return res.status(400).json({
                message: "Customer ID must be a non-empty string",
                received: { customerId, customerIdType: typeof customerId }
            });
        }
        trimmedCustomerId = String(customerId).trim();
        // Security check: customerId in body must match the authenticated user's ID
        if (req.user && trimmedCustomerId !== req.user.id) {
            return res.status(403).json({
                message: "Customer ID in request body must match the authenticated user's ID",
                providedCustomerId: trimmedCustomerId,
                authenticatedUserId: req.user.id
            });
        }
        // Check if at least one field to update is provided
        if (!name && !email) {
            return res.status(400).json({
                message: "At least one field ('name' or 'email') must be provided for update",
                received: req.body,
                allowedFields: ["customerId", "name", "email"]
            });
        }
        // Validate name if provided
        if (name !== undefined) {
            if (typeof name !== 'string' || name.trim() === '') {
                return res.status(400).json({
                    message: "Name must be a non-empty string",
                    received: { name, nameType: typeof name }
                });
            }
            if (name.trim().length < 2) {
                return res.status(400).json({
                    message: "Name must be at least 2 characters long",
                    received: { name: name.trim() }
                });
            }
        }
        // Validate email if provided
        if (email !== undefined) {
            if (typeof email !== 'string' || email.trim() === '') {
                return res.status(400).json({
                    message: "Email must be a non-empty string",
                    received: { email, emailType: typeof email }
                });
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email.trim())) {
                return res.status(400).json({
                    message: "Email must be a valid email address",
                    received: { email: email.trim() }
                });
            }
        }
        // Verify customer exists and is a customer
        const existingCustomer = await prisma_1.prisma.user.findUnique({
            where: { id: trimmedCustomerId },
            select: { id: true, role: true, email: true }
        });
        if (!existingCustomer) {
            return res.status(404).json({
                message: "Customer not found",
                customerId: trimmedCustomerId
            });
        }
        if (existingCustomer.role !== "CUSTOMER") {
            return res.status(403).json({
                message: "User is not a customer",
                customerId: trimmedCustomerId,
                role: existingCustomer.role
            });
        }
        // Check if email is already in use by another user
        if (email && email.trim() !== existingCustomer.email) {
            const emailInUse = await prisma_1.prisma.user.findUnique({
                where: { email: email.trim() }
            });
            if (emailInUse) {
                return res.status(409).json({
                    message: "Email is already in use by another account",
                    email: email.trim()
                });
            }
        }
        // Build update data
        const updateData = {};
        if (name !== undefined) {
            updateData.name = name.trim();
        }
        if (email !== undefined) {
            updateData.email = email.trim();
        }
        // Update customer profile
        const updatedCustomer = await prisma_1.prisma.user.update({
            where: { id: trimmedCustomerId },
            data: updateData,
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
                updatedAt: true
            }
        });
        console.log(`Customer profile updated successfully: ${trimmedCustomerId}`);
        res.json({
            success: true,
            message: "Profile updated successfully",
            profile: updatedCustomer,
            customerId: trimmedCustomerId
        });
    }
    catch (error) {
        console.error("Error updating customer profile:", error);
        // Handle Prisma unique constraint error
        if (error.code === 'P2002') {
            return res.status(409).json({
                message: "Email is already in use by another account",
                error: error.message,
                customerId: trimmedCustomerId || req.body?.customerId || "unknown"
            });
        }
        res.status(500).json({
            message: "Failed to update customer profile",
            error: error.message,
            customerId: trimmedCustomerId || req.body?.customerId || "unknown"
        });
    }
});
// POST endpoint to update customer password - Customer only
exports.customerAgentRouter.post("/profile/password", auth_1.tryRefreshToken, auth_1.authenticate, (0, auth_1.requireRole)("CUSTOMER"), async (req, res) => {
    let trimmedCustomerId;
    try {
        // Extract customerId and password fields from request body
        const { customerId: bodyCustomerId, currentPassword, newPassword, ...rest } = req.body;
        // Check if any extra fields were provided
        if (Object.keys(rest).length > 0) {
            return res.status(400).json({
                message: "Request body should only contain 'customerId', 'currentPassword', and 'newPassword' fields",
                received: Object.keys(req.body),
                allowedFields: ["customerId", "currentPassword", "newPassword"],
                extraFields: Object.keys(rest)
            });
        }
        // Validate request body
        if (!req.body || typeof req.body !== 'object') {
            return res.status(400).json({
                message: "Invalid request body. Expected JSON object with 'customerId', 'currentPassword', and 'newPassword' fields"
            });
        }
        // customerId is REQUIRED in request body
        if (!bodyCustomerId) {
            return res.status(400).json({
                message: "Customer ID is required in request body",
                received: req.body,
                requiredFields: ["customerId"]
            });
        }
        // currentPassword is REQUIRED
        if (!currentPassword) {
            return res.status(400).json({
                message: "Current password is required",
                received: req.body,
                requiredFields: ["customerId", "currentPassword", "newPassword"]
            });
        }
        // newPassword is REQUIRED
        if (!newPassword) {
            return res.status(400).json({
                message: "New password is required",
                received: req.body,
                requiredFields: ["customerId", "currentPassword", "newPassword"]
            });
        }
        const customerId = bodyCustomerId;
        // Validate customerId format - must be a non-empty string
        if (typeof customerId !== 'string' || customerId.trim() === '') {
            return res.status(400).json({
                message: "Customer ID must be a non-empty string",
                received: { customerId, customerIdType: typeof customerId }
            });
        }
        // Validate passwords are strings
        if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
            return res.status(400).json({
                message: "Passwords must be strings",
                received: {
                    currentPasswordType: typeof currentPassword,
                    newPasswordType: typeof newPassword
                }
            });
        }
        // Validate new password length
        if (newPassword.length < 8) {
            return res.status(400).json({
                message: "New password must be at least 8 characters long",
                received: { newPasswordLength: newPassword.length }
            });
        }
        trimmedCustomerId = String(customerId).trim();
        // Security check: customerId in body must match the authenticated user's ID
        if (req.user && trimmedCustomerId !== req.user.id) {
            return res.status(403).json({
                message: "Customer ID in request body must match the authenticated user's ID",
                providedCustomerId: trimmedCustomerId,
                authenticatedUserId: req.user.id
            });
        }
        // Verify customer exists and is a customer
        const customer = await prisma_1.prisma.user.findUnique({
            where: { id: trimmedCustomerId },
            select: { id: true, role: true, passwordHash: true }
        });
        if (!customer) {
            return res.status(404).json({
                message: "Customer not found",
                customerId: trimmedCustomerId
            });
        }
        if (customer.role !== "CUSTOMER") {
            return res.status(403).json({
                message: "User is not a customer",
                customerId: trimmedCustomerId,
                role: customer.role
            });
        }
        // Verify current password
        const isCurrentPasswordValid = await bcryptjs_1.default.compare(currentPassword, customer.passwordHash);
        if (!isCurrentPasswordValid) {
            return res.status(401).json({
                message: "Current password is incorrect",
                customerId: trimmedCustomerId
            });
        }
        // Check if new password is different from current password
        const isSamePassword = await bcryptjs_1.default.compare(newPassword, customer.passwordHash);
        if (isSamePassword) {
            return res.status(400).json({
                message: "New password must be different from current password",
                customerId: trimmedCustomerId
            });
        }
        // Hash new password
        const newPasswordHash = await bcryptjs_1.default.hash(newPassword, 10);
        // Update password
        await prisma_1.prisma.user.update({
            where: { id: trimmedCustomerId },
            data: { passwordHash: newPasswordHash }
        });
        console.log(`Customer password updated successfully: ${trimmedCustomerId}`);
        res.json({
            success: true,
            message: "Password updated successfully",
            customerId: trimmedCustomerId
        });
    }
    catch (error) {
        console.error("Error updating customer password:", error);
        res.status(500).json({
            message: "Failed to update password",
            error: error.message,
            customerId: trimmedCustomerId || req.body?.customerId || "unknown"
        });
    }
});
