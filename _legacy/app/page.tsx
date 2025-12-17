import Link from 'next/link';
import { ArrowRight, CheckCircle, Sparkles } from 'lucide-react';

export default function HomePage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-teal-50 via-blue-50 to-purple-50">
            {/* Hero Section */}
            <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
                <div className="max-w-7xl mx-auto px-6 py-20 relative">
                    <div className="text-center space-y-8">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-md rounded-full border border-teal-200 shadow-lg">
                            <Sparkles className="w-4 h-4 text-teal-600" />
                            <span className="text-sm font-medium text-teal-700">Platform Undangan Digital #1 di Indonesia</span>
                        </div>

                        <h1 className="text-6xl md:text-7xl font-bold text-gray-900 leading-tight">
                            Buat Undangan Digital
                            <br />
                            <span className="bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent">
                                Dalam 10 Menit
                            </span>
                        </h1>

                        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                            Platform undangan online untuk pernikahan, ulang tahun, dan acara spesial lainnya.
                            Mudah, cepat, dan profesional dengan 450+ tema pilihan.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link
                                href="/dashboard"
                                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-teal-500 to-teal-600 text-white font-semibold rounded-xl shadow-lg shadow-teal-500/30 hover:shadow-xl hover:scale-105 transition-all duration-200"
                            >
                                Mulai Buat Undangan
                                <ArrowRight className="w-5 h-5" />
                            </Link>
                            <button className="px-8 py-4 bg-white text-gray-900 font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200">
                                Lihat Demo
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Features Section */}
            <div className="max-w-7xl mx-auto px-6 py-20">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold text-gray-900 mb-4">Fitur Unggulan</h2>
                    <p className="text-lg text-gray-600">Semua yang Anda butuhkan untuk undangan sempurna</p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className="p-6 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                        >
                            <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mb-4">
                                <CheckCircle className="w-6 h-6 text-teal-600" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                            <p className="text-gray-600">{feature.description}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Pricing Section */}
            <div className="max-w-7xl mx-auto px-6 py-20">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold text-gray-900 mb-4">Paket Harga Terjangkau</h2>
                    <p className="text-lg text-gray-600">Pilih paket yang sesuai dengan kebutuhan Anda</p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {pricingPlans.map((plan, index) => (
                        <div
                            key={index}
                            className={`p-8 rounded-2xl ${plan.popular
                                    ? 'bg-gradient-to-br from-teal-500 to-teal-600 text-white shadow-2xl scale-105'
                                    : 'bg-white text-gray-900 shadow-lg'
                                }`}
                        >
                            {plan.popular && (
                                <div className="text-center mb-4">
                                    <span className="px-4 py-1 bg-yellow-400 text-gray-900 text-sm font-bold rounded-full">
                                        PALING POPULER
                                    </span>
                                </div>
                            )}
                            <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                            <div className="text-4xl font-bold mb-6">
                                Rp {plan.price.toLocaleString()}
                                <span className="text-lg font-normal opacity-75">/event</span>
                            </div>
                            <ul className="space-y-3 mb-8">
                                {plan.features.map((feature, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                        <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                            <button
                                className={`w-full py-3 rounded-lg font-semibold transition-all duration-200 ${plan.popular
                                        ? 'bg-white text-teal-600 hover:bg-gray-100'
                                        : 'bg-teal-600 text-white hover:bg-teal-700'
                                    }`}
                            >
                                Pilih Paket
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

const features = [
    {
        title: '450+ Tema Premium',
        description: 'Pilihan tema beragam kategori untuk berbagai jenis acara',
    },
    {
        title: 'Edit Mudah',
        description: 'Cukup dari HP, edit undangan dalam hitungan menit',
    },
    {
        title: 'Custom Domain',
        description: 'Tampil unik dengan domain atas nama pribadi atau brand',
    },
    {
        title: 'RSVP & Guest Book',
        description: 'Kelola konfirmasi tamu dan ucapan dengan mudah',
    },
    {
        title: 'QR Code Check-in',
        description: 'Sistem check-in modern untuk acara Anda',
    },
    {
        title: 'WhatsApp Broadcast',
        description: 'Kirim undangan ke semua tamu dalam sekali klik',
    },
];

const pricingPlans = [
    {
        name: 'Basic',
        price: 150000,
        features: [
            'Aktif 1 bulan',
            '100+ tema pilihan',
            'Unlimited tamu',
            'RSVP & ucapan',
            'Google Maps',
            'Musik latar',
        ],
    },
    {
        name: 'Premium',
        price: 250000,
        popular: true,
        features: [
            'Aktif 3 bulan',
            '450+ tema pilihan',
            'Unlimited tamu',
            'RSVP & ucapan',
            'QR Code check-in',
            'Custom domain',
            'WhatsApp broadcast',
            'Priority support',
        ],
    },
    {
        name: 'Prioritas',
        price: 500000,
        features: [
            'Aktif 6 bulan',
            'Semua fitur Premium',
            'Custom theme',
            'Video invitation',
            'Live streaming',
            'Dedicated support',
            'Export data',
        ],
    },
];
