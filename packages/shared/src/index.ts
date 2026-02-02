import { z } from "zod";

export const RoleEnum = z.enum(["ADMIN", "CUSTOMER"]);
export type Role = z.infer<typeof RoleEnum>;

export const ProductStatusEnum = z.enum(["ACTIVE", "DRAFT"]);
export type ProductStatus = z.infer<typeof ProductStatusEnum>;

export const OrderStatusEnum = z.enum([
  "PENDING",
  "PAID",
  "CANCELLED",
  "FULFILLED",
  "REFUNDED"
]);
export type OrderStatus = z.infer<typeof OrderStatusEnum>;

export const InventoryMovementTypeEnum = z.enum([
  "IN",
  "OUT",
  "ADJUST",
  "RESERVE",
  "RELEASE"
]);
export type InventoryMovementType = z.infer<typeof InventoryMovementTypeEnum>;

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2)
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const ProductInputSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  description: z.string().min(10),
  price: z.number().positive(),
  currency: z.string().min(3),
  images: z.array(z.string().url()).default([]),
  category: z.string().min(2),
  tags: z.array(z.string()).default([]),
  status: ProductStatusEnum.default("DRAFT"),
  variants: z
    .array(
      z.object({
        sku: z.string().min(2),
        attributes: z.record(z.string()),
        priceOverride: z.number().positive().optional()
      })
    )
    .optional()
});

export const InventoryAdjustSchema = z.object({
  productId: z.string().uuid().optional(),
  variantId: z.string().uuid().optional(),
  quantity: z.number().int(),
  reason: z.string().min(2)
});

export const CartItemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  quantity: z.number().int().positive()
});

export const CheckoutSchema = z.object({
  paymentMethod: z.string().default("SIMULATED")
});
