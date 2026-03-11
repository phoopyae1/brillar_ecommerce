"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FaqSchema = exports.CheckoutSchema = exports.CartItemSchema = exports.InventoryAdjustSchema = exports.ProductInputSchema = exports.LoginSchema = exports.RegisterSchema = exports.InventoryMovementTypeEnum = exports.OrderStatusEnum = exports.ProductStatusEnum = exports.RoleEnum = void 0;
const zod_1 = require("zod");
exports.RoleEnum = zod_1.z.enum(["ADMIN", "CUSTOMER"]);
exports.ProductStatusEnum = zod_1.z.enum(["ACTIVE", "DRAFT"]);
exports.OrderStatusEnum = zod_1.z.enum([
    "PENDING",
    "PAID",
    "PREPARING_TO_SHIP",
    "READY_TO_SHIP",
    "CANCELLED",
    "FULFILLED",
    "REFUNDED"
]);
exports.InventoryMovementTypeEnum = zod_1.z.enum([
    "IN",
    "OUT",
    "ADJUST",
    "RESERVE",
    "RELEASE"
]);
exports.RegisterSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8),
    name: zod_1.z.string().min(2)
});
exports.LoginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8)
});
exports.ProductInputSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    slug: zod_1.z.string().min(2),
    description: zod_1.z.string().min(10),
    price: zod_1.z.number().positive(),
    cost: zod_1.z.number().positive().optional(), // Purchase cost for profit calculation
    currency: zod_1.z.string().min(3),
    images: zod_1.z.array(zod_1.z.string().url()).default([]),
    category: zod_1.z.string().min(2),
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    status: exports.ProductStatusEnum.default("DRAFT"),
    variants: zod_1.z
        .array(zod_1.z.object({
        sku: zod_1.z.string().min(2),
        attributes: zod_1.z.record(zod_1.z.string()),
        priceOverride: zod_1.z.number().positive().optional()
    }))
        .optional()
});
exports.InventoryAdjustSchema = zod_1.z.object({
    productId: zod_1.z.string().uuid().optional(),
    variantId: zod_1.z.string().uuid().optional(),
    quantity: zod_1.z.number().int(),
    reason: zod_1.z.string().min(2)
});
exports.CartItemSchema = zod_1.z.object({
    productId: zod_1.z.string().uuid(),
    variantId: zod_1.z.string().uuid().optional(),
    quantity: zod_1.z.number().int().positive()
});
exports.CheckoutSchema = zod_1.z.object({
    paymentMethod: zod_1.z.string().default("SIMULATED")
});
exports.FaqSchema = zod_1.z.object({
    question: zod_1.z.string().min(1, "Question is required"),
    answer: zod_1.z.string().min(1, "Answer is required"),
    category: zod_1.z.string().optional().nullable(),
    order: zod_1.z.number().int().min(0).default(0),
    isActive: zod_1.z.boolean().default(true)
});
