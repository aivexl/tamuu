import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { NextRequest, NextResponse } from 'next/server';

const r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
});

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/ogg'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ error: 'File type not allowed' }, { status: 400 });
        }

        const maxSize = 50 * 1024 * 1024; // 50MB for videos
        if (file.size > maxSize) {
            return NextResponse.json({ error: `File too large. Max ${maxSize / (1024 * 1024)}MB` }, { status: 400 });
        }

        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(7);
        const extension = file.name.split('.').pop();
        const filename = `${timestamp}-${randomString}.${extension}`;

        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const key = `photos/${year}/${month}/${filename}`;

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const uploadCommand = new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME!,
            Key: key,
            Body: buffer,
            ContentType: file.type,
            CacheControl: 'public, max-age=31536000, immutable',
        });

        await r2Client.send(uploadCommand);

        const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;

        return NextResponse.json({
            success: true,
            url: publicUrl,
            key: key,
            filename: filename,
            size: file.size,
            type: file.type,
        });

    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { error: 'Upload failed', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

export async function GET() {
    return NextResponse.json({
        message: 'R2 Upload endpoint ready',
        status: 'ok'
    });
}