import { consumeInventory, reserveInventory } from "./inventoryService";

export type OrderItemInput = {
  inventoryId: string;
  quantity: number;
  price: number;
};

export type InventoryState = {
  id: string;
  quantityOnHand: number;
  quantityReserved: number;
};

export function reserveCart(
  inventories: Record<string, InventoryState>,
  items: OrderItemInput[]
) {
  const updated: Record<string, InventoryState> = { ...inventories };
  for (const item of items) {
    const inventory = updated[item.inventoryId];
    if (!inventory) {
      throw new Error("Inventory not found");
    }
    const adjustment = reserveInventory(inventory, item.quantity);
    updated[item.inventoryId] = { ...inventory, ...adjustment };
  }
  return updated;
}

export function checkoutOrder(
  inventories: Record<string, InventoryState>,
  items: OrderItemInput[]
) {
  let total = 0;
  const updated: Record<string, InventoryState> = { ...inventories };
  for (const item of items) {
    total += item.price * item.quantity;
    const inventory = updated[item.inventoryId];
    if (!inventory) {
      throw new Error("Inventory not found");
    }
    const adjustment = consumeInventory(inventory, item.quantity);
    updated[item.inventoryId] = { ...inventory, ...adjustment };
  }
  return { total, inventories: updated };
}
