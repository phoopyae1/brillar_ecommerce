import { z } from "zod";
export declare const RoleEnum: z.ZodEnum<["ADMIN", "CUSTOMER"]>;
export type Role = z.infer<typeof RoleEnum>;
export declare const ProductStatusEnum: z.ZodEnum<["ACTIVE", "DRAFT"]>;
export type ProductStatus = z.infer<typeof ProductStatusEnum>;
export declare const OrderStatusEnum: z.ZodEnum<["PENDING", "PAID", "CANCELLED", "FULFILLED", "REFUNDED"]>;
export type OrderStatus = z.infer<typeof OrderStatusEnum>;
export declare const InventoryMovementTypeEnum: z.ZodEnum<["IN", "OUT", "ADJUST", "RESERVE", "RELEASE"]>;
export type InventoryMovementType = z.infer<typeof InventoryMovementTypeEnum>;
export declare const RegisterSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    name: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    name: string;
}, {
    email: string;
    password: string;
    name: string;
}>;
export declare const LoginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const ProductInputSchema: z.ZodObject<{
    name: z.ZodString;
    slug: z.ZodString;
    description: z.ZodString;
    price: z.ZodNumber;
    currency: z.ZodString;
    images: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    category: z.ZodString;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    status: z.ZodDefault<z.ZodEnum<["ACTIVE", "DRAFT"]>>;
    variants: z.ZodOptional<z.ZodArray<z.ZodObject<{
        sku: z.ZodString;
        attributes: z.ZodRecord<z.ZodString, z.ZodString>;
        priceOverride: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        sku: string;
        attributes: Record<string, string>;
        priceOverride?: number | undefined;
    }, {
        sku: string;
        attributes: Record<string, string>;
        priceOverride?: number | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    status: "ACTIVE" | "DRAFT";
    name: string;
    slug: string;
    description: string;
    price: number;
    currency: string;
    images: string[];
    category: string;
    tags: string[];
    variants?: {
        sku: string;
        attributes: Record<string, string>;
        priceOverride?: number | undefined;
    }[] | undefined;
}, {
    name: string;
    slug: string;
    description: string;
    price: number;
    currency: string;
    category: string;
    status?: "ACTIVE" | "DRAFT" | undefined;
    images?: string[] | undefined;
    tags?: string[] | undefined;
    variants?: {
        sku: string;
        attributes: Record<string, string>;
        priceOverride?: number | undefined;
    }[] | undefined;
}>;
export declare const InventoryAdjustSchema: z.ZodObject<{
    productId: z.ZodOptional<z.ZodString>;
    variantId: z.ZodOptional<z.ZodString>;
    quantity: z.ZodNumber;
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    quantity: number;
    reason: string;
    productId?: string | undefined;
    variantId?: string | undefined;
}, {
    quantity: number;
    reason: string;
    productId?: string | undefined;
    variantId?: string | undefined;
}>;
export declare const CartItemSchema: z.ZodObject<{
    productId: z.ZodString;
    variantId: z.ZodOptional<z.ZodString>;
    quantity: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    productId: string;
    quantity: number;
    variantId?: string | undefined;
}, {
    productId: string;
    quantity: number;
    variantId?: string | undefined;
}>;
export declare const CheckoutSchema: z.ZodObject<{
    paymentMethod: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    paymentMethod: string;
}, {
    paymentMethod?: string | undefined;
}>;
