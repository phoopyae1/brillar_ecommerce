"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectMongoDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const config_1 = require("./config");
let isConnected = false;
const connectMongoDB = async () => {
    if (isConnected) {
        console.log("MongoDB already connected");
        return;
    }
    try {
        await mongoose_1.default.connect(config_1.config.mongodbUri);
        isConnected = true;
        console.log("MongoDB connected successfully");
    }
    catch (error) {
        console.error("MongoDB connection error:", error);
        throw error;
    }
};
exports.connectMongoDB = connectMongoDB;
// Handle connection events
mongoose_1.default.connection.on("error", (err) => {
    console.error("MongoDB connection error:", err);
    isConnected = false;
});
mongoose_1.default.connection.on("disconnected", () => {
    console.log("MongoDB disconnected");
    isConnected = false;
});
exports.default = mongoose_1.default;
