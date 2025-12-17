<script setup lang="ts">
import { RouterLink } from "vue-router";
import { ArrowRight, CheckCircle, Sparkles } from "lucide-vue-next";

const features = [
  {
    title: "450+ Tema Premium",
    description: "Pilihan tema beragam kategori untuk berbagai jenis acara",
  },
  {
    title: "Edit Mudah",
    description: "Cukup dari HP, edit undangan dalam hitungan menit",
  },
  {
    title: "Custom Domain",
    description: "Tampil unik dengan domain atas nama pribadi atau brand",
  },
  {
    title: "RSVP & Guest Book",
    description: "Kelola konfirmasi tamu dan ucapan dengan mudah",
  },
  {
    title: "QR Code Check-in",
    description: "Sistem check-in modern untuk acara Anda",
  },
  {
    title: "WhatsApp Broadcast",
    description: "Kirim undangan ke semua tamu dalam sekali klik",
  },
];

const pricingPlans = [
  {
    name: "Basic",
    price: 150000,
    features: [
      "Aktif 1 bulan",
      "100+ tema pilihan",
      "Unlimited tamu",
      "RSVP & ucapan",
      "Google Maps",
      "Musik latar",
    ],
  },
  {
    name: "Premium",
    price: 250000,
    popular: true,
    features: [
      "Aktif 3 bulan",
      "450+ tema pilihan",
      "Unlimited tamu",
      "RSVP & ucapan",
      "QR Code check-in",
      "Custom domain",
      "WhatsApp broadcast",
      "Priority support",
    ],
  },
  {
    name: "Prioritas",
    price: 500000,
    features: [
      "Aktif 6 bulan",
      "Semua fitur Premium",
      "Custom theme",
      "Video invitation",
      "Live streaming",
      "Dedicated support",
      "Export data",
    ],
  },
];

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("id-ID").format(price);
};
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-teal-50 via-blue-50 to-purple-50 font-sans">
    <!-- Hero Section -->
    <div class="relative overflow-hidden">
      <div class="absolute inset-0 bg-grid-opacity-5"></div>
      <div class="max-w-7xl mx-auto px-6 py-20 relative">
        <div class="text-center space-y-8">
          <div
            class="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-md rounded-full border border-teal-200 shadow-lg"
          >
            <Sparkles class="w-4 h-4 text-teal-600" />
            <span class="text-sm font-medium text-teal-700">Platform Undangan Digital #1 di Indonesia</span>
          </div>

          <h1 class="text-6xl md:text-7xl font-bold text-gray-900 leading-tight">
            Buat Undangan Digital
            <br />
            <span class="bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent">
              Dalam 10 Menit
            </span>
          </h1>

          <p class="text-xl text-gray-600 max-w-2xl mx-auto">
            Platform undangan online untuk pernikahan, ulang tahun, dan acara spesial lainnya. Mudah, cepat, dan
            profesional dengan 450+ tema pilihan.
          </p>

          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <RouterLink
              to="/dashboard"
              class="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-teal-500 to-teal-600 text-white font-semibold rounded-xl shadow-lg shadow-teal-500/30 hover:shadow-xl hover:scale-105 transition-all duration-200"
            >
              Mulai Buat Undangan
              <ArrowRight class="w-5 h-5" />
            </RouterLink>
            <button
              class="px-8 py-4 bg-white text-gray-900 font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
            >
              Lihat Demo
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Features Section -->
    <div class="max-w-7xl mx-auto px-6 py-20">
      <div class="text-center mb-16">
        <h2 class="text-4xl font-bold text-gray-900 mb-4">Fitur Unggulan</h2>
        <p class="text-lg text-gray-600">Semua yang Anda butuhkan untuk undangan sempurna</p>
      </div>

      <div class="grid md:grid-cols-3 gap-8">
        <div
          v-for="(feature, index) in features"
          :key="index"
          class="p-6 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
        >
          <div class="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mb-4">
            <CheckCircle class="w-6 h-6 text-teal-600" />
          </div>
          <h3 class="text-xl font-semibold text-gray-900 mb-2">{{ feature.title }}</h3>
          <p class="text-gray-600">{{ feature.description }}</p>
        </div>
      </div>
    </div>

    <!-- Pricing Section -->
    <div class="max-w-7xl mx-auto px-6 py-20">
      <div class="text-center mb-16">
        <h2 class="text-4xl font-bold text-gray-900 mb-4">Paket Harga Terjangkau</h2>
        <p class="text-lg text-gray-600">Pilih paket yang sesuai dengan kebutuhan Anda</p>
      </div>

      <div class="grid md:grid-cols-3 gap-8">
        <div
          v-for="(plan, index) in pricingPlans"
          :key="index"
          class="p-8 rounded-2xl transition-transform duration-200"
          :class="plan.popular ? 'bg-gradient-to-br from-teal-500 to-teal-600 text-white shadow-2xl scale-105' : 'bg-white text-gray-900 shadow-lg'"
        >
          <div v-if="plan.popular" class="text-center mb-4">
            <span class="px-4 py-1 bg-yellow-400 text-gray-900 text-sm font-bold rounded-full">
              PALING POPULER
            </span>
          </div>
          <h3 class="text-2xl font-bold mb-2">{{ plan.name }}</h3>
          <div class="text-4xl font-bold mb-6">
            Rp {{ formatPrice(plan.price) }}
            <span class="text-lg font-normal opacity-75">/event</span>
          </div>
          <ul class="space-y-3 mb-8">
            <li v-for="(feature, i) in plan.features" :key="i" class="flex items-start gap-2">
              <CheckCircle class="w-5 h-5 mt-0.5 flex-shrink-0" />
              <span>{{ feature }}</span>
            </li>
          </ul>
          <button
            class="w-full py-3 rounded-lg font-semibold transition-all duration-200"
            :class="plan.popular ? 'bg-white text-teal-600 hover:bg-gray-100' : 'bg-teal-600 text-white hover:bg-teal-700'"
          >
            Pilih Paket
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bg-grid-opacity-5 {
    background-image: url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%239C92AC' fill-opacity='0.2' fill-rule='evenodd'%3E%3Cpath d='M0 38.59l2.83-2.83 1.41 1.41L1.41 40H0v-1.41zM0 1.4l2.83 2.83 1.41-1.41L1.41 0H0v1.41zM38.59 40l-2.83-2.83 1.41-1.41L40 38.59V40h-1.41zM40 1.41l-2.83 2.83-1.41-1.41L38.59 0H40v1.41zM20 18.6l2.83-2.83 1.41 1.41L21.41 20l2.83 2.83-1.41 1.41L20 21.41l-2.83 2.83-1.41-1.41L18.59 20l-2.83-2.83 1.41-1.41L20 18.59z'/%3E%3C/g%3E%3C/svg%3E");
}
</style>
