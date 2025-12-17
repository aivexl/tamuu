import { Router } from "express";
import https from "https";
import fetch from "node-fetch"; // You might need to install node-fetch if Node < 18 or types issues

// Note: Node 18+ has native fetch. If using older Node, allow 'any' or use node-fetch.
// Since we are using typescript, we might need type definitions if global fetch isn't recognized.
// Assuming Node 18+ environment for native fetch.

export const proxyImageRouter = Router();

const ALLOWED_DOMAINS = [
    "pub-1e0a9ae6152440268987d00a564a8da5.r2.dev",
    "r2.cloudflarestorage.com",
];

const CACHE_MAX_AGE = 86400;

proxyImageRouter.get("/", async (req, res) => {
    try {
        const imageUrl = req.query.url as string;

        if (!imageUrl) {
            res.status(400).json({ error: "Missing url parameter" });
            return;
        }

        let parsedUrl: URL;
        try {
            parsedUrl = new URL(imageUrl);
        } catch {
            res.status(400).json({ error: "Invalid URL format" });
            return;
        }

        const isAllowed = ALLOWED_DOMAINS.some(
            (domain) =>
                parsedUrl.hostname === domain ||
                parsedUrl.hostname.endsWith("." + domain)
        );

        if (!isAllowed) {
            console.warn("🚫 Blocked proxy request for:", parsedUrl.hostname);
            res.status(403).json({ error: "Domain not allowed" });
            return;
        }

        // Development SSL bypass logic
        if (process.env.NODE_ENV === "development") {
            const agent = new https.Agent({
                rejectUnauthorized: false,
            });

            https
                .get(imageUrl, { agent }, (proxyRes) => {
                    if (proxyRes.statusCode !== 200) {
                        res
                            .status(proxyRes.statusCode || 500)
                            .json({ error: `HTTP ${proxyRes.statusCode}` });
                        return;
                    }

                    const contentType =
                        proxyRes.headers["content-type"] || "application/octet-stream";

                    res.set({
                        "Content-Type": contentType,
                        "Cache-Control": `public, max-age=${CACHE_MAX_AGE}, stale-while-revalidate=${CACHE_MAX_AGE * 2}`,
                        "Access-Control-Allow-Origin": "*",
                        "X-Proxy-Cache": "DEV-SSL-BYPASS",
                    });

                    proxyRes.pipe(res);
                })
                .on("error", (err) => {
                    console.error("Proxy error:", err);
                    res.status(500).json({ error: "Proxy failed" });
                });
            return;
        }

        // Production fetch
        const response = await fetch(imageUrl, {
            headers: {
                "User-Agent": "Express Image Proxy",
            },
        });

        if (!response.ok) {
            res.status(response.status).json({ error: `Failed to fetch image: ${response.status}` });
            return;
        }

        const contentType = response.headers.get("content-type") || "image/jpeg";
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        res.set({
            "Content-Type": contentType,
            "Cache-Control": `public, max-age=${CACHE_MAX_AGE}, stale-while-revalidate=${CACHE_MAX_AGE * 2}`,
            "Access-Control-Allow-Origin": "*",
            "X-Proxy-Cache": "HIT",
        });

        res.send(buffer);

    } catch (error) {
        console.error("💥 Image proxy error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
