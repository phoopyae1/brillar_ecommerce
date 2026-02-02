"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reserveCart = reserveCart;
exports.checkoutOrder = checkoutOrder;
const inventoryService_1 = require("./inventoryService");
function reserveCart(inventories, items) {
    const updated = { ...inventories };
    for (const item of items) {
        const inventory = updated[item.inventoryId];
        if (!inventory) {
            throw new Error("Inventory not found");
        }
        const adjustment = (0, inventoryService_1.reserveInventory)(inventory, item.quantity);
        updated[item.inventoryId] = { ...inventory, ...adjustment };
    }
    return updated;
}
function checkoutOrder(inventories, items) {
    let total = 0;
    const updated = { ...inventories };
    for (const item of items) {
        total += item.price * item.quantity;
        const inventory = updated[item.inventoryId];
        if (!inventory) {
            throw new Error("Inventory not found");
        }
        const adjustment = (0, inventoryService_1.consumeInventory)(inventory, item.quantity);
        updated[item.inventoryId] = { ...inventory, ...adjustment };
    }
    return { total, inventories: updated };
}
