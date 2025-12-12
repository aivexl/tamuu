'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTemplateStore } from '@/lib/template-store';
import { ClientOnly } from '@/components/ClientOnly';
import { Eye, Sparkles, ArrowRight } from 'lucide-react';

export default function TemplateStorePage() {
    const templates = useTemplateStore((state) => state.templates);
    const fetchTemplatesBasic = useTemplateStore((state) => state.fetchTemplatesBasic);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchTemplatesBasic().then(() => setIsLoading(false));
    }, [fetchTemplatesBasic]);

    // Filter only published templates
    const publishedTemplates = templates.filter((t) => t.status === 'published');

    return (
        <ClientOnly>
            <div className="min-h-screen bg-gradient-to-br from-teal-50 via-blue-50 to-purple-50">
                {/* Hero Header */}
                <header className="relative overflow-hidden">
                    <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
                    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-md rounded-full border border-teal-200 shadow-lg mb-6">
                            <Sparkles className="w-4 h-4 text-teal-600" />
                            <span className="text-sm font-medium text-teal-700">Koleksi Template Premium</span>
                        </div>
                        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4">
                            Template Store
                        </h1>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                            Temukan template undangan digital yang indah dan profesional.
                            Pilih desain sempurna untuk acara spesial Anda.
                        </p>
                    </div>
                </header>

                {/* Template Grid */}
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="flex items-center gap-3">
                                <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-gray-600 text-lg">Memuat template...</span>
                            </div>
                        </div>
                    ) : publishedTemplates.length === 0 ? (
                        <div className="text-center py-20">
                            <p className="text-gray-600 text-lg mb-4">Belum ada template tersedia.</p>
                            <p className="text-gray-500 text-sm">Segera hadir dengan desain-desain menarik!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {publishedTemplates.map((template) => (
                                <div
                                    key={template.id}
                                    className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 transition-all duration-300 hover:shadow-xl hover:shadow-gray-200/50 hover:-translate-y-1"
                                >
                                    {/* Thumbnail Container */}
                                    <div className="relative aspect-[3/4] overflow-hidden">
                                        <Image
                                            src={template.thumbnail}
                                            alt={template.name}
                                            fill
                                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                                            unoptimized
                                        />
                                    </div>

                                    {/* Info Section */}
                                    <div className="p-4">
                                        <h3 className="font-medium text-base text-gray-900 mb-0.5">
                                            {template.name}
                                        </h3>
                                        <p className="text-xs text-gray-400 mb-3">
                                            Desain Modern
                                        </p>

                                        {/* Action Buttons - Always visible */}
                                        <div className="flex gap-2">
                                            <Link
                                                href={`/preview/${template.id}`}
                                                className="flex-1 py-2 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 hover:bg-gray-200 transition-colors"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                Preview
                                            </Link>
                                            <button
                                                onClick={() => alert('Fitur ini akan segera hadir!')}
                                                className="flex-1 py-2 px-3 bg-teal-500 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 hover:bg-teal-600 transition-colors"
                                            >
                                                Gunakan
                                                <ArrowRight className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </main>

                {/* Footer */}
                <footer className="border-t border-gray-200 py-8 text-center bg-white/50">
                    <p className="text-gray-500 text-sm">
                        © {new Date().getFullYear()} Digital Invitation Platform. All rights reserved.
                    </p>
                </footer>
            </div>
        </ClientOnly>
    );
}
