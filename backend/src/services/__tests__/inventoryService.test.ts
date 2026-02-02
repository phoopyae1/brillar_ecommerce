import {
  adjustInventory,
  consumeInventory,
  releaseInventory,
  reserveInventory
} from "../inventoryService";

describe("inventoryService", () => {
  it("reserves inventory when available", () => {
    const result = reserveInventory(
      { id: "inv1", quantityOnHand: 10, quantityReserved: 2 },
      3
    );
    expect(result.quantityReserved).toBe(5);
  });

  it("prevents overselling", () => {
    expect(() =>
      reserveInventory(
        { id: "inv1", quantityOnHand: 5, quantityReserved: 4 },
        2
      )
    ).toThrow("Insufficient inventory");
  });

  it("releases reserved inventory", () => {
    const result = releaseInventory(
      { id: "inv1", quantityOnHand: 10, quantityReserved: 5 },
      2
    );
    expect(result.quantityReserved).toBe(3);
  });

  it("consumes inventory on checkout", () => {
    const result = consumeInventory(
      { id: "inv1", quantityOnHand: 10, quantityReserved: 5 },
      4
    );
    expect(result.quantityOnHand).toBe(6);
    expect(result.quantityReserved).toBe(1);
  });

  it("adjusts inventory with guardrails", () => {
    const result = adjustInventory(
      { id: "inv1", quantityOnHand: 10, quantityReserved: 0 },
      -3
    );
    expect(result.quantityOnHand).toBe(7);
  });
});
