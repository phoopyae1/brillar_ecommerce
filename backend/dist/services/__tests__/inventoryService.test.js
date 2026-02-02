"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const inventoryService_1 = require("../inventoryService");
describe("inventoryService", () => {
    it("reserves inventory when available", () => {
        const result = (0, inventoryService_1.reserveInventory)({ id: "inv1", quantityOnHand: 10, quantityReserved: 2 }, 3);
        expect(result.quantityReserved).toBe(5);
    });
    it("prevents overselling", () => {
        expect(() => (0, inventoryService_1.reserveInventory)({ id: "inv1", quantityOnHand: 5, quantityReserved: 4 }, 2)).toThrow("Insufficient inventory");
    });
    it("releases reserved inventory", () => {
        const result = (0, inventoryService_1.releaseInventory)({ id: "inv1", quantityOnHand: 10, quantityReserved: 5 }, 2);
        expect(result.quantityReserved).toBe(3);
    });
    it("consumes inventory on checkout", () => {
        const result = (0, inventoryService_1.consumeInventory)({ id: "inv1", quantityOnHand: 10, quantityReserved: 5 }, 4);
        expect(result.quantityOnHand).toBe(6);
        expect(result.quantityReserved).toBe(1);
    });
    it("adjusts inventory with guardrails", () => {
        const result = (0, inventoryService_1.adjustInventory)({ id: "inv1", quantityOnHand: 10, quantityReserved: 0 }, -3);
        expect(result.quantityOnHand).toBe(7);
    });
});
