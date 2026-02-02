"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateAvailable = calculateAvailable;
exports.reserveInventory = reserveInventory;
exports.releaseInventory = releaseInventory;
exports.consumeInventory = consumeInventory;
exports.adjustInventory = adjustInventory;
function calculateAvailable(inventory) {
    return inventory.quantityOnHand - inventory.quantityReserved;
}
function reserveInventory(inventory, quantity) {
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
function releaseInventory(inventory, quantity) {
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
function consumeInventory(inventory, quantity) {
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
function adjustInventory(inventory, quantityDelta) {
    const nextOnHand = inventory.quantityOnHand + quantityDelta;
    if (nextOnHand < 0) {
        throw new Error("On-hand inventory cannot be negative");
    }
    return {
        quantityOnHand: nextOnHand,
        quantityReserved: inventory.quantityReserved
    };
}
