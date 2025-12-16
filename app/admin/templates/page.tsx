'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTemplateStore } from '@/lib/template-store';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Plus, Edit, Trash2, Eye } from 'lucide-react';
import { ClientOnly } from '@/components/ClientOnly';

export default function AdminTemplatesPage() {
    const router = useRouter();
    const templates = useTemplateStore((state) => state.templates);
    const deleteTemplate = useTemplateStore((state) => state.deleteTemplate);
    const addTemplate = useTemplateStore((state) => state.addTemplate);
    const fetchTemplatesBasic = useTemplateStore((state) => state.fetchTemplatesBasic);
    const isLoading = useTemplateStore((state) => state.isLoading);
    const error = useTemplateStore((state) => state.error);

    React.useEffect(() => {
        console.time('Fetch Templates Duration');
        console.log('🏁 AdminTemplatesPage mounted, triggering fetch...');
        fetchTemplatesBasic().then(() => {
            console.timeEnd('Fetch Templates Duration');
            console.log('✅ Fetch complete');
        });
    }, [fetchTemplatesBasic]);

    // Log when isLoading changes
    React.useEffect(() => {
        console.log(`📊 Loading state changed: ${isLoading}, Error: ${error}, Templates: ${templates.length}`);
    }, [isLoading, error, templates.length]);

    const handleCreateTemplate = async () => {
        const newId = `t${Date.now()}`;
        const createdId = await addTemplate({
            name: `New Template ${templates.length + 1}`,
            thumbnail: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=400',
            sections: {},
            globalTheme: {
                id: newId,
                name: 'New Template',
                category: 'modern',
                colors: {
                    primary: '#000000',
                    secondary: '#ffffff',
                    accent: '#cccccc',
                    background: '#ffffff',
                    text: '#000000',
                },
                fontFamily: 'Inter',
            },
        });

        if (createdId) {
            router.push(`/admin/templates/${createdId}`);
        }
    };

    return (
        <ClientOnly>
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100" suppressHydrationWarning>
                {/* Header */}
                <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900">Template Manager</h1>
                                <p className="text-sm text-slate-500">Create and edit invitation templates</p>
                            </div>
                            <Button onClick={handleCreateTemplate} className="flex items-center gap-2">
                                <Plus size={18} />
                                Create Template
                            </Button>
                        </div>
                    </div>
                </header>


                {/* Template Grid */}
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {error && (
                        <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
                            <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-red-100">
                                ⚠️
                            </div>
                            <div>
                                <h3 className="font-semibold">Connection Error</h3>
                                <p className="text-sm">{error}</p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => fetchTemplatesBasic()}
                                className="ml-auto bg-white hover:bg-red-50 border-red-200 text-red-700"
                            >
                                Retry
                            </Button>
                        </div>
                    )}

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-600 rounded-full animate-spin mb-4"></div>
                            <p className="text-slate-500">Loading templates...</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {templates.map((template) => (
                                    <Card key={template.id} className="overflow-hidden group hover:shadow-xl transition-shadow duration-300">
                                        {/* Thumbnail */}
                                        <div className="relative aspect-[4/3] bg-slate-100">
                                            <Image
                                                src={template.thumbnail}
                                                alt={template.name}
                                                fill
                                                className="object-cover"
                                                unoptimized
                                            />
                                            {/* Overlay on hover */}
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                                                <Link href={`/admin/templates/${template.id}`}>
                                                    <Button size="sm" variant="secondary" className="flex items-center gap-1">
                                                        <Edit size={14} />
                                                        Edit
                                                    </Button>
                                                </Link>
                                                <Button size="sm" variant="outline" className="flex items-center gap-1 bg-white/90">
                                                    <Eye size={14} />
                                                    Preview
                                                </Button>
                                            </div>
                                        </div>
                                        {/* Info */}
                                        <div className="p-4">
                                            <div className="flex items-center justify-between">
                                                <h3 className="font-semibold text-slate-800">{template.name}</h3>
                                                <button
                                                    onClick={() => deleteTemplate(template.id)}
                                                    className="text-slate-400 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                            <p className="text-xs text-slate-400 mt-1">
                                                {/* Using sectionOrder length as a proxy for complexity since sections aren't loaded */}
                                                {(template.sectionOrder?.length || 0)} sections defined
                                            </p>
                                        </div>
                                    </Card>
                                ))}
                            </div>

                            {templates.length === 0 && !error && (
                                <div className="text-center py-16">
                                    <p className="text-slate-500">No templates yet. Create your first one!</p>
                                </div>
                            )}
                        </>
                    )}
                </main>
            </div>
        </ClientOnly>
    );
}
