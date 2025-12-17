// app/test-upload/page.tsx
'use client';

import { useState } from 'react';

interface UploadedFile {
    url: string;
    filename: string;
    size: number;
    type: string;
}

export default function TestUploadPage() {
    const [uploading, setUploading] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [error, setError] = useState('');
    const [progress, setProgress] = useState(0);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setError('');
        setProgress(0);

        try {
            const formData = new FormData();
            formData.append('file', file);

            // Simulate progress
            const progressInterval = setInterval(() => {
                setProgress(prev => Math.min(prev + 10, 90));
            }, 200);

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            clearInterval(progressInterval);
            setProgress(100);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Upload failed');
            }

            const data = await response.json();

            setUploadedFiles(prev => [...prev, {
                url: data.url,
                filename: data.filename,
                size: data.size,
                type: data.type,
            }]);

            // Reset input
            e.target.value = '';

            setTimeout(() => setProgress(0), 1000);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Upload failed');
            console.error('Upload error:', err);
            setProgress(0);
        } finally {
            setUploading(false);
        }
    };

    const copyToClipboard = (url: string) => {
        navigator.clipboard.writeText(url);
        alert('URL copied to clipboard!');
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
            <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-gray-800 mb-2">
                            🚀 R2 Upload Test
                        </h1>
                        <p className="text-gray-600">
                            Test upload foto/video ke Cloudflare R2
                        </p>
                    </div>

                    {/* Upload Area */}
                    <label className="block">
                        <input
                            type="file"
                            accept="image/*,video/mp4,video/webm"
                            onChange={handleFileChange}
                            disabled={uploading}
                            className="hidden"
                        />
                        <div className={`
              border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
              transition-all duration-200
              ${uploading
                                ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
                                : 'border-blue-400 hover:border-blue-600 hover:bg-blue-50'
                            }
            `}>
                            {uploading ? (
                                <div className="flex flex-col items-center gap-4">
                                    <div className="relative w-16 h-16">
                                        <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
                                        <div
                                            className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"
                                            style={{ animationDuration: '1s' }}
                                        ></div>
                                    </div>
                                    <p className="text-gray-600 font-medium">Uploading...</p>
                                    <div className="w-full max-w-xs bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${progress}%` }}
                                        ></div>
                                    </div>
                                    <p className="text-sm text-gray-500">{progress}%</p>
                                </div>
                            ) : (
                                <div>
                                    <svg
                                        className="mx-auto h-16 w-16 text-blue-400 mb-4"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                        />
                                    </svg>
                                    <p className="text-lg text-gray-700 font-medium mb-2">
                                        Klik untuk pilih file
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        Foto: Max 10MB • Video: Max 50MB
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        JPEG, PNG, WebP, GIF, MP4, WebM
                                    </p>
                                </div>
                            )}
                        </div>
                    </label>

                    {/* Error Message */}
                    {error && (
                        <div className="mt-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
                            <div className="flex items-start">
                                <svg className="w-5 h-5 text-red-500 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                <div>
                                    <p className="text-red-800 font-medium">Upload Error</p>
                                    <p className="text-red-700 text-sm mt-1">{error}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Uploaded Files */}
                    {uploadedFiles.length > 0 && (
                        <div className="mt-8">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                                <svg className="w-5 h-5 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                File yang berhasil diupload ({uploadedFiles.length})
                            </h3>
                            <div className="space-y-3">
                                {uploadedFiles.map((file, idx) => (
                                    <div
                                        key={idx}
                                        className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border border-green-200"
                                    >
                                        <div className="flex items-start gap-4">
                                            {/* Preview */}
                                            <div className="flex-shrink-0">
                                                {file.type.startsWith('image/') ? (
                                                    <img
                                                        src={file.url}
                                                        alt={file.filename}
                                                        className="w-20 h-20 object-cover rounded-lg border-2 border-white shadow"
                                                    />
                                                ) : (
                                                    <video
                                                        src={file.url}
                                                        className="w-20 h-20 object-cover rounded-lg border-2 border-white shadow"
                                                    />
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-grow min-w-0">
                                                <p className="font-medium text-gray-800 truncate">
                                                    {file.filename}
                                                </p>
                                                <p className="text-sm text-gray-600 mt-1">
                                                    {formatFileSize(file.size)} • {file.type}
                                                </p>
                                                <div className="mt-2 flex gap-2">
                                                    <button
                                                        onClick={() => copyToClipboard(file.url)}
                                                        className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-full transition-colors"
                                                    >
                                                        📋 Copy URL
                                                    </button>
                                                    <a
                                                        href={file.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-full transition-colors"
                                                    >
                                                        🔗 Open
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Info Box */}
                    <div className="mt-8 p-6 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl text-white">
                        <div className="flex items-start gap-3">
                            <svg className="w-6 h-6 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            <div>
                                <p className="font-semibold text-lg mb-2">✅ R2 Storage Active!</p>
                                <ul className="text-sm space-y-1 text-blue-100">
                                    <li>• File disimpan di Cloudflare R2</li>
                                    <li>• Unlimited bandwidth (FREE egress!)</li>
                                    <li>• Load cepat via CDN global</li>
                                    <li>• Bucket: tamuu-storage</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}