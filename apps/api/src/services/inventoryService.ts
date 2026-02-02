export type InventoryRecord = {
  id: string;
  quantityOnHand: number;
  quantityReserved: number;
};

export type InventoryAdjustment = {
  quantityOnHand: number;
  quantityReserved: number;
};

export function calculateAvailable(inventory: InventoryRecord) {
  return inventory.quantityOnHand - inventory.quantityReserved;
}

export function reserveInventory(
  inventory: InventoryRecord,
  quantity: number
): InventoryAdjustment {
  if (quantity <= 0) {
    throw new Error("Quantity must be positive");
  }
  const available = calculateAvailable(inventory);
  if (available < quantity) {
    throw new Error("Insufficient inventory");
  }
  return {
    quantityOnHand: inventory.quantityOnHand,
    quantityReserved: inventory.quantityReserved + quantity
  };
}

export function releaseInventory(
  inventory: InventoryRecord,
  quantity: number
): InventoryAdjustment {
  if (quantity <= 0) {
    throw new Error("Quantity must be positive");
  }
  if (inventory.quantityReserved < quantity) {
    throw new Error("Reserved inventory too low");
  }
  return {
    quantityOnHand: inventory.quantityOnHand,
    quantityReserved: inventory.quantityReserved - quantity
  };
}

export function consumeInventory(
  inventory: InventoryRecord,
  quantity: number
): InventoryAdjustment {
  if (quantity <= 0) {
    throw new Error("Quantity must be positive");
  }
  if (inventory.quantityReserved < quantity) {
    throw new Error("Reserved inventory too low");
  }
  if (inventory.quantityOnHand < quantity) {
    throw new Error("On-hand inventory too low");
  }
  return {
    quantityOnHand: inventory.quantityOnHand - quantity,
    quantityReserved: inventory.quantityReserved - quantity
  };
}

export function adjustInventory(
  inventory: InventoryRecord,
  quantityDelta: number
): InventoryAdjustment {
  const nextOnHand = inventory.quantityOnHand + quantityDelta;
  if (nextOnHand < 0) {
    throw new Error("On-hand inventory cannot be negative");
  }
  return {
    quantityOnHand: nextOnHand,
    quantityReserved: inventory.quantityReserved
  };
}
