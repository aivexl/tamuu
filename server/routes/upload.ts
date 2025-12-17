import { Router } from "express";
import multer from "multer";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export const uploadRouter = Router();

// Multer setup for handling multipart/form-data
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

// R2 Client
const r2Client = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    },
});

uploadRouter.post("/", upload.single("file"), async (req, res) => {
    try {
        const file = req.file;

        if (!file) {
            res.status(400).json({ error: "No file uploaded" });
            return;
        }

        const allowedTypes = [
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp",
            "image/gif",
            "video/mp4",
            "video/webm",
            "video/ogg",
        ];
        if (!allowedTypes.includes(file.mimetype)) {
            res.status(400).json({ error: "File type not allowed" });
            return;
        }

        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(7);
        const extension = file.originalname.split(".").pop();
        const filename = `${timestamp}-${randomString}.${extension}`;

        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const key = `photos/${year}/${month}/${filename}`;

        const uploadCommand = new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME!,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
            CacheControl: "public, max-age=31536000, immutable",
        });

        await r2Client.send(uploadCommand);

        const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;

        res.json({
            success: true,
            url: publicUrl,
            key: key,
            filename: filename,
            size: file.size,
            type: file.mimetype,
        });
    } catch (error: any) {
        console.error("Upload error:", error);
        res.status(500).json({
            error: "Upload failed",
            details: error.message || "Unknown error",
        });
    }
});
