<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { RouterLink } from "vue-router";
import { ArrowRight, CheckCircle, Sparkles, Star, Zap, ShieldCheck } from "lucide-vue-next";
import MainNavbar from "@/components/layout/MainNavbar.vue";
import MainFooter from "@/components/layout/MainFooter.vue";

const eventTypes = ["Pernikahan", "Ulang Tahun", "Sunatan", "Syukuran", "Aqiqah", "Tunangan", "Pertunangan"];
const currentIndex = ref(0);
const transitionEnabled = ref(true);
let interval: any = null;

// Add first element to end for seamless looping
const displayList = [...eventTypes, eventTypes[0]];

const ITEM_HEIGHT_EM = 1.7; // Enterprise Grade: Increased for descender safety (g, j, y, q)

onMounted(() => {
  // CTO Standard: Reliable state machine for vertical sliding
  interval = setInterval(() => {
    // 1. Move to next item
    if (currentIndex.value < eventTypes.length) {
      currentIndex.value++;
    }
    
    // 2. If reached the clone, wait for transition, then snap back
    if (currentIndex.value === eventTypes.length) {
      setTimeout(() => {
        transitionEnabled.value = false;
        currentIndex.value = 0;
        
        // Force browser to acknowledge the state change before re-enabling transition
        requestAnimationFrame(() => {
          setTimeout(() => {
            transitionEnabled.value = true;
          }, 50);
        });
      }, 800); // Slightly more than duration (700ms)
    }
  }, 4000); // Slower interval (4s) for premium feel
});

onUnmounted(() => {
  if (interval) clearInterval(interval);
});

const features = [
  {
    title: "450+ Tema Premium",
    description: "Pilihan tema beragam kategori untuk berbagai jenis acara",
    icon: Star,
  },
  {
    title: "Edit Mudah",
    description: "Cukup dari HP, edit undangan dalam hitungan menit",
    icon: Zap,
  },
  {
    title: "Custom Domain",
    description: "Tampil unik dengan domain atas nama pribadi atau brand",
    icon: Sparkles,
  },
  {
    title: "RSVP & Guest Book",
    description: "Kelola konfirmasi tamu dan ucapan dengan mudah",
    icon: CheckCircle,
  },
  {
    title: "QR Code Check-in",
    description: "Sistem check-in modern untuk acara Anda",
    icon: ShieldCheck,
  },
  {
    title: "WhatsApp Broadcast",
    description: "Kirim undangan ke semua tamu dalam sekali klik",
    icon: Sparkles,
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
  <div class="min-h-screen font-sans selection:bg-indigo-500/30 selection:text-white overflow-x-hidden" style="background-color: #FFFFFF">
    <MainNavbar :transparent-white="true" />

    <!-- Hero Section -->
    <section class="relative pt-24 pb-0 sm:pt-32 overflow-hidden font-jakarta" style="background-color: #0A1128">
      <!-- Decor -->
      <div class="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl">
        <div class="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/20 blur-[120px] rounded-full animate-soft-float"></div>
        <div class="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/20 blur-[120px] rounded-full animate-soft-float animation-delay-4000"></div>
        <div class="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-purple-500/20 blur-[100px] rounded-full animate-soft-float animation-delay-8000"></div>
      </div>

      <div class="max-w-7xl mx-auto px-6 relative">
        <div class="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center lg:items-end min-h-[500px] lg:h-[600px]">
          <!-- Left Column: Content -->
          <div class="text-center lg:text-left space-y-8 pb-12 sm:pb-16 lg:pb-32 order-1">
            <div
              class="inline-flex items-center gap-2 px-5 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700"
            >
              <Sparkles class="w-4 h-4 text-amber-400" />
              <span class="text-[10px] font-bold text-white/80 uppercase tracking-[0.3em]">The Premium Digital Invitation</span>
            </div>

            <h1 class="text-3xl sm:text-5xl md:text-6xl lg:text-6xl font-black text-white animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150 flex flex-col items-center lg:items-start gap-2 md:gap-4 w-full tracking-tight leading-[1.05]">
              <span class="break-words max-w-full">Platform Undangan Digital Premium</span>
              <div class="flex items-center justify-center lg:justify-start overflow-visible" :style="{ height: `${ITEM_HEIGHT_EM}em` }">
                <span class="relative overflow-hidden inline-flex flex-col items-center lg:items-start min-w-[200px] sm:min-w-[400px]" :style="{ height: `${ITEM_HEIGHT_EM}em` }">
                  <span 
                    class="flex flex-col w-full whitespace-nowrap" 
                    :class="{ 'transition-transform duration-700 ease-in-out': transitionEnabled }"
                    :style="{ transform: `translateY(-${currentIndex * ITEM_HEIGHT_EM}em)` }"
                  >
                    <span 
                      v-for="(event, i) in displayList" 
                      :key="i" 
                      class="flex items-center justify-center lg:justify-start text-[#FFBF00]"
                      :style="{ 
                        height: `${ITEM_HEIGHT_EM}em`
                      }"
                    >
                      {{ event }}
                    </span>
                  </span>
                </span>
              </div>
            </h1>

            <p class="text-lg md:text-xl text-white/70 max-w-xl mx-auto lg:mx-0 leading-relaxed animate-in fade-in slide-in-from-bottom-12 duration-700 delay-300 font-sans tracking-wide">
              Ciptakan kesan pertama yang tak terlupakan dengan desain eksklusif, fitur tercanggih, dan kualitas premium.
            </p>

            <div class="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center animate-in fade-in slide-in-from-bottom-16 duration-700 delay-500">
              <RouterLink
                :to="{ name: 'register' }"
                class="group relative inline-flex items-center gap-3 px-7 py-4 sm:px-10 sm:py-5 bg-white text-slate-900 font-black rounded-2xl shadow-2xl shadow-indigo-950/20 hover:bg-slate-50 hover:scale-105 transition-all duration-300 w-full sm:w-auto justify-center"
              >
                Mulai Sekarang
                <ArrowRight class="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </RouterLink>
              <RouterLink
                :to="{ name: 'template-store' }"
                class="px-7 py-4 sm:px-10 sm:py-5 bg-white/10 text-white border border-white/20 font-bold rounded-2xl shadow-sm hover:bg-white/20 hover:border-white/30 hover:scale-105 transition-all duration-300 backdrop-blur-sm w-full sm:w-auto text-center"
              >
                Lihat Template
              </RouterLink>
            </div>
          </div>

          <!-- Right Column: Visual (Bride) -->
          <div class="relative flex justify-center lg:justify-end items-end order-2 mt-8 lg:mt-0">
            <!-- Backing Glow -->
            <div class="absolute bottom-0 right-0 w-[120%] h-[120%] bg-rose-500/10 blur-[120px] rounded-full -z-10 animate-pulse transition-all"></div>
            
            <!-- Bride Image (Shoulder-up positioning) -->
            <div class="relative w-full max-w-[280px] sm:max-w-[380px] lg:max-w-[420px] xl:max-w-[450px] flex items-end">
              <img 
                src="/images/hero-bride.png" 
                alt="Tamuu Premium Guest" 
                class="w-full h-auto object-contain object-bottom"
              />
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section id="features" class="max-w-7xl mx-auto px-6 py-24" style="background-color: #FFFFFF">
      <div class="text-center mb-20 space-y-4">
        <h2 class="text-[#FFBF00] font-black uppercase tracking-widest text-sm">Fitur Masa Depan</h2>
        <h2 class="text-4xl md:text-5xl font-black text-[#0A1128] tracking-tight">Eksklusif Untuk Anda</h2>
        <div class="w-20 h-1.5 bg-[#FFBF00] mx-auto rounded-full"></div>
      </div>

      <div class="grid md:grid-cols-3 gap-10">
        <div
          v-for="(feature, index) in features"
          :key="index"
          class="group p-10 bg-[#F8FAFC] rounded-[2.5rem] border border-slate-200/50 shadow-md hover:shadow-2xl hover:shadow-[#0A1128]/10 transition-all duration-500 hover:-translate-y-2"
        >
          <div class="w-16 h-16 bg-[#0A1128]/5 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
            <component :is="feature.icon" class="w-8 h-8 text-[#0A1128]" />
          </div>
          <h3 class="text-2xl font-bold text-[#0A1128] mb-4 tracking-tight">{{ feature.title }}</h3>
          <p class="text-slate-600 leading-relaxed font-medium">{{ feature.description }}</p>
        </div>
      </div>
    </section>

    <!-- Pricing Section -->
    <section id="pricing" class="max-w-7xl mx-auto px-6 py-24 mb-20" style="background-color: #FFFFFF">
      <div class="text-center mb-16 space-y-4">
        <h2 class="text-[#FFBF00] font-black uppercase tracking-widest text-sm">Investasi Terbaik</h2>
        <h2 class="text-4xl md:text-5xl font-black text-[#0A1128] tracking-tight">Pilih Paket Kebahagiaan</h2>
        <div class="w-20 h-1.5 bg-[#FFBF00] mx-auto rounded-full"></div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-6 xl:gap-8 items-center max-w-lg lg:max-w-none mx-auto">
        <div
          v-for="(plan, index) in pricingPlans"
          :key="index"
          class="relative p-8 sm:p-10 rounded-[2.5rem] transition-all duration-500 hover:-translate-y-2 group"
          :class="plan.popular 
            ? 'bg-slate-900 text-white shadow-[0_30px_60px_-15px_rgba(15,23,42,0.3)] lg:scale-105 z-10' 
            : 'bg-[#F8FAFC] text-slate-900 border border-slate-200 shadow-md hover:shadow-2xl'"
        >
          <div v-if="plan.popular" class="absolute -top-5 left-1/2 -translate-x-1/2 bg-[#FFBF00] text-[#0A1128] text-[10px] font-black tracking-[0.2em] uppercase py-2 px-6 rounded-full shadow-lg">
            Rekomendasi Utama
          </div>
          
          <h3 class="text-2xl font-black mb-2 tracking-tight">{{ plan.name }}</h3>
          <div class="flex items-baseline flex-wrap gap-1 mb-8">
            <span class="text-sm font-bold opacity-60 flex-shrink-0">Rp</span>
            <span class="text-3xl sm:text-5xl font-black tracking-tighter leading-none">{{ formatPrice(plan.price) }}</span>
            <span class="text-xs sm:text-sm font-medium opacity-60 flex-shrink-0">/acara</span>
          </div>

          <div class="h-[1px] w-full bg-current opacity-10 mb-8"></div>

          <ul class="space-y-4 mb-10">
            <li v-for="(feature, i) in plan.features" :key="i" class="flex items-center gap-3 text-sm font-semibold">
              <div class="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" :class="plan.popular ? 'bg-amber-400/20 text-amber-400' : 'bg-[#0A1128]/5 text-[#0A1128]/60'">
                <CheckCircle class="w-3.5 h-3.5" />
              </div>
              <span class="opacity-90">{{ feature }}</span>
            </li>
          </ul>

          <button
            class="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all duration-300 transform active:scale-95"
            :class="plan.popular 
              ? 'bg-[#FFBF00] text-[#0A1128] hover:bg-[#FFD700]' 
              : 'bg-[#0A1128] text-white shadow-lg shadow-[#0A1128]/20 hover:bg-slate-800'"
          >
            Pilih Sekarang
          </button>
        </div>
      </div>
    </section>
    <MainFooter />
  </div>
</template>

<style scoped>
.bg-grid-opacity-5 {
    background-image: url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%239C92AC' fill-opacity='0.2' fill-rule='evenodd'%3E%3Cpath d='M0 38.59l2.83-2.83 1.41 1.41L1.41 40H0v-1.41zM0 1.4l2.83 2.83 1.41-1.41L1.41 0H0v1.41zM38.59 40l-2.83-2.83 1.41-1.41L40 38.59V40h-1.41zM40 1.41l-2.83 2.83-1.41-1.41L38.59 0H40v1.41zM20 18.6l2.83-2.83 1.41 1.41L21.41 20l2.83 2.83-1.41 1.41L20 21.41l-2.83 2.83-1.41-1.41L18.59 20l-2.83-2.83 1.41-1.41L20 18.59z'/%3E%3C/g%3E%3C/svg%3E");
}

@keyframes soft-float {
  0% { transform: translate(0px, 0px) scale(1); }
  33% { transform: translate(15px, -25px) scale(1.05); }
  66% { transform: translate(-10px, 10px) scale(0.95); }
  100% { transform: translate(0px, 0px) scale(1); }
}

.animate-soft-float {
  animation: soft-float 20s ease-in-out infinite;
}

.animation-delay-4000 {
  animation-delay: 4s;
}

.animation-delay-8000 {
  animation-delay: 8s;
}
</style>
