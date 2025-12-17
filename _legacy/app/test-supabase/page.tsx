'use client';

import { useEffect, useState } from 'react';
import { testSupabaseConnection } from '@/lib/supabase-templates';
import { useTemplateStore } from '@/lib/template-store';

export default function TestSupabasePage() {
    const [connectionTest, setConnectionTest] = useState<any>(null);
    const [templateTest, setTemplateTest] = useState<any>(null);
    const { fetchTemplatesBasic, error, isLoading, templates } = useTemplateStore();

    useEffect(() => {
        const runTests = async () => {
            // Test basic connection
            const connectionResult = await testSupabaseConnection();
            setConnectionTest(connectionResult);

            // Test template fetching
            try {
                await fetchTemplatesBasic();
                setTemplateTest({ success: true, templatesCount: templates.length });
            } catch (err) {
                setTemplateTest({ success: false, error: err });
            }
        };

        runTests();
    }, []);

    return (
        <div className="min-h-screen p-8 bg-gray-50">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-8 text-gray-900">Supabase Connection Test</h1>

                {/* Connection Test */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800">1. Basic Connection Test</h2>
                    {connectionTest === null ? (
                        <p className="text-gray-600">Testing connection...</p>
                    ) : (
                        <div>
                            <p className={`font-medium ${connectionTest.success ? 'text-green-600' : 'text-red-600'}`}>
                                Status: {connectionTest.success ? '✅ Connected' : '❌ Failed'}
                            </p>
                            {!connectionTest.success && (
                                <div className="mt-2 p-3 bg-red-50 rounded text-red-800">
                                    <pre className="text-sm">{JSON.stringify(connectionTest.error, null, 2)}</pre>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Template Fetch Test */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800">2. Template Fetch Test</h2>
                    {isLoading ? (
                        <p className="text-gray-600">Fetching templates...</p>
                    ) : (
                        <div>
                            {templateTest === null ? (
                                <p className="text-gray-600">Running test...</p>
                            ) : (
                                <div>
                                    <p className={`font-medium ${templateTest.success ? 'text-green-600' : 'text-red-600'}`}>
                                        Status: {templateTest.success ? '✅ Templates fetched' : '❌ Failed'}
                                    </p>
                                    {templateTest.success ? (
                                        <p className="text-green-800 mt-2">
                                            Found {templateTest.templatesCount} templates
                                        </p>
                                    ) : (
                                        <div className="mt-2 p-3 bg-red-50 rounded text-red-800">
                                            <p className="font-medium">Error:</p>
                                            <pre className="text-sm mt-1">{JSON.stringify(templateTest.error, null, 2)}</pre>
                                        </div>
                                    )}
                                    {error && (
                                        <div className="mt-2 p-3 bg-red-50 rounded text-red-800">
                                            <p className="font-medium">Store Error:</p>
                                            <p className="text-sm mt-1">{error}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Environment Variables Check */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800">3. Environment Variables</h2>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="font-medium">NEXT_PUBLIC_SUPABASE_URL:</span>
                            <span className={process.env.NEXT_PUBLIC_SUPABASE_URL ? 'text-green-600' : 'text-red-600'}>
                                {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="font-medium">NEXT_PUBLIC_SUPABASE_ANON_KEY:</span>
                            <span className={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'text-green-600' : 'text-red-600'}>
                                {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}
                            </span>
                        </div>
                    </div>

                    {(!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) && (
                        <div className="mt-4 p-3 bg-yellow-50 rounded text-yellow-800">
                            <p className="font-medium">Warning: Environment variables are missing!</p>
                            <p className="text-sm mt-1">Check your .env.local file for proper Supabase configuration.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

