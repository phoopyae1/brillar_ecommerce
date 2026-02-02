import { checkoutOrder, reserveCart } from "../orderService";

describe("orderService", () => {
  it("reserves all cart items", () => {
    const inventories = {
      inv1: { id: "inv1", quantityOnHand: 10, quantityReserved: 0 },
      inv2: { id: "inv2", quantityOnHand: 5, quantityReserved: 1 }
    };
    const updated = reserveCart(inventories, [
      { inventoryId: "inv1", quantity: 2, price: 10 },
      { inventoryId: "inv2", quantity: 1, price: 15 }
    ]);
    expect(updated.inv1.quantityReserved).toBe(2);
    expect(updated.inv2.quantityReserved).toBe(2);
  });

  it("calculates totals and consumes inventory", () => {
    const inventories = {
      inv1: { id: "inv1", quantityOnHand: 10, quantityReserved: 2 }
    };
    const result = checkoutOrder(inventories, [
      { inventoryId: "inv1", quantity: 2, price: 50 }
    ]);
    expect(result.total).toBe(100);
    expect(result.inventories.inv1.quantityOnHand).toBe(8);
    expect(result.inventories.inv1.quantityReserved).toBe(0);
  });
});
