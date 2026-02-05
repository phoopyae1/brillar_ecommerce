"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadRouter = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const auth_1 = require("../middleware/auth");
exports.uploadRouter = (0, express_1.Router)();
// Ensure uploads directory exists
const uploadsDir = path_1.default.join(process.cwd(), "uploads");
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
// Configure multer storage
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, `product-${uniqueSuffix}${ext}`);
    }
});
// File filter for images only
const fileFilter = (req, file, cb) => {
    const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error("Invalid file type. Only JPEG, PNG, WEBP, and GIF images are allowed."));
    }
};
const upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});
// Helper function to handle multer errors
const handleMulterError = (err, res) => {
    if (err instanceof multer_1.default.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({ message: "File too large. Maximum size is 5MB." });
        }
        if (err.code === "LIMIT_FILE_COUNT") {
            return res.status(400).json({ message: "Too many files. Maximum is 10 files." });
        }
        if (err.code === "LIMIT_UNEXPECTED_FILE") {
            return res.status(400).json({ message: "Unexpected file field name." });
        }
        return res.status(400).json({ message: err.message || "File upload error" });
    }
    // Handle file filter errors and other errors
    return res.status(400).json({ message: err.message || "File upload error" });
};
// Upload single image
exports.uploadRouter.post("/image", auth_1.authenticate, (0, auth_1.requireRole)("ADMIN"), (req, res, next) => {
    upload.single("image")(req, res, (err) => {
        if (err) {
            return handleMulterError(err, res);
        }
        next();
    });
}, (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
    }
    // Return the URL path for the uploaded file
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({
        url: fileUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size
    });
});
// Upload multiple images
exports.uploadRouter.post("/images", auth_1.authenticate, (0, auth_1.requireRole)("ADMIN"), (req, res, next) => {
    upload.array("images", 10)(req, res, (err) => {
        if (err) {
            return handleMulterError(err, res);
        }
        next();
    });
}, (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
    }
    const files = req.files;
    const uploadedFiles = files.map((file) => ({
        url: `/uploads/${file.filename}`,
        filename: file.filename,
        originalName: file.originalname,
        size: file.size
    }));
    res.json({
        files: uploadedFiles
    });
});
