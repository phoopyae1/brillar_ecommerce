"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminAgentRouter = void 0;
const express_1 = require("express");
const client_1 = require("@prisma/client");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const shared_1 = require("@brillar/shared");
const inventoryService_1 = require("../services/inventoryService");
exports.adminAgentRouter = (0, express_1.Router)();
// POST endpoint to get product details by ID or slug (in request body) - Admin/Agent only
exports.adminAgentRouter.post("/product-details", auth_1.tryRefreshToken, auth_1.authenticate, auth_1.requireAdminOrAgent, async (req, res) => {
    try {
        const { adminId, productId, id, slug } = req.body;
        console.log("Product details request received:", { adminId, productId, id, slug, body: req.body });
        // Validate request body
        if (!req.body || typeof req.body !== 'object') {
            return res.status(400).json({
                message: "Invalid request body. Expected JSON object with 'adminId' field"
            });
        }
        // adminId is REQUIRED (only field needed)
        if (!adminId) {
            return res.status(400).json({
                message: "Admin ID is required",
                received: req.body,
                requiredFields: ["adminId"]
            });
        }
        // Validate adminId format - must be a non-empty string
        if (typeof adminId !== 'string' || adminId.trim() === '') {
            return res.status(400).json({
                message: "Admin ID must be a non-empty string",
                received: { adminId, adminIdType: typeof adminId }
            });
        }
        const trimmedAdminId = String(adminId).trim();
        // Use productId if provided, otherwise fall back to id for backward compatibility
        // If neither is provided, we'll return all products
        const productIdentifier = productId || id;
        // Validate product ID format if provided (optional)
        if (productIdentifier && typeof productIdentifier !== 'string') {
            return res.status(400).json({
                message: "Product ID must be a string",
                received: { productId: productIdentifier, productIdType: typeof productIdentifier }
            });
        }
        // Verify admin exists and is an admin (REQUIRED)
        try {
            const admin = await prisma_1.prisma.user.findUnique({
                where: { id: trimmedAdminId },
                select: { id: true, role: true, email: true }
            });
            if (!admin) {
                return res.status(404).json({
                    message: "Admin not found",
                    adminId: trimmedAdminId
                });
            }
            if (admin.role !== "ADMIN") {
                return res.status(403).json({
                    message: "User is not an admin",
                    adminId: trimmedAdminId,
                    role: admin.role,
                    email: admin.email
                });
            }
            console.log(`Admin verified: ${trimmedAdminId} (${admin.email})`);
        }
        catch (adminError) {
            console.error("Error verifying admin:", adminError);
            return res.status(500).json({
                message: "Failed to verify admin",
                adminId: trimmedAdminId,
                error: adminError.message
            });
        }
        // If no product identifier provided, return all products
        if (!productIdentifier && !slug) {
            console.log(`Fetching all products for admin: ${trimmedAdminId}`);
            const allProducts = await prisma_1.prisma.product.findMany({
                include: {
                    variants: {
                        include: {
                            inventory: true
                        }
                    },
                    inventory: true
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });
            // Calculate inventory summary for each product
            const productsWithInventory = allProducts.map(product => {
                let totalStock = 0;
                let totalReserved = 0;
                let totalAvailable = 0;
                if (product.variants.length > 0) {
                    for (const variant of product.variants) {
                        if (variant.inventory && variant.inventory.length > 0) {
                            const inv = variant.inventory[0];
                            totalStock += inv.quantityOnHand || 0;
                            totalReserved += inv.quantityReserved || 0;
                            totalAvailable += (inv.quantityOnHand || 0) - (inv.quantityReserved || 0);
                        }
                    }
                }
                else {
                    if (product.inventory && product.inventory.length > 0) {
                        const inv = product.inventory[0];
                        totalStock = inv.quantityOnHand || 0;
                        totalReserved = inv.quantityReserved || 0;
                        totalAvailable = totalStock - totalReserved;
                    }
                }
                return {
                    ...product,
                    inventorySummary: {
                        totalStock,
                        totalReserved,
                        totalAvailable,
                        lowStock: totalAvailable < 10
                    }
                };
            });
            return res.json({
                products: productsWithInventory,
                count: productsWithInventory.length,
                adminId: trimmedAdminId
            });
        }
        // Try to find product by ID first, then by slug if ID not provided
        let product;
        let searchMethod = "";
        if (productIdentifier) {
            searchMethod = "productId";
            const trimmedProductId = String(productIdentifier).trim();
            console.log(`Searching for product by ID: "${trimmedProductId}" (adminId: ${trimmedAdminId})`);
            try {
                product = await prisma_1.prisma.product.findUnique({
                    where: { id: trimmedProductId },
                    include: {
                        variants: {
                            include: {
                                inventory: true
                            }
                        },
                        inventory: true
                    }
                });
                if (!product) {
                    console.log(`Product not found by ID: ${trimmedProductId}`);
                }
                else {
                    console.log(`Product found by ID: ${trimmedProductId}`, { productName: product.name });
                }
            }
            catch (dbError) {
                console.error("Database error when searching by product ID:", dbError);
                throw dbError;
            }
        }
        // If not found by ID and slug is provided, try slug
        if (!product && slug) {
            searchMethod = "slug";
            product = await prisma_1.prisma.product.findUnique({
                where: { slug },
                include: {
                    variants: {
                        include: {
                            inventory: true
                        }
                    },
                    inventory: true
                }
            });
            if (!product) {
                console.log(`Product not found by slug: ${slug}`);
            }
            else {
                console.log(`Product found by slug: ${slug}`);
            }
        }
        if (!product) {
            return res.status(404).json({
                message: "Product not found",
                adminId: trimmedAdminId,
                searchedBy: searchMethod,
                value: productIdentifier || slug
            });
        }
        // Calculate inventory summary
        let totalStock = 0;
        let totalReserved = 0;
        let totalAvailable = 0;
        if (product.variants.length > 0) {
            for (const variant of product.variants) {
                if (variant.inventory && variant.inventory.length > 0) {
                    const inv = variant.inventory[0];
                    totalStock += inv.quantityOnHand || 0;
                    totalReserved += inv.quantityReserved || 0;
                    totalAvailable += (inv.quantityOnHand || 0) - (inv.quantityReserved || 0);
                }
            }
        }
        else {
            if (product.inventory && product.inventory.length > 0) {
                const inv = product.inventory[0];
                totalStock = inv.quantityOnHand || 0;
                totalReserved = inv.quantityReserved || 0;
                totalAvailable = totalStock - totalReserved;
            }
        }
        res.json({
            ...product,
            inventorySummary: {
                totalStock,
                totalReserved,
                totalAvailable,
                lowStock: totalAvailable < 10
            }
        });
    }
    catch (error) {
        console.error("Error fetching product details:", error);
        res.status(500).json({
            message: "Failed to fetch product details",
            error: error.message
        });
    }
});
// POST endpoint to create a new product - Admin/Agent only
exports.adminAgentRouter.post("/create-product", auth_1.tryRefreshToken, auth_1.authenticate, auth_1.requireAdminOrAgent, async (req, res) => {
    let trimmedAdminId;
    let productDataRaw;
    try {
        // Extract adminId and stock before validation (they're not in ProductInputSchema)
        // If adminId is not provided in body, use the authenticated user's ID from token
        const { adminId: bodyAdminId, stock, ...rest } = req.body;
        productDataRaw = rest;
        // Use adminId from body if provided, otherwise use authenticated user's ID from token
        const adminId = bodyAdminId || req.user?.id;
        console.log("Create product request received:", {
            adminIdFromBody: bodyAdminId,
            adminIdFromToken: req.user?.id,
            adminIdUsed: adminId,
            productData: { ...productDataRaw, stock }
        });
        // Validate request body
        if (!req.body || typeof req.body !== 'object') {
            return res.status(400).json({
                message: "Invalid request body. Expected JSON object with product fields"
            });
        }
        // adminId is REQUIRED (from body or token)
        if (!adminId) {
            return res.status(400).json({
                message: "Admin ID is required. Provide it in the request body or ensure you have a valid authentication token.",
                received: req.body,
                authenticatedUser: req.user ? { id: req.user.id, role: req.user.role } : null
            });
        }
        // Validate adminId format - must be a non-empty string
        if (typeof adminId !== 'string' || adminId.trim() === '') {
            return res.status(400).json({
                message: "Admin ID must be a non-empty string",
                received: { adminId, adminIdType: typeof adminId }
            });
        }
        trimmedAdminId = String(adminId).trim();
        // Security check: If adminId is provided in body, it must match the authenticated user's ID
        if (bodyAdminId && req.user && bodyAdminId !== req.user.id) {
            return res.status(403).json({
                message: "Admin ID in request body must match the authenticated user's ID",
                providedAdminId: bodyAdminId,
                authenticatedUserId: req.user.id
            });
        }
        // Verify admin exists and is an admin (REQUIRED)
        try {
            const admin = await prisma_1.prisma.user.findUnique({
                where: { id: trimmedAdminId },
                select: { id: true, role: true, email: true }
            });
            if (!admin) {
                return res.status(404).json({
                    message: "Admin not found",
                    adminId: trimmedAdminId
                });
            }
            if (admin.role !== "ADMIN") {
                return res.status(403).json({
                    message: "User is not an admin",
                    adminId: trimmedAdminId,
                    role: admin.role,
                    email: admin.email
                });
            }
            console.log(`Admin verified: ${trimmedAdminId} (${admin.email})`);
        }
        catch (adminError) {
            console.error("Error verifying admin:", adminError);
            return res.status(500).json({
                message: "Failed to verify admin",
                adminId: trimmedAdminId,
                error: adminError.message
            });
        }
        // Validate product data using ProductInputSchema
        const validationResult = shared_1.ProductInputSchema.safeParse(productDataRaw);
        if (!validationResult.success) {
            return res.status(400).json({
                message: "Product validation error",
                errors: validationResult.error.flatten(),
                adminId: trimmedAdminId
            });
        }
        const productData = validationResult.data;
        // Check if slug already exists
        const existingProduct = await prisma_1.prisma.product.findUnique({
            where: { slug: productData.slug }
        });
        if (existingProduct) {
            return res.status(400).json({
                message: `A product with the slug "${productData.slug}" already exists. Please use a different slug.`,
                adminId: trimmedAdminId
            });
        }
        const initialStock = stock ? parseInt(String(stock)) : 0;
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
        console.log(`Product created successfully: ${product.id} by admin: ${trimmedAdminId}`);
        res.status(201).json({
            ...product,
            adminId: trimmedAdminId
        });
    }
    catch (error) {
        console.error("Error creating product:", error);
        // Handle Prisma unique constraint errors
        if (error.code === "P2002") {
            if (error.meta?.target?.includes("slug")) {
                return res.status(400).json({
                    message: `A product with the slug "${productDataRaw?.slug || req.body?.slug || 'unknown'}" already exists. Please use a different slug.`,
                    adminId: trimmedAdminId || req.body?.adminId
                });
            }
            if (error.meta?.target?.includes("sku")) {
                return res.status(400).json({
                    message: `A variant with the SKU "${error.meta.target}" already exists. Please use a different SKU.`,
                    adminId: trimmedAdminId || req.body?.adminId
                });
            }
        }
        res.status(500).json({
            message: "Failed to create product",
            error: error.message,
            adminId: trimmedAdminId || req.body?.adminId || "unknown"
        });
    }
});
// POST endpoint to get orders list - Admin/Agent only
exports.adminAgentRouter.post("/orders-list", auth_1.tryRefreshToken, auth_1.authenticate, auth_1.requireAdminOrAgent, async (req, res) => {
    let trimmedAdminId;
    try {
        // Extract adminId and filter parameters from request body
        const { adminId: bodyAdminId, status, customerEmail, startDate, endDate, page, pageSize, sortBy, sortOrder, ...rest } = req.body;
        // Use adminId from body if provided, otherwise use authenticated user's ID from token
        const adminId = bodyAdminId || req.user?.id;
        console.log("Orders list request received:", {
            adminIdFromBody: bodyAdminId,
            adminIdFromToken: req.user?.id,
            adminIdUsed: adminId,
            filters: { status, customerEmail, startDate, endDate, page, pageSize, sortBy, sortOrder }
        });
        // Validate request body
        if (!req.body || typeof req.body !== 'object') {
            return res.status(400).json({
                message: "Invalid request body. Expected JSON object"
            });
        }
        // adminId is REQUIRED (from body or token)
        if (!adminId) {
            return res.status(400).json({
                message: "Admin ID is required. Provide it in the request body or ensure you have a valid authentication token.",
                received: req.body,
                authenticatedUser: req.user ? { id: req.user.id, role: req.user.role } : null
            });
        }
        // Validate adminId format - must be a non-empty string
        if (typeof adminId !== 'string' || adminId.trim() === '') {
            return res.status(400).json({
                message: "Admin ID must be a non-empty string",
                received: { adminId, adminIdType: typeof adminId }
            });
        }
        trimmedAdminId = String(adminId).trim();
        // Security check: If adminId is provided in body, it must match the authenticated user's ID
        if (bodyAdminId && req.user && bodyAdminId !== req.user.id) {
            return res.status(403).json({
                message: "Admin ID in request body must match the authenticated user's ID",
                providedAdminId: bodyAdminId,
                authenticatedUserId: req.user.id
            });
        }
        // Verify admin exists and is an admin (REQUIRED)
        try {
            const admin = await prisma_1.prisma.user.findUnique({
                where: { id: trimmedAdminId },
                select: { id: true, role: true, email: true }
            });
            if (!admin) {
                return res.status(404).json({
                    message: "Admin not found",
                    adminId: trimmedAdminId
                });
            }
            if (admin.role !== "ADMIN") {
                return res.status(403).json({
                    message: "User is not an admin",
                    adminId: trimmedAdminId,
                    role: admin.role,
                    email: admin.email
                });
            }
            console.log(`Admin verified: ${trimmedAdminId} (${admin.email})`);
        }
        catch (adminError) {
            console.error("Error verifying admin:", adminError);
            return res.status(500).json({
                message: "Failed to verify admin",
                adminId: trimmedAdminId,
                error: adminError.message
            });
        }
        // Build where clause for filtering
        const where = {};
        // Filter by status
        if (status) {
            if (typeof status === 'string') {
                where.status = status;
            }
            else if (Array.isArray(status)) {
                where.status = { in: status };
            }
        }
        // Filter by customer email
        if (customerEmail) {
            const customer = await prisma_1.prisma.user.findUnique({
                where: { email: String(customerEmail).trim() },
                select: { id: true }
            });
            if (customer) {
                where.userId = customer.id;
            }
            else {
                // If customer not found, return empty results
                where.userId = "00000000-0000-0000-0000-000000000000"; // Non-existent UUID
            }
        }
        // Filter by date range
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) {
                where.createdAt.gte = new Date(startDate);
            }
            if (endDate) {
                where.createdAt.lte = new Date(endDate);
            }
        }
        // Pagination
        const pageNumber = page ? Number(page) : 1;
        const sizeNumber = pageSize ? Number(pageSize) : 20;
        const skip = (pageNumber - 1) * sizeNumber;
        // Sorting
        const sortField = sortBy || "createdAt";
        const sortDirection = sortOrder === "asc" ? "asc" : "desc";
        const orderBy = { [sortField]: sortDirection };
        // Fetch orders with error handling for enum issues
        let orders;
        let totalCount;
        try {
            [orders, totalCount] = await Promise.all([
                prisma_1.prisma.order.findMany({
                    where,
                    include: {
                        items: true,
                        user: {
                            select: {
                                id: true,
                                email: true,
                                name: true
                            }
                        }
                    },
                    orderBy,
                    skip,
                    take: sizeNumber
                }),
                prisma_1.prisma.order.count({ where })
            ]);
        }
        catch (prismaError) {
            // If Prisma client doesn't recognize new enum values, use raw SQL
            if (prismaError.message?.includes("not found in enum") || prismaError.code === "P2003") {
                console.warn("Prisma client out of sync with database enum. Using raw SQL fallback.");
                // Build WHERE clause for raw SQL
                let whereClause = "1=1";
                const params = [];
                let paramIndex = 1;
                if (status) {
                    if (typeof status === 'string') {
                        whereClause += ` AND o.status = $${paramIndex}`;
                        params.push(status);
                        paramIndex++;
                    }
                    else if (Array.isArray(status)) {
                        whereClause += ` AND o.status = ANY($${paramIndex})`;
                        params.push(status);
                        paramIndex++;
                    }
                }
                if (customerEmail) {
                    const customer = await prisma_1.prisma.user.findUnique({
                        where: { email: String(customerEmail).trim() },
                        select: { id: true }
                    });
                    if (customer) {
                        whereClause += ` AND o."userId" = $${paramIndex}`;
                        params.push(customer.id);
                        paramIndex++;
                    }
                    else {
                        whereClause += ` AND o."userId" = '00000000-0000-0000-0000-000000000000'`;
                    }
                }
                if (startDate) {
                    whereClause += ` AND o."createdAt" >= $${paramIndex}`;
                    params.push(new Date(startDate));
                    paramIndex++;
                }
                if (endDate) {
                    whereClause += ` AND o."createdAt" <= $${paramIndex}`;
                    params.push(new Date(endDate));
                    paramIndex++;
                }
                // Get total count
                const countResult = await prisma_1.prisma.$queryRaw `
            SELECT COUNT(*)::int as count
            FROM "Order" o
            WHERE ${client_1.Prisma.raw(whereClause)}
          `;
                totalCount = countResult[0]?.count || 0;
                // Get orders with pagination
                const sortFieldSql = sortField === "createdAt" ? '"createdAt"' : `"${sortField}"`;
                const sortDirSql = sortDirection.toUpperCase();
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
                       'sku', oi.sku,
                       'product', (
                         SELECT json_build_object(
                           'id', p.id,
                           'name', p.name,
                           'images', p.images,
                           'slug', p.slug
                         )
                         FROM "Product" p
                         WHERE p.id = oi."productId"
                       )
                     )
                   ) FILTER (WHERE oi.id IS NOT NULL) as items
            FROM "Order" o
            LEFT JOIN "OrderItem" oi ON oi."orderId" = o.id
            WHERE ${client_1.Prisma.raw(whereClause)}
            GROUP BY o.id
            ORDER BY o.${client_1.Prisma.raw(sortFieldSql)} ${client_1.Prisma.raw(sortDirSql)}
            LIMIT ${sizeNumber} OFFSET ${skip}
          `;
                // Transform raw results
                orders = rawOrders.map((order) => ({
                    ...order,
                    items: order.items || [],
                    user: order.userId ? {
                        id: order.userId,
                        email: null,
                        name: null
                    } : null
                }));
                // Fetch user details for orders
                for (const order of orders) {
                    if (order.userId) {
                        const user = await prisma_1.prisma.user.findUnique({
                            where: { id: order.userId },
                            select: { id: true, email: true, name: true }
                        });
                        if (user) {
                            order.user = user;
                        }
                    }
                }
            }
            else {
                throw prismaError;
            }
        }
        // Calculate total revenue (including tax)
        const TAX_RATE = 0.1;
        const totalRevenue = orders.reduce((sum, order) => {
            return sum + (Number(order.total) * (1 + TAX_RATE));
        }, 0);
        console.log(`Orders fetched successfully: ${orders.length} orders for admin: ${trimmedAdminId}`);
        res.json({
            orders: orders.map(order => ({
                ...order,
                totalWithTax: (Number(order.total) * (1 + TAX_RATE)).toFixed(2)
            })),
            pagination: {
                page: pageNumber,
                pageSize: sizeNumber,
                total: totalCount,
                totalPages: Math.ceil(totalCount / sizeNumber)
            },
            summary: {
                totalOrders: totalCount,
                totalRevenue: totalRevenue.toFixed(2),
                filteredOrders: orders.length
            },
            adminId: trimmedAdminId
        });
    }
    catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).json({
            message: "Failed to fetch orders",
            error: error.message,
            adminId: trimmedAdminId || req.body?.adminId || "unknown"
        });
    }
});
// POST endpoint to update order status - Admin/Agent only
exports.adminAgentRouter.post("/update-order-status", auth_1.tryRefreshToken, auth_1.authenticate, auth_1.requireAdminOrAgent, async (req, res) => {
    let trimmedAdminId;
    try {
        // Extract adminId, orderId, and status from request body
        const { adminId: bodyAdminId, orderId, status, ...rest } = req.body;
        // Use adminId from body if provided, otherwise use authenticated user's ID from token
        const adminId = bodyAdminId || req.user?.id;
        console.log("Update order status request received:", {
            adminIdFromBody: bodyAdminId,
            adminIdFromToken: req.user?.id,
            adminIdUsed: adminId,
            orderId,
            status
        });
        // Validate request body
        if (!req.body || typeof req.body !== 'object') {
            return res.status(400).json({
                message: "Invalid request body. Expected JSON object with orderId and status"
            });
        }
        // orderId is REQUIRED
        if (!orderId) {
            return res.status(400).json({
                message: "Order ID is required",
                received: req.body,
                requiredFields: ["orderId", "status"]
            });
        }
        // Validate orderId format
        if (typeof orderId !== 'string' || orderId.trim() === '') {
            return res.status(400).json({
                message: "Order ID must be a non-empty string",
                received: { orderId, orderIdType: typeof orderId }
            });
        }
        // Remove # prefix if present (for display IDs like "#DB0B9169")
        const trimmedOrderId = String(orderId).trim().replace(/^#/, '').toUpperCase();
        // status is REQUIRED
        if (!status) {
            return res.status(400).json({
                message: "Status is required",
                received: req.body,
                requiredFields: ["orderId", "status"]
            });
        }
        // Validate status format
        if (typeof status !== 'string' || status.trim() === '') {
            return res.status(400).json({
                message: "Status must be a non-empty string",
                received: { status, statusType: typeof status }
            });
        }
        const trimmedStatus = String(status).trim().toUpperCase();
        // Validate status value
        const validStatuses = [
            "PENDING",
            "PAID",
            "PREPARING_TO_SHIP",
            "READY_TO_SHIP",
            "CANCELLED",
            "FULFILLED",
            "REFUNDED"
        ];
        // Map human-readable statuses to enum values
        const statusMap = {
            "preparing to ship": "PREPARING_TO_SHIP",
            "preparing_to_ship": "PREPARING_TO_SHIP",
            "ready to ship": "READY_TO_SHIP",
            "ready_to_ship": "READY_TO_SHIP",
            "shipped": "FULFILLED",
            "fulfilled": "FULFILLED",
            "pending": "PENDING",
            "paid": "PAID",
            "cancelled": "CANCELLED",
            "canceled": "CANCELLED",
            "refunded": "REFUNDED"
        };
        const normalizedStatus = statusMap[trimmedStatus.toLowerCase()] || trimmedStatus;
        if (!validStatuses.includes(normalizedStatus)) {
            return res.status(400).json({
                message: "Invalid status value",
                received: status,
                validStatuses: validStatuses,
                normalizedStatus: normalizedStatus
            });
        }
        // adminId is REQUIRED (from body or token)
        if (!adminId) {
            return res.status(400).json({
                message: "Admin ID is required. Provide it in the request body or ensure you have a valid authentication token.",
                received: req.body,
                authenticatedUser: req.user ? { id: req.user.id, role: req.user.role } : null
            });
        }
        // Validate adminId format - must be a non-empty string
        if (typeof adminId !== 'string' || adminId.trim() === '') {
            return res.status(400).json({
                message: "Admin ID must be a non-empty string",
                received: { adminId, adminIdType: typeof adminId }
            });
        }
        trimmedAdminId = String(adminId).trim();
        // Security check: If adminId is provided in body, it must match the authenticated user's ID
        if (bodyAdminId && req.user && bodyAdminId !== req.user.id) {
            return res.status(403).json({
                message: "Admin ID in request body must match the authenticated user's ID",
                providedAdminId: bodyAdminId,
                authenticatedUserId: req.user.id
            });
        }
        // Verify admin exists and is an admin (REQUIRED)
        try {
            const admin = await prisma_1.prisma.user.findUnique({
                where: { id: trimmedAdminId },
                select: { id: true, role: true, email: true }
            });
            if (!admin) {
                return res.status(404).json({
                    message: "Admin not found",
                    adminId: trimmedAdminId
                });
            }
            if (admin.role !== "ADMIN") {
                return res.status(403).json({
                    message: "User is not an admin",
                    adminId: trimmedAdminId,
                    role: admin.role,
                    email: admin.email
                });
            }
            console.log(`Admin verified: ${trimmedAdminId} (${admin.email})`);
        }
        catch (adminError) {
            console.error("Error verifying admin:", adminError);
            return res.status(500).json({
                message: "Failed to verify admin",
                adminId: trimmedAdminId,
                error: adminError.message
            });
        }
        // Check if order exists - try full UUID first, then by prefix if it looks like a short ID
        let existingOrder = await prisma_1.prisma.order.findUnique({
            where: { id: trimmedOrderId },
            include: { items: true }
        });
        // If not found and looks like a short ID (8-12 alphanumeric chars, not a full UUID), search by prefix
        if (!existingOrder && trimmedOrderId.length >= 8 && trimmedOrderId.length < 36 && /^[A-Z0-9]+$/.test(trimmedOrderId)) {
            console.log(`Order not found by full UUID, searching by prefix: ${trimmedOrderId}`);
            try {
                // Use raw SQL to find order by ID prefix
                // Cast length to integer explicitly for PostgreSQL
                const prefixLength = parseInt(String(trimmedOrderId.length), 10);
                const orders = await prisma_1.prisma.$queryRaw `
            SELECT id
            FROM "Order"
            WHERE UPPER(SUBSTRING(id::text, 1, ${prefixLength}::int)) = ${trimmedOrderId}
            LIMIT 1
          `;
                if (orders.length > 0) {
                    console.log(`Found order by prefix: ${orders[0].id}`);
                    existingOrder = await prisma_1.prisma.order.findUnique({
                        where: { id: orders[0].id },
                        include: { items: true }
                    });
                }
            }
            catch (prefixError) {
                console.error("Error searching by prefix:", prefixError);
                // Continue to return 404 below
            }
        }
        if (!existingOrder) {
            return res.status(404).json({
                message: "Order not found",
                orderId: req.body.orderId,
                searchedAs: trimmedOrderId,
                adminId: trimmedAdminId,
                note: trimmedOrderId.length < 36
                    ? "Searched by ID prefix. Make sure you're using the correct order ID."
                    : "Searched by full UUID. If you're using a shortened ID, make sure it's correct."
            });
        }
        // At this point, existingOrder is guaranteed to be non-null (we return 404 if it's null)
        const orderToUpdate = existingOrder;
        // Handle inventory adjustments for cancelled/refunded orders
        if (["CANCELLED", "REFUNDED"].includes(normalizedStatus) &&
            !["CANCELLED", "REFUNDED"].includes(orderToUpdate.status)) {
            // Only adjust inventory if order is being cancelled/refunded for the first time
            await prisma_1.prisma.$transaction(async (tx) => {
                for (const item of orderToUpdate.items) {
                    const inventory = await tx.inventory.findFirst({
                        where: {
                            productId: item.variantId ? undefined : item.productId,
                            variantId: item.variantId ?? undefined
                        }
                    });
                    if (!inventory) {
                        continue;
                    }
                    const adjustment = (0, inventoryService_1.adjustInventory)(inventory, item.quantity);
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
                            reference: `order:${orderToUpdate.id}`,
                            reason: `Order ${normalizedStatus.toLowerCase()}`,
                            createdBy: trimmedAdminId
                        }
                    });
                }
            });
            console.log(`Inventory adjusted for ${normalizedStatus} order: ${trimmedOrderId}`);
        }
        // Update order status with error handling for enum issues
        // Use the full UUID from the found order
        const orderIdToUpdate = orderToUpdate.id;
        let updatedOrder;
        try {
            updatedOrder = await prisma_1.prisma.order.update({
                where: { id: orderIdToUpdate },
                data: { status: normalizedStatus },
                include: {
                    items: true,
                    user: {
                        select: {
                            id: true,
                            email: true,
                            name: true
                        }
                    }
                }
            });
            console.log(`Order status updated successfully: ${orderIdToUpdate} -> ${normalizedStatus} by admin: ${trimmedAdminId}`);
        }
        catch (prismaError) {
            // If Prisma client doesn't recognize new enum values, use raw SQL
            if (prismaError.message?.includes("not found in enum") || prismaError.code === "P2003") {
                console.warn("Prisma client out of sync with database enum. Using raw SQL fallback.");
                // Use raw SQL to update order status
                await prisma_1.prisma.$executeRaw `
            UPDATE "Order"
            SET status = ${normalizedStatus}::"OrderStatus", "updatedAt" = NOW()
            WHERE id = ${orderIdToUpdate}
          `;
                // Fetch updated order
                updatedOrder = await prisma_1.prisma.order.findUnique({
                    where: { id: orderIdToUpdate },
                    include: {
                        items: true,
                        user: {
                            select: {
                                id: true,
                                email: true,
                                name: true
                            }
                        }
                    }
                });
                if (!updatedOrder) {
                    return res.status(404).json({
                        message: "Order not found after update",
                        orderId: req.body.orderId,
                        adminId: trimmedAdminId
                    });
                }
                console.log(`Order status updated via raw SQL: ${orderIdToUpdate} -> ${normalizedStatus} by admin: ${trimmedAdminId}`);
            }
            else {
                throw prismaError;
            }
        }
        res.json({
            ...updatedOrder,
            previousStatus: orderToUpdate.status,
            newStatus: normalizedStatus,
            adminId: trimmedAdminId
        });
    }
    catch (error) {
        console.error("Error updating order status:", error);
        // Handle Prisma record not found
        if (error.code === "P2025") {
            return res.status(404).json({
                message: "Order not found",
                orderId: req.body?.orderId,
                adminId: trimmedAdminId || req.body?.adminId
            });
        }
        res.status(500).json({
            message: "Failed to update order status",
            error: error.message,
            adminId: trimmedAdminId || req.body?.adminId || "unknown",
            orderId: req.body?.orderId || "unknown"
        });
    }
});
// POST endpoint to get sales report overview - Admin/Agent only
exports.adminAgentRouter.post("/sales-report-overview", auth_1.tryRefreshToken, auth_1.authenticate, auth_1.requireAdminOrAgent, async (req, res) => {
    let trimmedAdminId;
    try {
        // Extract adminId and filter parameters from request body
        const { adminId: bodyAdminId, startDate, endDate, ...rest } = req.body;
        // Use adminId from body if provided, otherwise use authenticated user's ID from token
        const adminId = bodyAdminId || req.user?.id;
        console.log("Sales report overview request received:", {
            adminIdFromBody: bodyAdminId,
            adminIdFromToken: req.user?.id,
            adminIdUsed: adminId,
            filters: { startDate, endDate }
        });
        // Validate request body
        if (!req.body || typeof req.body !== 'object') {
            return res.status(400).json({
                message: "Invalid request body. Expected JSON object"
            });
        }
        // adminId is REQUIRED (from body or token)
        if (!adminId) {
            return res.status(400).json({
                message: "Admin ID is required. Provide it in the request body or ensure you have a valid authentication token.",
                received: req.body,
                authenticatedUser: req.user ? { id: req.user.id, role: req.user.role } : null
            });
        }
        // Validate adminId format - must be a non-empty string
        if (typeof adminId !== 'string' || adminId.trim() === '') {
            return res.status(400).json({
                message: "Admin ID must be a non-empty string",
                received: { adminId, adminIdType: typeof adminId }
            });
        }
        trimmedAdminId = String(adminId).trim();
        // Security check: If adminId is provided in body, it must match the authenticated user's ID
        if (bodyAdminId && req.user && bodyAdminId !== req.user.id) {
            return res.status(403).json({
                message: "Admin ID in request body must match the authenticated user's ID",
                providedAdminId: bodyAdminId,
                authenticatedUserId: req.user.id
            });
        }
        // Verify admin exists and is an admin (REQUIRED)
        try {
            const admin = await prisma_1.prisma.user.findUnique({
                where: { id: trimmedAdminId },
                select: { id: true, role: true, email: true }
            });
            if (!admin) {
                return res.status(404).json({
                    message: "Admin not found",
                    adminId: trimmedAdminId
                });
            }
            if (admin.role !== "ADMIN") {
                return res.status(403).json({
                    message: "User is not an admin",
                    adminId: trimmedAdminId,
                    role: admin.role,
                    email: admin.email
                });
            }
            console.log(`Admin verified: ${trimmedAdminId} (${admin.email})`);
        }
        catch (adminError) {
            console.error("Error verifying admin:", adminError);
            return res.status(500).json({
                message: "Failed to verify admin",
                adminId: trimmedAdminId,
                error: adminError.message
            });
        }
        // Build where clause for date filtering
        const where = {};
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) {
                where.createdAt.gte = new Date(startDate);
            }
            if (endDate) {
                where.createdAt.lte = new Date(endDate);
            }
        }
        const TAX_RATE = 0.1; // 10% tax rate
        // Fetch all orders with error handling for enum issues
        let orders;
        try {
            orders = await prisma_1.prisma.order.findMany({
                where,
                include: {
                    items: true,
                    user: {
                        select: {
                            id: true,
                            email: true,
                            name: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });
        }
        catch (prismaError) {
            // If Prisma client doesn't recognize new enum values, use raw SQL
            if (prismaError.message?.includes("not found in enum") || prismaError.code === "P2003") {
                console.warn("Prisma client out of sync with database enum. Using raw SQL fallback.");
                // Build WHERE clause for raw SQL
                let whereClause = "1=1";
                const params = [];
                let paramIndex = 1;
                if (startDate) {
                    whereClause += ` AND o."createdAt" >= $${paramIndex}`;
                    params.push(new Date(startDate));
                    paramIndex++;
                }
                if (endDate) {
                    whereClause += ` AND o."createdAt" <= $${paramIndex}`;
                    params.push(new Date(endDate));
                    paramIndex++;
                }
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
            WHERE ${client_1.Prisma.raw(whereClause)}
            GROUP BY o.id
            ORDER BY o."createdAt" DESC
          `;
                // Transform raw results
                orders = rawOrders.map((order) => ({
                    ...order,
                    items: order.items || [],
                    user: order.userId ? {
                        id: order.userId,
                        email: null,
                        name: null
                    } : null
                }));
                // Fetch user details for orders
                for (const order of orders) {
                    if (order.userId) {
                        const user = await prisma_1.prisma.user.findUnique({
                            where: { id: order.userId },
                            select: { id: true, email: true, name: true }
                        });
                        if (user) {
                            order.user = user;
                        }
                    }
                }
            }
            else {
                throw prismaError;
            }
        }
        // Calculate sales metrics
        const totalOrders = orders.length;
        // Calculate revenue (before tax)
        const totalRevenueBeforeTax = orders.reduce((sum, order) => {
            return sum + Number(order.total);
        }, 0);
        // Calculate revenue (after tax)
        const totalRevenueAfterTax = totalRevenueBeforeTax * (1 + TAX_RATE);
        const totalTax = totalRevenueBeforeTax * TAX_RATE;
        // Calculate average order value
        const averageOrderValue = totalOrders > 0 ? totalRevenueAfterTax / totalOrders : 0;
        // Calculate profit (revenue - cost)
        let totalCost = 0;
        let totalProfit = 0;
        for (const order of orders) {
            for (const item of order.items) {
                // Fetch product to get cost
                try {
                    const product = await prisma_1.prisma.product.findUnique({
                        where: { id: item.productId }
                    });
                    if (product) {
                        const itemCost = product.cost ? Number(product.cost) : 0;
                        const itemRevenue = Number(product.price) * item.quantity;
                        totalCost += itemCost * item.quantity;
                        totalProfit += (itemRevenue - (itemCost * item.quantity));
                    }
                }
                catch (err) {
                    // If product not found, skip cost calculation for this item
                    console.warn(`Product not found for item: ${item.productId}`);
                }
            }
        }
        // Calculate profit margin percentage
        const profitMargin = totalRevenueBeforeTax > 0
            ? (totalProfit / totalRevenueBeforeTax) * 100
            : 0;
        // Group orders by status
        const ordersByStatus = {};
        const revenueByStatus = {};
        orders.forEach(order => {
            const status = order.status;
            ordersByStatus[status] = (ordersByStatus[status] || 0) + 1;
            revenueByStatus[status] = (revenueByStatus[status] || 0) + (Number(order.total) * (1 + TAX_RATE));
        });
        // Calculate completed/fulfilled orders
        const completedOrders = orders.filter(o => o.status === "FULFILLED").length;
        const completedRevenue = orders
            .filter(o => o.status === "FULFILLED")
            .reduce((sum, order) => sum + (Number(order.total) * (1 + TAX_RATE)), 0);
        // Calculate pending orders
        const pendingOrders = orders.filter(o => ["PENDING", "PAID", "PREPARING_TO_SHIP", "READY_TO_SHIP"].includes(o.status)).length;
        const pendingRevenue = orders
            .filter(o => ["PENDING", "PAID", "PREPARING_TO_SHIP", "READY_TO_SHIP"].includes(o.status))
            .reduce((sum, order) => sum + (Number(order.total) * (1 + TAX_RATE)), 0);
        // Calculate cancelled/refunded orders
        const cancelledOrders = orders.filter(o => ["CANCELLED", "REFUNDED"].includes(o.status)).length;
        const cancelledRevenue = orders
            .filter(o => ["CANCELLED", "REFUNDED"].includes(o.status))
            .reduce((sum, order) => sum + (Number(order.total) * (1 + TAX_RATE)), 0);
        // Get top products by quantity sold
        const productSales = {};
        orders.forEach(order => {
            order.items.forEach((item) => {
                const productId = item.productId || 'unknown';
                const productName = item.name || 'Unknown Product';
                if (!productSales[productId]) {
                    productSales[productId] = {
                        name: productName,
                        quantity: 0,
                        revenue: 0
                    };
                }
                productSales[productId].quantity += item.quantity;
                productSales[productId].revenue += Number(item.price) * item.quantity * (1 + TAX_RATE);
            });
        });
        // Calculate profit for each product
        const productProfit = {};
        for (const order of orders) {
            for (const item of order.items) {
                const productId = item.productId || 'unknown';
                try {
                    const product = await prisma_1.prisma.product.findUnique({
                        where: { id: item.productId }
                    });
                    if (product) {
                        const itemCost = product.cost ? Number(product.cost) : 0;
                        const itemRevenue = Number(product.price) * item.quantity;
                        const itemProfit = itemRevenue - (itemCost * item.quantity);
                        productProfit[productId] = (productProfit[productId] || 0) + itemProfit;
                        // Update product sales with profit
                        if (productSales[productId]) {
                            productSales[productId].revenue = itemRevenue * (1 + TAX_RATE);
                        }
                    }
                }
                catch (err) {
                    // Skip if product not found
                }
            }
        }
        const topProducts = Object.entries(productSales)
            .map(([productId, data]) => ({
            productId,
            ...data,
            profit: (productProfit[productId] || 0).toFixed(2),
            profitMargin: data.revenue > 0
                ? ((productProfit[productId] || 0) / (data.revenue / (1 + TAX_RATE))) * 100
                : 0
        }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10); // Top 10 products
        // Calculate sales by date (daily breakdown)
        const salesByDate = {};
        orders.forEach(order => {
            const dateKey = new Date(order.createdAt).toISOString().split('T')[0]; // YYYY-MM-DD
            if (!salesByDate[dateKey]) {
                salesByDate[dateKey] = {
                    orders: 0,
                    revenue: 0
                };
            }
            salesByDate[dateKey].orders += 1;
            salesByDate[dateKey].revenue += Number(order.total) * (1 + TAX_RATE);
        });
        const dailySales = Object.entries(salesByDate)
            .map(([date, data]) => ({
            date,
            ...data
        }))
            .sort((a, b) => a.date.localeCompare(b.date));
        // Get low in-stock items (products with available quantity < 10)
        const lowStockItems = await prisma_1.prisma.product.findMany({
            include: {
                variants: {
                    include: {
                        inventory: true
                    }
                },
                inventory: true
            }
        });
        const lowStockProducts = [];
        for (const product of lowStockItems) {
            let totalAvailable = 0;
            let totalStock = 0;
            let totalReserved = 0;
            if (product.variants.length > 0) {
                for (const variant of product.variants) {
                    if (variant.inventory && variant.inventory.length > 0) {
                        const inv = variant.inventory[0];
                        const available = (inv.quantityOnHand || 0) - (inv.quantityReserved || 0);
                        totalAvailable += available;
                        totalStock += inv.quantityOnHand || 0;
                        totalReserved += inv.quantityReserved || 0;
                    }
                }
            }
            else {
                if (product.inventory && product.inventory.length > 0) {
                    const inv = product.inventory[0];
                    totalAvailable = (inv.quantityOnHand || 0) - (inv.quantityReserved || 0);
                    totalStock = inv.quantityOnHand || 0;
                    totalReserved = inv.quantityReserved || 0;
                }
            }
            if (totalAvailable < 10) {
                lowStockProducts.push({
                    productId: product.id,
                    name: product.name,
                    slug: product.slug,
                    availableStock: totalAvailable,
                    totalStock: totalStock,
                    reservedStock: totalReserved,
                    category: product.category
                });
            }
        }
        // Sort by available stock (lowest first)
        lowStockProducts.sort((a, b) => a.availableStock - b.availableStock);
        // Calculate date range
        const dateRange = {
            start: startDate ? new Date(startDate).toISOString() : orders.length > 0
                ? orders[orders.length - 1].createdAt.toISOString()
                : new Date().toISOString(),
            end: endDate ? new Date(endDate).toISOString() : orders.length > 0
                ? orders[0].createdAt.toISOString()
                : new Date().toISOString()
        };
        console.log(`Sales report generated successfully for admin: ${trimmedAdminId}`);
        res.json({
            summary: {
                totalOrders,
                totalRevenueBeforeTax: totalRevenueBeforeTax.toFixed(2),
                totalTax: totalTax.toFixed(2),
                totalRevenueAfterTax: totalRevenueAfterTax.toFixed(2),
                totalCost: totalCost.toFixed(2),
                totalProfit: totalProfit.toFixed(2),
                profitMargin: profitMargin.toFixed(2),
                averageOrderValue: averageOrderValue.toFixed(2),
                currency: "USD"
            },
            revenue: {
                beforeTax: totalRevenueBeforeTax.toFixed(2),
                tax: totalTax.toFixed(2),
                afterTax: totalRevenueAfterTax.toFixed(2),
                breakdown: {
                    completed: completedRevenue.toFixed(2),
                    pending: pendingRevenue.toFixed(2),
                    cancelled: cancelledRevenue.toFixed(2)
                }
            },
            profit: {
                totalCost: totalCost.toFixed(2),
                totalProfit: totalProfit.toFixed(2),
                profitMargin: profitMargin.toFixed(2),
                profitMarginPercentage: `${profitMargin.toFixed(2)}%`
            },
            ordersByStatus: {
                pending: {
                    count: pendingOrders,
                    revenue: pendingRevenue.toFixed(2)
                },
                completed: {
                    count: completedOrders,
                    revenue: completedRevenue.toFixed(2)
                },
                cancelled: {
                    count: cancelledOrders,
                    revenue: cancelledRevenue.toFixed(2)
                },
                breakdown: Object.entries(ordersByStatus).map(([status, count]) => ({
                    status,
                    count,
                    revenue: revenueByStatus[status].toFixed(2)
                }))
            },
            topProducts,
            lowStockItems: lowStockProducts,
            dailySales,
            dateRange,
            adminId: trimmedAdminId,
            generatedAt: new Date().toISOString()
        });
    }
    catch (error) {
        console.error("Error generating sales report:", error);
        res.status(500).json({
            message: "Failed to generate sales report",
            error: error.message,
            adminId: trimmedAdminId || req.body?.adminId || "unknown"
        });
    }
});
// POST endpoint to get inventory list - Admin/Agent only
exports.adminAgentRouter.post("/inventory-list", auth_1.tryRefreshToken, auth_1.authenticate, auth_1.requireAdminOrAgent, async (req, res) => {
    let trimmedAdminId;
    try {
        // Extract adminId and filter parameters from request body
        const { adminId: bodyAdminId, productId, variantId, category, lowStock, page, pageSize, ...rest } = req.body;
        // Use adminId from body if provided, otherwise use authenticated user's ID from token
        const adminId = bodyAdminId || req.user?.id;
        console.log("Inventory list request received:", {
            adminIdFromBody: bodyAdminId,
            adminIdFromToken: req.user?.id,
            adminIdUsed: adminId,
            filters: { productId, variantId, category, lowStock, page, pageSize }
        });
        // Validate request body
        if (!req.body || typeof req.body !== 'object') {
            return res.status(400).json({
                message: "Invalid request body. Expected JSON object"
            });
        }
        // adminId is REQUIRED (from body or token)
        if (!adminId) {
            return res.status(400).json({
                message: "Admin ID is required. Provide it in the request body or ensure you have a valid authentication token.",
                received: req.body,
                authenticatedUser: req.user ? { id: req.user.id, role: req.user.role } : null
            });
        }
        // Validate adminId format - must be a non-empty string
        if (typeof adminId !== 'string' || adminId.trim() === '') {
            return res.status(400).json({
                message: "Admin ID must be a non-empty string",
                received: { adminId, adminIdType: typeof adminId }
            });
        }
        trimmedAdminId = String(adminId).trim();
        // Security check: If adminId is provided in body, it must match the authenticated user's ID
        if (bodyAdminId && req.user && bodyAdminId !== req.user.id) {
            return res.status(403).json({
                message: "Admin ID in request body must match the authenticated user's ID",
                providedAdminId: bodyAdminId,
                authenticatedUserId: req.user.id
            });
        }
        // Verify admin exists and is an admin (REQUIRED)
        try {
            const admin = await prisma_1.prisma.user.findUnique({
                where: { id: trimmedAdminId },
                select: { id: true, role: true, email: true }
            });
            if (!admin) {
                return res.status(404).json({
                    message: "Admin not found",
                    adminId: trimmedAdminId
                });
            }
            if (admin.role !== "ADMIN") {
                return res.status(403).json({
                    message: "User is not an admin",
                    adminId: trimmedAdminId,
                    role: admin.role,
                    email: admin.email
                });
            }
            console.log(`Admin verified: ${trimmedAdminId} (${admin.email})`);
        }
        catch (adminError) {
            console.error("Error verifying admin:", adminError);
            return res.status(500).json({
                message: "Failed to verify admin",
                adminId: trimmedAdminId,
                error: adminError.message
            });
        }
        // Build where clause for filtering
        const where = {};
        if (productId) {
            where.productId = productId;
        }
        if (variantId) {
            where.variantId = variantId;
        }
        else if (productId) {
            // When filtering by productId only, include both product-level and variant-level inventory
            // We'll handle this in the query
        }
        // Pagination
        const pageNumber = page ? Number(page) : 1;
        const sizeNumber = pageSize ? Number(pageSize) : 100;
        const skip = (pageNumber - 1) * sizeNumber;
        // Fetch inventory with product and variant details
        let inventoryItems = await prisma_1.prisma.inventory.findMany({
            where,
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        category: true,
                        price: true,
                        currency: true,
                        images: true,
                        status: true
                    }
                },
                variant: {
                    select: {
                        id: true,
                        sku: true,
                        attributes: true,
                        priceOverride: true
                    }
                }
            },
            orderBy: {
                updatedAt: 'desc'
            },
            skip,
            take: sizeNumber
        });
        // Fetch product costs separately
        const productIds = inventoryItems
            .map(item => item.productId)
            .filter((id) => id !== null);
        const productsWithCost = await prisma_1.prisma.product.findMany({
            where: { id: { in: productIds } }
        });
        const productCostMap = new Map(productsWithCost.map(p => [p.id, p.cost || null]));
        // Filter by category if provided
        if (category) {
            inventoryItems = inventoryItems.filter(item => item.product && item.product.category === category);
        }
        // Filter by low stock if requested (available stock < 10)
        if (lowStock === true || lowStock === "true") {
            inventoryItems = inventoryItems.filter(item => {
                const available = item.quantityOnHand - item.quantityReserved;
                return available < 10;
            });
        }
        // Get total count (before pagination)
        const totalCount = await prisma_1.prisma.inventory.count({ where });
        // Calculate summary statistics
        let totalStock = 0;
        let totalReserved = 0;
        let totalAvailable = 0;
        let lowStockCount = 0;
        let outOfStockCount = 0;
        let totalStockValue = 0;
        const categoryStats = {};
        const allInventory = await prisma_1.prisma.inventory.findMany({
            include: {
                product: {
                    select: {
                        id: true,
                        category: true
                    }
                }
            }
        });
        // Fetch all product costs separately
        const allProductIds = allInventory
            .map(item => item.productId)
            .filter((id) => id !== null);
        const allProductsWithCost = await prisma_1.prisma.product.findMany({
            where: { id: { in: allProductIds } }
        });
        const allProductCostMap = new Map(allProductsWithCost.map(p => [p.id, p.cost || 0]));
        allInventory.forEach((item) => {
            const available = item.quantityOnHand - item.quantityReserved;
            totalStock += item.quantityOnHand;
            totalReserved += item.quantityReserved;
            totalAvailable += available;
            // Calculate stock value
            const productCost = item.productId ? (allProductCostMap.get(item.productId) || 0) : 0;
            totalStockValue += item.quantityOnHand * productCost;
            // Category statistics
            if (item.product && item.product.category) {
                const category = item.product.category;
                if (!categoryStats[category]) {
                    categoryStats[category] = {
                        totalStock: 0,
                        totalReserved: 0,
                        totalAvailable: 0,
                        itemCount: 0
                    };
                }
                categoryStats[category].totalStock += item.quantityOnHand;
                categoryStats[category].totalReserved += item.quantityReserved;
                categoryStats[category].totalAvailable += available;
                categoryStats[category].itemCount += 1;
            }
            if (available < 10) {
                lowStockCount++;
            }
            if (available <= 0) {
                outOfStockCount++;
            }
        });
        // Format inventory items with calculated fields
        const formattedInventory = inventoryItems.map(item => {
            const available = item.quantityOnHand - item.quantityReserved;
            const productCost = item.productId ? productCostMap.get(item.productId) : null;
            return {
                ...item,
                availableStock: available,
                isLowStock: available < 10,
                isOutOfStock: available <= 0,
                product: item.product ? {
                    ...item.product,
                    cost: productCost || null
                } : null,
                variant: item.variant || null
            };
        });
        // Get inventory movements summary (recent movements)
        const recentMovements = await prisma_1.prisma.inventoryMovement.findMany({
            take: 50,
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                inventory: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true
                            }
                        },
                        variant: {
                            select: {
                                id: true,
                                sku: true
                            }
                        }
                    }
                }
            }
        });
        console.log(`Inventory list fetched successfully: ${formattedInventory.length} items for admin: ${trimmedAdminId}`);
        res.json({
            inventory: formattedInventory,
            pagination: {
                page: pageNumber,
                pageSize: sizeNumber,
                total: totalCount,
                totalPages: Math.ceil(totalCount / sizeNumber),
                filteredCount: formattedInventory.length
            },
            summary: {
                totalItems: totalCount,
                totalStock,
                totalReserved,
                totalAvailable,
                lowStockCount,
                outOfStockCount,
                totalStockValue: Number(totalStockValue.toFixed(2)),
                averageStockPerItem: totalCount > 0 ? Number((totalStock / totalCount).toFixed(2)) : 0,
                reservedPercentage: totalStock > 0 ? Number(((totalReserved / totalStock) * 100).toFixed(2)) : 0,
                lowStockPercentage: totalCount > 0 ? Number(((lowStockCount / totalCount) * 100).toFixed(2)) : 0,
                outOfStockPercentage: totalCount > 0 ? Number(((outOfStockCount / totalCount) * 100).toFixed(2)) : 0,
                categories: Array.from(new Set(allInventory
                    .filter((item) => item.product)
                    .map((item) => item.product.category))),
                stockByCategory: Object.entries(categoryStats).map(([category, stats]) => ({
                    category,
                    totalStock: stats.totalStock,
                    totalReserved: stats.totalReserved,
                    totalAvailable: stats.totalAvailable,
                    itemCount: stats.itemCount,
                    averageStock: stats.itemCount > 0 ? Number((stats.totalStock / stats.itemCount).toFixed(2)) : 0
                }))
            },
            recentMovements: recentMovements.map((movement) => ({
                id: movement.id,
                type: movement.type,
                quantity: movement.quantity,
                reason: movement.reason,
                reference: movement.reference,
                createdAt: movement.createdAt,
                product: movement.inventory?.product ? {
                    id: movement.inventory.product.id,
                    name: movement.inventory.product.name
                } : null,
                variant: movement.inventory?.variant ? {
                    id: movement.inventory.variant.id,
                    sku: movement.inventory.variant.sku
                } : null
            })),
            adminId: trimmedAdminId
        });
    }
    catch (error) {
        console.error("Error fetching inventory:", error);
        res.status(500).json({
            message: "Failed to fetch inventory",
            error: error.message,
            adminId: trimmedAdminId || req.body?.adminId || "unknown"
        });
    }
});
// POST endpoint to update stock by product name and category - Admin/Agent only
exports.adminAgentRouter.post("/update-stock", auth_1.tryRefreshToken, auth_1.authenticate, auth_1.requireAdminOrAgent, async (req, res) => {
    let trimmedAdminId;
    try {
        // Extract adminId, productName, category, stock, and reason from request body
        const { adminId: bodyAdminId, productName, category, stock, reason, productId, variantId, ...rest } = req.body;
        // Use adminId from body if provided, otherwise use authenticated user's ID from token
        const adminId = bodyAdminId || req.user?.id;
        console.log("Update stock request received:", {
            adminIdFromBody: bodyAdminId,
            adminIdFromToken: req.user?.id,
            adminIdUsed: adminId,
            productName,
            category,
            stock,
            productId,
            variantId,
            reason
        });
        // Validate request body
        if (!req.body || typeof req.body !== 'object') {
            return res.status(400).json({
                message: "Invalid request body. Expected JSON object with productName (or productId) and stock"
            });
        }
        // adminId is REQUIRED (from body or token)
        if (!adminId) {
            return res.status(400).json({
                message: "Admin ID is required. Provide it in the request body or ensure you have a valid authentication token.",
                received: req.body,
                authenticatedUser: req.user ? { id: req.user.id, role: req.user.role } : null
            });
        }
        // Validate adminId format - must be a non-empty string
        if (typeof adminId !== 'string' || adminId.trim() === '') {
            return res.status(400).json({
                message: "Admin ID must be a non-empty string",
                received: { adminId, adminIdType: typeof adminId }
            });
        }
        trimmedAdminId = String(adminId).trim();
        // Security check: If adminId is provided in body, it must match the authenticated user's ID
        if (bodyAdminId && req.user && bodyAdminId !== req.user.id) {
            return res.status(403).json({
                message: "Admin ID in request body must match the authenticated user's ID",
                providedAdminId: bodyAdminId,
                authenticatedUserId: req.user.id
            });
        }
        // Verify admin exists and is an admin (REQUIRED)
        try {
            const admin = await prisma_1.prisma.user.findUnique({
                where: { id: trimmedAdminId },
                select: { id: true, role: true, email: true }
            });
            if (!admin) {
                return res.status(404).json({
                    message: "Admin not found",
                    adminId: trimmedAdminId
                });
            }
            if (admin.role !== "ADMIN") {
                return res.status(403).json({
                    message: "User is not an admin",
                    adminId: trimmedAdminId,
                    role: admin.role,
                    email: admin.email
                });
            }
            console.log(`Admin verified: ${trimmedAdminId} (${admin.email})`);
        }
        catch (adminError) {
            console.error("Error verifying admin:", adminError);
            return res.status(500).json({
                message: "Failed to verify admin",
                adminId: trimmedAdminId,
                error: adminError.message
            });
        }
        // Validate stock - must be a non-negative number
        if (stock === undefined || stock === null) {
            return res.status(400).json({
                message: "Stock quantity is required",
                received: req.body
            });
        }
        const stockQuantity = Number(stock);
        if (isNaN(stockQuantity) || stockQuantity < 0) {
            return res.status(400).json({
                message: "Stock quantity must be a non-negative number",
                received: { stock, stockType: typeof stock }
            });
        }
        // Find product by productId OR by productName (category is optional)
        let product = null;
        let searchMethod = "";
        if (productId) {
            // Search by productId
            searchMethod = "productId";
            product = await prisma_1.prisma.product.findUnique({
                where: { id: productId },
                include: {
                    variants: {
                        include: {
                            inventory: true
                        }
                    },
                    inventory: true
                }
            });
            if (!product) {
                return res.status(404).json({
                    message: "Product not found",
                    productId,
                    adminId: trimmedAdminId
                });
            }
        }
        else if (productName) {
            // Search by productName (category is optional filter)
            if (category) {
                searchMethod = "productName+category";
                product = await prisma_1.prisma.product.findFirst({
                    where: {
                        name: productName.trim(),
                        category: category.trim()
                    },
                    include: {
                        variants: {
                            include: {
                                inventory: true
                            }
                        },
                        inventory: true
                    }
                });
            }
            else {
                searchMethod = "productName";
                product = await prisma_1.prisma.product.findFirst({
                    where: {
                        name: productName.trim()
                    },
                    include: {
                        variants: {
                            include: {
                                inventory: true
                            }
                        },
                        inventory: true
                    }
                });
            }
            if (!product) {
                return res.status(404).json({
                    message: "Product not found",
                    productName: productName.trim(),
                    category: category ? category.trim() : null,
                    adminId: trimmedAdminId,
                    note: category
                        ? "Make sure the product name and category match exactly"
                        : "Make sure the product name matches exactly. If multiple products have the same name, provide the category."
                });
            }
        }
        else {
            return res.status(400).json({
                message: "Either productName OR productId is required",
                received: req.body,
                requiredFields: ["productName", "productId"]
            });
        }
        console.log(`Product found by ${searchMethod}: ${product.id} (${product.name})`);
        // Determine which inventory to update
        let inventoryToUpdate = null;
        let inventoryType = "";
        if (variantId) {
            // Update variant-specific inventory
            inventoryType = "variant";
            inventoryToUpdate = product.variants
                .find((v) => v.id === variantId)
                ?.inventory?.[0];
            if (!inventoryToUpdate) {
                // Create inventory if it doesn't exist
                const variant = product.variants.find((v) => v.id === variantId);
                if (!variant) {
                    return res.status(404).json({
                        message: "Variant not found",
                        variantId,
                        productId: product.id,
                        adminId: trimmedAdminId
                    });
                }
                inventoryToUpdate = await prisma_1.prisma.inventory.create({
                    data: {
                        variantId: variantId,
                        quantityOnHand: stockQuantity,
                        quantityReserved: 0
                    }
                });
                await prisma_1.prisma.inventoryMovement.create({
                    data: {
                        inventoryId: inventoryToUpdate.id,
                        type: "ADJUST",
                        quantity: stockQuantity,
                        reason: reason || `Initial stock setup for variant`,
                        createdBy: trimmedAdminId
                    }
                });
                return res.json({
                    message: "Stock updated successfully",
                    inventory: {
                        ...inventoryToUpdate,
                        availableStock: stockQuantity,
                        product: {
                            id: product.id,
                            name: product.name,
                            category: product.category
                        },
                        variant: {
                            id: variant.id,
                            sku: variant.sku
                        }
                    },
                    searchMethod,
                    adminId: trimmedAdminId
                });
            }
        }
        else {
            // Update product-level inventory
            inventoryType = "product";
            inventoryToUpdate = product.inventory?.[0];
            if (!inventoryToUpdate) {
                // Create inventory if it doesn't exist
                inventoryToUpdate = await prisma_1.prisma.inventory.create({
                    data: {
                        productId: product.id,
                        quantityOnHand: stockQuantity,
                        quantityReserved: 0
                    }
                });
                await prisma_1.prisma.inventoryMovement.create({
                    data: {
                        inventoryId: inventoryToUpdate.id,
                        type: "ADJUST",
                        quantity: stockQuantity,
                        reason: reason || `Initial stock setup for product`,
                        createdBy: trimmedAdminId
                    }
                });
                return res.json({
                    message: "Stock updated successfully",
                    inventory: {
                        ...inventoryToUpdate,
                        availableStock: stockQuantity,
                        product: {
                            id: product.id,
                            name: product.name,
                            category: product.category
                        },
                        variant: null
                    },
                    searchMethod,
                    adminId: trimmedAdminId
                });
            }
        }
        // Calculate delta (difference between desired quantity and current quantity)
        const quantityDelta = stockQuantity - inventoryToUpdate.quantityOnHand;
        const adjustment = (0, inventoryService_1.adjustInventory)(inventoryToUpdate, quantityDelta);
        // Update inventory
        const updated = await prisma_1.prisma.inventory.update({
            where: { id: inventoryToUpdate.id },
            data: {
                quantityOnHand: adjustment.quantityOnHand
            },
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        category: true,
                        slug: true
                    }
                },
                variant: {
                    select: {
                        id: true,
                        sku: true
                    }
                }
            }
        });
        // Create inventory movement record
        await prisma_1.prisma.inventoryMovement.create({
            data: {
                inventoryId: updated.id,
                type: "ADJUST",
                quantity: quantityDelta,
                reason: reason || `Stock adjustment by admin`,
                createdBy: trimmedAdminId
            }
        });
        const availableStock = updated.quantityOnHand - updated.quantityReserved;
        console.log(`Stock updated successfully: ${product.name} (${product.category}) -> ${stockQuantity} by admin: ${trimmedAdminId}`);
        res.json({
            message: "Stock updated successfully",
            inventory: {
                ...updated,
                availableStock,
                isLowStock: availableStock < 10,
                isOutOfStock: availableStock <= 0,
                previousStock: inventoryToUpdate.quantityOnHand,
                newStock: stockQuantity,
                quantityDelta
            },
            product: {
                id: product.id,
                name: product.name,
                category: product.category,
                slug: product.slug
            },
            searchMethod,
            inventoryType,
            adminId: trimmedAdminId
        });
    }
    catch (error) {
        console.error("Error updating stock:", error);
        res.status(500).json({
            message: "Failed to update stock",
            error: error.message,
            adminId: trimmedAdminId || req.body?.adminId || "unknown"
        });
    }
});
// PUT endpoint to update an existing product - Admin/Agent only
// adminAgentRouter.put(
//   "/update-product",
//   tryRefreshToken,
//   authenticate,
//   requireAdminOrAgent,
//   async (req, res) => {
//     let trimmedAdminId: string | undefined;
//     let productDataRaw: any;
//     try {
//       // Extract adminId, productId, productName, category, stock before validation
//       const { adminId: bodyAdminId, productId, productName, category, stock, ...rest } = req.body;
//       productDataRaw = rest;
//       // Use adminId from body if provided, otherwise use authenticated user's ID from token
//       const adminId = bodyAdminId || req.user?.id;
//       console.log("Update product request received:", { 
//         adminIdFromBody: bodyAdminId, 
//         adminIdFromToken: req.user?.id,
//         adminIdUsed: adminId,
//         productId,
//         productName,
//         category,
//         productData: { ...productDataRaw, stock } 
//       });
//       // Validate request body
//       if (!req.body || typeof req.body !== 'object') {
//         return res.status(400).json({ 
//           message: "Invalid request body. Expected JSON object with productId (or productName + category) and product fields"
//         });
//       }
//       let trimmedProductId: string | undefined;
//       // Find product by productId OR by productName + category
//       if (productId) {
//         // Validate productId format
//         if (typeof productId !== 'string' || productId.trim() === '') {
//           return res.status(400).json({ 
//             message: "Product ID must be a non-empty string",
//             received: { productId, productIdType: typeof productId }
//           });
//         }
//         trimmedProductId = String(productId).trim();
//       } else if (productName && category) {
//         // Find product by name and category
//         if (typeof productName !== 'string' || productName.trim() === '') {
//           return res.status(400).json({ 
//             message: "Product name must be a non-empty string",
//             received: { productName, productNameType: typeof productName }
//           });
//         }
//         if (typeof category !== 'string' || category.trim() === '') {
//           return res.status(400).json({ 
//             message: "Category must be a non-empty string",
//             received: { category, categoryType: typeof category }
//           });
//         }
//         const foundProduct = await prisma.product.findFirst({
//           where: {
//             name: productName.trim(),
//             category: category.trim()
//           },
//           select: { id: true }
//         });
//         if (!foundProduct) {
//           return res.status(404).json({
//             message: "Product not found",
//             productName: productName.trim(),
//             category: category.trim(),
//             searchMethod: "name_and_category"
//           });
//         }
//         trimmedProductId = foundProduct.id;
//         console.log(`Product found by name and category: ${productName} / ${category} -> ID: ${trimmedProductId}`);
//       } else {
//         return res.status(400).json({ 
//           message: "Either productId OR (productName + category) is required",
//           received: req.body,
//           requiredFields: ["productId"] || ["productName", "category"]
//         });
//       }
//       // adminId is REQUIRED (from body or token)
//       if (!adminId) {
//         return res.status(400).json({ 
//           message: "Admin ID is required. Provide it in the request body or ensure you have a valid authentication token.",
//           received: req.body,
//           authenticatedUser: req.user ? { id: req.user.id, role: req.user.role } : null
//         });
//       }
//       // Validate adminId format - must be a non-empty string
//       if (typeof adminId !== 'string' || adminId.trim() === '') {
//         return res.status(400).json({ 
//           message: "Admin ID must be a non-empty string",
//           received: { adminId, adminIdType: typeof adminId }
//         });
//       }
//       trimmedAdminId = String(adminId).trim();
//       // Security check: If adminId is provided in body, it must match the authenticated user's ID
//       if (bodyAdminId && req.user && bodyAdminId !== req.user.id) {
//         return res.status(403).json({
//           message: "Admin ID in request body must match the authenticated user's ID",
//           providedAdminId: bodyAdminId,
//           authenticatedUserId: req.user.id
//         });
//       }
//       // Verify admin exists and is an admin (REQUIRED)
//       try {
//         const admin = await prisma.user.findUnique({
//           where: { id: trimmedAdminId },
//           select: { id: true, role: true, email: true }
//         });
//         if (!admin) {
//           return res.status(404).json({ 
//             message: "Admin not found",
//             adminId: trimmedAdminId
//           });
//         }
//         if (admin.role !== "ADMIN") {
//           return res.status(403).json({ 
//             message: "User is not an admin",
//             adminId: trimmedAdminId,
//             role: admin.role,
//             email: admin.email
//           });
//         }
//         console.log(`Admin verified: ${trimmedAdminId} (${admin.email})`);
//       } catch (adminError: any) {
//         console.error("Error verifying admin:", adminError);
//         return res.status(500).json({
//           message: "Failed to verify admin",
//           adminId: trimmedAdminId,
//           error: adminError.message
//         });
//       }
//       // Check if product exists
//       const existingProduct = await prisma.product.findUnique({
//         where: { id: trimmedProductId },
//         include: { variants: true }
//       });
//       if (!existingProduct) {
//         return res.status(404).json({
//           message: "Product not found",
//           productId: trimmedProductId,
//           adminId: trimmedAdminId
//         });
//       }
//       // Validate product data using ProductInputSchema (if any product fields provided)
//       // Only validate if there are product fields to update (excluding productName and category which are search fields)
//       const fieldsToUpdate = Object.keys(productDataRaw).filter(
//         key => key !== 'productName' && key !== 'category' && key !== 'refreshToken'
//       );
//       if (fieldsToUpdate.length > 0) {
//         // Create a validation object with only the fields that are being updated
//         const fieldsForValidation: any = {};
//         fieldsToUpdate.forEach(key => {
//           if (productDataRaw[key] !== undefined) {
//             fieldsForValidation[key] = productDataRaw[key];
//           }
//         });
//         // Only validate if we have fields that are part of ProductInputSchema
//         const validationResult = ProductInputSchema.safeParse(fieldsForValidation);
//         if (!validationResult.success) {
//           return res.status(400).json({
//             message: "Product validation error",
//             errors: validationResult.error.flatten(),
//             adminId: trimmedAdminId,
//             productId: trimmedProductId
//           });
//         }
//         // Check if slug is being updated and if it conflicts with another product
//         if (productDataRaw.slug && productDataRaw.slug !== existingProduct.slug) {
//           const slugConflict = await prisma.product.findUnique({
//             where: { slug: productDataRaw.slug }
//           });
//           if (slugConflict) {
//             return res.status(400).json({
//               message: `A product with the slug "${productDataRaw.slug}" already exists. Please use a different slug.`,
//               adminId: trimmedAdminId,
//               productId: trimmedProductId
//             });
//           }
//         }
//       }
//       // Prepare update data
//       const updateData: any = {};
//       if (productDataRaw.name !== undefined) updateData.name = productDataRaw.name;
//       if (productDataRaw.slug !== undefined) updateData.slug = productDataRaw.slug;
//       if (productDataRaw.description !== undefined) updateData.description = productDataRaw.description;
//       if (productDataRaw.price !== undefined) updateData.price = productDataRaw.price;
//       if (productDataRaw.cost !== undefined) updateData.cost = productDataRaw.cost || null;
//       if (productDataRaw.currency !== undefined) updateData.currency = productDataRaw.currency;
//       if (productDataRaw.images !== undefined) updateData.images = productDataRaw.images;
//       if (productDataRaw.category !== undefined) updateData.category = productDataRaw.category;
//       if (productDataRaw.tags !== undefined) updateData.tags = productDataRaw.tags;
//       if (productDataRaw.status !== undefined) updateData.status = productDataRaw.status;
//       // Update product
//       const updatedProduct = await prisma.product.update({
//         where: { id: trimmedProductId },
//         data: updateData,
//         include: { variants: true }
//       });
//       // Update inventory if stock is provided
//       if (stock !== undefined) {
//         const stockQuantity = parseInt(String(stock));
//         if (updatedProduct.variants.length > 0) {
//           // Update inventory for each variant
//           for (const variant of updatedProduct.variants) {
//             const existingInventory = await prisma.inventory.findFirst({
//               where: { variantId: variant.id }
//             });
//             if (existingInventory) {
//               await prisma.inventory.update({
//                 where: { id: existingInventory.id },
//                 data: {
//                   quantityOnHand: stockQuantity,
//                   // Keep quantityReserved as is
//                 }
//               });
//             } else {
//               await prisma.inventory.create({
//                 data: {
//                   variantId: variant.id,
//                   quantityOnHand: stockQuantity,
//                   quantityReserved: 0
//                 }
//               });
//             }
//           }
//         } else {
//           // Update product-level inventory
//           const existingInventory = await prisma.inventory.findFirst({
//             where: { 
//               productId: trimmedProductId,
//               variantId: null
//             }
//           });
//           if (existingInventory) {
//             await prisma.inventory.update({
//               where: { id: existingInventory.id },
//               data: {
//                 quantityOnHand: stockQuantity,
//                 // Keep quantityReserved as is
//               }
//             });
//           } else {
//             await prisma.inventory.create({
//               data: {
//                 productId: trimmedProductId,
//                 quantityOnHand: stockQuantity,
//                 quantityReserved: 0
//               }
//             });
//           }
//         }
//       }
//       console.log(`Product updated successfully: ${updatedProduct.id} by admin: ${trimmedAdminId}`);
//       res.json({
//         ...updatedProduct,
//         adminId: trimmedAdminId
//       });
//     } catch (error: any) {
//       console.error("Error updating product:", error);
//       // Handle Prisma unique constraint errors
//       if (error.code === "P2002") {
//         if (error.meta?.target?.includes("slug")) {
//           return res.status(400).json({
//             message: `A product with the slug "${productDataRaw?.slug || req.body?.slug || 'unknown'}" already exists. Please use a different slug.`,
//             adminId: trimmedAdminId || req.body?.adminId,
//             productId: req.body?.productId
//           });
//         }
//         if (error.meta?.target?.includes("sku")) {
//           return res.status(400).json({
//             message: `A variant with the SKU "${error.meta.target}" already exists. Please use a different SKU.`,
//             adminId: trimmedAdminId || req.body?.adminId,
//             productId: req.body?.productId
//           });
//         }
//       }
//       // Handle Prisma record not found
//       if (error.code === "P2025") {
//         return res.status(404).json({
//           message: "Product not found",
//           productId: req.body?.productId,
//           adminId: trimmedAdminId || req.body?.adminId
//         });
//       }
//       res.status(500).json({
//         message: "Failed to update product",
//         error: error.message,
//         adminId: trimmedAdminId || req.body?.adminId || "unknown",
//         productId: req.body?.productId || "unknown"
//       });
//     }
//   }
// );
