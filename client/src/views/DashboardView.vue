<script setup lang="ts">
/**
 * DashboardView.vue
 * Premium user dashboard with sidebar navigation
 * Modern, clean design - completely different from reference
 */

import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { invitationsApi, type TemplateResponse } from '@/lib/api/invitations';
import { guestsApi } from '@/services/guests-api';
import SafeImage from '@/components/ui/SafeImage.vue';
import AppHeader from '@/components/layout/AppHeader.vue';
import { 
    LayoutDashboard, Mail, FileText, GraduationCap, 
    User, LogOut, Plus, Search, Bell,
    Eye, Edit3, Copy, Trash2, 
    Calendar, Users, Sparkles, Menu, X
} from 'lucide-vue-next';

const router = useRouter();
const authStore = useAuthStore();

// State
const activeTab = ref('invitations');
const searchQuery = ref('');
const invitations = ref<TemplateResponse[]>([]);
const totalGuests = ref(0);
const loading = ref(true);
const sidebarOpen = ref(true);

// Menu items (without affiliate)
const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'invitations', label: 'Undangan Saya', icon: Mail },
    { id: 'guests', label: 'Buku Tamu', icon: Users },
    { id: 'invoice', label: 'Invoice', icon: FileText },
    { id: 'tutorial', label: 'Tutorial', icon: GraduationCap },
];

const accountItems = [
    { id: 'profile', label: 'Edit Profil', icon: User, action: () => router.push({ name: 'profile' }) },
    { id: 'logout', label: 'Log Out', icon: LogOut, action: () => handleLogout() },
];

// Computed
const user = computed(() => authStore.user);

const filteredInvitations = computed(() => {
    if (!searchQuery.value) return invitations.value;
    const q = searchQuery.value.toLowerCase();
    return invitations.value.filter(inv => 
        inv.name.toLowerCase().includes(q) || 
        inv.slug?.toLowerCase().includes(q)
    );
});

// Watch tab changes to refresh data when returning to dashboard
watch(activeTab, (newTab) => {
    if (newTab === 'dashboard') {
        loadInvitations();
    }
});

// Methods
async function loadInvitations() {
    loading.value = true;
    try {
        // Load invitations first as they are critical
        invitations.value = await invitationsApi.getMyInvitations();
        
        // Load stats in background or separate try-catch
        try {
            const guestStats = await guestsApi.getGuestStats();
            totalGuests.value = guestStats.totalGuests;
        } catch (statsErr) {
            console.warn('Failed to load guest stats:', statsErr);
            totalGuests.value = 0; // Fallback
        }
    } catch (e) {
        console.error('Failed to load invitations:', e);
    } finally {
        loading.value = false;
    }
}

function handleNavClick(tabId: string) {
    activeTab.value = tabId;
}

function handleLogout() {
    authStore.logout();
    router.push({ name: 'login' });
}

function createNewInvitation() {
    router.push({ name: 'onboarding' });
}

function viewInvitation(inv: TemplateResponse) {
    if (inv.slug) {
        window.open(`/preview/${inv.id}`, '_blank');
    }
}

function manageGuests(inv: TemplateResponse) {
    router.push({ name: 'guest-management', params: { invitationId: inv.id } });
}

function editInvitation(inv: TemplateResponse) {
    // Navigate to create/edit page with slug
    if (inv.slug) {
        router.push({ name: 'create', params: { slug: inv.slug } });
    } else {
        // Fallback to ID if slug is missing 
        router.push({ name: 'create', params: { slug: inv.id } });
    }
}

function copyLink(inv: TemplateResponse) {
    if (inv.slug) {
        navigator.clipboard.writeText(`https://tamuu.pages.dev/${inv.slug}`);
        alert('Link berhasil disalin!');
    }
}

onMounted(() => {
    loadInvitations();
});
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex flex-col">
    <!-- Unified Header -->
    <AppHeader />
    
    <div class="flex-1 flex">
    <!-- Sidebar -->
    <aside 
        :class="[
            'fixed lg:static inset-y-0 left-0 z-40 flex flex-col bg-white border-r border-slate-200 transition-all duration-300',
            sidebarOpen ? 'w-64' : 'w-0 lg:w-20'
        ]"
    >
        <!-- Logo Area -->
        <div class="h-20 flex items-center justify-between px-6">
            <!-- Removed Redundant Logo Area -->
            <button 
                @click="sidebarOpen = !sidebarOpen"
                class="p-2.5 rounded-xl hover:bg-slate-100 text-slate-500 lg:hidden transition-all"
            >
                <X v-if="sidebarOpen" class="w-6 h-6" />
                <Menu v-else class="w-6 h-6" />
            </button>
        </div>

        <!-- User Profile Card -->
        <div v-if="sidebarOpen" class="p-6">
            <div class="flex items-center gap-4 p-4 rounded-[1.25rem] bg-slate-50 border border-slate-100 group hover:border-teal-200 transition-all cursor-pointer">
                <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-teal-500/20 group-hover:scale-105 transition-transform">
                    {{ user?.name?.charAt(0) || user?.email?.charAt(0) || 'U' }}
                </div>
                <div class="flex-1 min-w-0">
                    <p class="font-bold text-slate-900 truncate leading-tight">{{ user?.name || 'User' }}</p>
                    <p class="text-[10px] font-black uppercase tracking-widest text-teal-600 mt-0.5">Premium Plan</p>
                </div>
            </div>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 p-4 space-y-2 overflow-y-auto">
            <p v-if="sidebarOpen" class="px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                Menu Utama
            </p>
            <button
                v-for="item in menuItems"
                :key="item.id"
                @click="handleNavClick(item.id)"
                :class="[
                    'w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group',
                    activeTab === item.id
                        ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/10'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                ]"
            >
                <div 
                    :class="[
                        'w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110',
                        activeTab === item.id ? 'bg-teal-500 text-slate-900' : 'bg-slate-100 text-slate-400'
                    ]"
                >
                    <component :is="item.icon" class="w-4 h-4" />
                </div>
                <span v-if="sidebarOpen" class="text-sm font-bold tracking-tight">{{ item.label }}</span>
            </button>
        </nav>

        <!-- Account Section -->
        <div class="p-4 border-t border-slate-100 mt-auto">
            <p v-if="sidebarOpen" class="px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                Layanan
            </p>
            <button
                v-for="item in accountItems"
                :key="item.id"
                @click="item.action?.()"
                :class="[
                    'w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300',
                    item.id === 'logout' 
                        ? 'text-rose-600 hover:bg-rose-50' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 group'
                ]"
            >
                <component 
                    :is="item.icon" 
                    class="w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110" 
                />
                <span v-if="sidebarOpen" class="text-sm font-bold tracking-tight">{{ item.label }}</span>
            </button>
        </div>
    </aside>

    <!-- Mobile Sidebar Overlay -->
    <div 
        v-if="sidebarOpen" 
        class="fixed inset-0 bg-black/20 z-30 lg:hidden"
        @click="sidebarOpen = false"
    />

    <!-- Main Content -->
    <main class="flex-1 flex flex-col min-h-screen">
        <!-- Top Header -->
        <header class="h-20 bg-white/70 backdrop-blur-md border-b border-white/40 flex items-center justify-between px-8 sticky top-0 z-20">
            <div class="flex items-center gap-6">
                <button 
                    @click="sidebarOpen = !sidebarOpen"
                    class="p-2.5 rounded-xl hover:bg-slate-100/50 text-slate-500 lg:hidden transition-all"
                >
                    <Menu class="w-6 h-6" />
                </button>
                <!-- Title Removed for Minimalism -->
            </div>
            
            <div class="flex items-center gap-4">
                <button class="p-2.5 rounded-xl hover:bg-slate-100/50 text-slate-500 relative transition-all group">
                    <Bell class="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span class="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
                </button>
            </div>
        </header>

        <!-- Content Area -->
        <div class="flex-1 p-8 bg-gradient-to-br from-slate-50 via-white to-teal-50/30">
            <!-- Dashboard Tab -->
            <div v-if="activeTab === 'dashboard'" class="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <!-- Welcome Section -->
                <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h2 class="text-3xl font-bold text-slate-900 font-outfit mb-2">Selamat datang, {{ user?.name || 'User' }} ✨</h2>
                        <p class="text-slate-500 text-lg">Berikut adalah ringkasan performa undangan Anda hari ini.</p>
                    </div>
                    <button 
                        @click="createNewInvitation"
                        class="flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900 text-white font-semibold rounded-2xl shadow-xl shadow-slate-900/10 hover:shadow-2xl hover:shadow-slate-900/20 hover:-translate-y-0.5 transition-all active:scale-95"
                    >
                        <Plus class="w-5 h-5" /> Buat Undangan Baru
                    </button>
                </div>

                <!-- Stats Cards (Luxury Glassmorphism) -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div class="group bg-white/70 backdrop-blur-xl rounded-3xl p-7 border border-white/60 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.03)] hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-500">
                        <div class="flex items-center justify-between mb-4">
                            <div class="w-14 h-14 rounded-2xl bg-teal-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                                <Mail class="w-7 h-7 text-teal-600" />
                            </div>
                            <span class="text-xs font-bold text-teal-600 px-3 py-1 bg-teal-50 rounded-full uppercase tracking-wider">Total</span>
                        </div>
                        <div>
                            <p class="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-1">Undangan Saya</p>
                            <p class="text-4xl font-bold text-slate-900 font-outfit">{{ invitations.length }}</p>
                        </div>
                    </div>

                    <div class="group bg-white/70 backdrop-blur-xl rounded-3xl p-7 border border-white/60 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.03)] hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-500">
                        <div class="flex items-center justify-between mb-4">
                            <div class="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                                <Users class="w-7 h-7 text-emerald-600" />
                            </div>
                            <span class="text-xs font-bold text-emerald-600 px-3 py-1 bg-emerald-50 rounded-full uppercase tracking-wider">Pax</span>
                        </div>
                        <div>
                            <p class="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-1">Total Tamu</p>
                            <p class="text-4xl font-bold text-slate-900 font-outfit">{{ totalGuests }}</p>
                        </div>
                    </div>

                    <div class="group bg-white/70 backdrop-blur-xl rounded-3xl p-7 border border-white/60 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.03)] hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-500">
                        <div class="flex items-center justify-between mb-4">
                            <div class="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                                <Eye class="w-7 h-7 text-blue-600" />
                            </div>
                            <span class="text-xs font-bold text-blue-600 px-3 py-1 bg-blue-50 rounded-full uppercase tracking-wider">Views</span>
                        </div>
                        <div>
                            <p class="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-1">Pengunjung</p>
                            <p class="text-4xl font-bold text-slate-900 font-outfit">0</p>
                        </div>
                    </div>

                    <div class="group bg-white/70 backdrop-blur-xl rounded-3xl p-7 border border-white/60 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.03)] hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-500">
                        <div class="flex items-center justify-between mb-4">
                            <div class="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                                <Calendar class="w-7 h-7 text-purple-600" />
                            </div>
                            <span class="text-xs font-bold text-purple-600 px-3 py-1 bg-purple-50 rounded-full uppercase tracking-wider">Confirm</span>
                        </div>
                        <div>
                            <p class="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-1">RSVP Terkirim</p>
                            <p class="text-4xl font-bold text-slate-900 font-outfit">0</p>
                        </div>
                    </div>
                </div>

                <!-- Recent Activity/Invitations Preview Section -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    <div class="lg:col-span-2 space-y-6">
                        <div class="flex items-center justify-between">
                            <h3 class="text-xl font-bold text-slate-900 font-outfit">Undangan Terbaru</h3>
                            <button @click="activeTab = 'invitations'" class="text-sm font-bold text-teal-600 hover:text-teal-700 transition-colors">Lihat Semua</button>
                        </div>
                        
                        <div v-if="invitations.length === 0" class="bg-white/50 backdrop-blur-sm rounded-3xl p-12 border border-slate-200/60 flex flex-col items-center justify-center text-center">
                            <div class="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mb-6">
                                <Mail class="w-10 h-10 text-slate-400" />
                            </div>
                            <h4 class="text-xl font-bold text-slate-800 mb-2">Belum ada undangan</h4>
                            <p class="text-slate-500 max-w-xs mb-8">Mulailah dengan membuat undangan digital pertama Anda hari ini.</p>
                            <button @click="createNewInvitation" class="px-6 py-3 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all">Buat Sekarang</button>
                        </div>

                        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div 
                                v-for="inv in invitations.slice(0, 3)"
                                :key="inv.id"
                                class="group bg-white rounded-2xl border border-slate-200/60 overflow-hidden hover:shadow-xl hover:border-teal-400/30 transition-all duration-500"
                            >
                                <div class="aspect-video relative overflow-hidden">
                                    <SafeImage 
                                        v-if="inv.thumbnail"
                                        :src="inv.thumbnail"
                                        alt="Invitation Thumbnail"
                                        class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                                    />
                                    <div v-else class="w-full h-full bg-slate-50 flex items-center justify-center">
                                        <Sparkles class="w-12 h-12 text-slate-200" />
                                    </div>
                                    <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-4">
                                        <div class="flex gap-2">
                                            <button @click="viewInvitation(inv)" class="p-2.5 bg-white/90 backdrop-blur-md rounded-xl hover:bg-white text-slate-900 transition-all">
                                                <Eye class="w-5 h-5" />
                                            </button>
                                            <button @click="editInvitation(inv)" class="p-2.5 bg-white/90 backdrop-blur-md rounded-xl hover:bg-white text-slate-900 transition-all">
                                                <Edit3 class="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div class="p-5">
                                    <h5 class="font-bold text-slate-900 truncate mb-1 text-sm">{{ inv.name }}</h5>
                                    <p class="text-[10px] text-slate-500 truncate mb-3 capitalize">tamuu.pages.dev/{{ inv.slug }}</p>
                                    <div class="flex items-center justify-between mt-auto">
                                        <span class="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 bg-teal-50 text-teal-600 rounded-md">{{ inv.status }}</span>
                                        <button @click="manageGuests(inv)" class="text-xs font-bold text-slate-900 hover:text-teal-600 transition-colors flex items-center gap-1.5">
                                            <Users class="w-3.5 h-3.5" /> Tamu
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="space-y-6">
                        <h3 class="text-xl font-bold text-slate-900 font-outfit">Layanan & Akun</h3>
                        <div class="bg-slate-900 text-white rounded-[2rem] p-8 relative overflow-hidden group">
                            <!-- Premium Gradient Decor -->
                            <div class="absolute top-0 right-0 w-32 h-32 bg-teal-500/20 rounded-full blur-3xl -mr-10 -mt-10 group-hover:scale-125 transition-transform duration-700"></div>
                            
                            <div class="relative z-10 flex flex-col h-full">
                                <div class="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6">
                                    <Sparkles class="w-6 h-6 text-teal-400" />
                                </div>
                                <h4 class="text-2xl font-bold mb-4">Ganti ke Premium</h4>
                                <p class="text-slate-400 mb-8 leading-relaxed text-sm">Buka semua fitur mewah, domain kustom, dan kapasitas tamu tanpa batas dengan paket Priority kami.</p>
                                <button class="mt-auto w-full py-4 bg-teal-500 hover:bg-teal-400 text-slate-900 font-black rounded-2xl transition-all shadow-lg shadow-teal-500/20 active:scale-95">LIHAT PAKET</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Invitations Tab -->
            <div v-if="activeTab === 'invitations'" class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <!-- Search & Filters -->
                <div class="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div class="relative flex-1 max-w-xl w-full">
                        <Search class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input 
                            v-model="searchQuery"
                            type="text"
                            placeholder="Cari undangan digital Anda..."
                            class="w-full pl-12 pr-6 py-4 bg-white/70 backdrop-blur-sm border border-slate-200/60 rounded-[1.25rem] focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all shadow-sm"
                        />
                    </div>
                    <div class="flex gap-3 w-full md:w-auto">
                        <button class="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-white border border-slate-200 font-semibold rounded-[1.25rem] hover:bg-slate-50 transition-all text-sm">
                            <Menu class="w-4 h-4" /> Filter
                        </button>
                        <button @click="createNewInvitation" class="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-slate-900 text-white font-semibold rounded-[1.25rem] hover:shadow-xl transition-all text-sm">
                            <Plus class="w-4 h-4" /> Baru
                        </button>
                    </div>
                </div>

                <!-- Grid -->
                <div v-if="loading" class="flex flex-col items-center justify-center py-20">
                    <Loader2 class="w-12 h-12 text-teal-500 animate-spin mb-4" />
                    <p class="text-slate-500 font-medium">Menyesuaikan galeri Anda...</p>
                </div>

                <div v-else-if="filteredInvitations.length === 0" class="bg-white rounded-[2.5rem] p-20 border border-slate-200/60 text-center">
                    <div class="w-24 h-24 rounded-3xl bg-slate-50 flex items-center justify-center mx-auto mb-8 shadow-inner">
                        <Mail class="w-12 h-12 text-slate-300" />
                    </div>
                    <h3 class="text-2xl font-bold text-slate-900 mb-2">Tidak ditemukan</h3>
                    <p class="text-slate-500 max-w-sm mx-auto mb-10 text-lg">Sesuaikan kata kunci pencarian atau buat undangan baru untuk mulai berkarya.</p>
                    <button @click="createNewInvitation" class="px-10 py-4 bg-slate-900 text-white font-bold rounded-2xl hover:scale-105 transition-all shadow-2xl shadow-slate-900/10">Buat Baru</button>
                </div>

                <div v-else class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    <div 
                        v-for="inv in filteredInvitations"
                        :key="inv.id"
                        class="group bg-white rounded-2xl border border-slate-200/60 overflow-hidden hover:shadow-2xl hover:border-teal-400/30 transition-all duration-700"
                    >
                        <div class="aspect-[4/3] relative overflow-hidden">
                            <SafeImage 
                                v-if="inv.thumbnail"
                                :src="inv.thumbnail"
                                alt="Invitation Thumbnail"
                                class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" 
                            />
                            <div v-else class="w-full h-full bg-slate-50 flex items-center justify-center">
                                <Sparkles class="w-16 h-16 text-slate-200" />
                            </div>
                            
                            <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col items-center justify-center gap-4">
                                <div class="flex gap-4">
                                    <button @click="viewInvitation(inv)" class="w-14 h-14 bg-white rounded-2xl flex items-center justify-center hover:scale-110 transition-transform active:scale-90" title="Preview">
                                        <Eye class="w-6 h-6 text-slate-900" />
                                    </button>
                                    <button @click="editInvitation(inv)" class="w-14 h-14 bg-teal-500 rounded-2xl flex items-center justify-center hover:scale-110 transition-transform active:scale-90" title="Edit">
                                        <Edit3 class="w-6 h-6 text-slate-900" />
                                    </button>
                                </div>
                                <div class="flex gap-4">
                                    <button @click="copyLink(inv)" class="w-14 h-14 bg-white rounded-2xl flex items-center justify-center hover:scale-110 transition-transform active:scale-90" title="Salin Link">
                                        <Copy class="w-6 h-6 text-slate-900" />
                                    </button>
                                    <button @click="manageGuests(inv)" class="w-14 h-14 bg-white rounded-2xl flex items-center justify-center hover:scale-110 transition-transform active:scale-90" title="Buku Tamu">
                                        <Users class="w-6 h-6 text-slate-900" />
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="p-5">
                            <div class="flex items-start justify-between gap-4 mb-2">
                                <h3 class="text-base font-bold text-slate-900 truncate tracking-tight">{{ inv.name }}</h3>
                                <div class="flex items-center gap-2">
                                    <button class="p-1.5 text-slate-300 hover:text-rose-500 transition-colors">
                                        <Trash2 class="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                            <p class="text-slate-400 text-[10px] font-medium mb-4 uppercase tracking-[0.1em] truncate">tamuu.pages.dev/{{ inv.slug }}</p>
                            
                            <div class="flex items-center justify-between pt-4 border-t border-slate-100">
                                <span 
                                    :class="[
                                        'text-[9px] font-black uppercase tracking-[0.1em] px-2 py-1 rounded-md',
                                        inv.status === 'published' 
                                            ? 'bg-emerald-50 text-emerald-600' 
                                            : 'bg-amber-50 text-amber-600'
                                    ]"
                                >
                                    {{ inv.status }}
                                </span>
                                <button @click="manageGuests(inv)" class="text-[10px] font-black text-slate-400 hover:text-teal-600 flex items-center gap-1.5 transition-colors">
                                    <Users class="w-3.5 h-3.5" /> Tamu
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>


            <!-- Guests Tab -->
            <div v-if="activeTab === 'guests'" class="space-y-6">
                <div class="flex items-center justify-between">
                    <div>
                        <h2 class="text-2xl font-bold text-slate-800">Kelola Buku Tamu</h2>
                        <p class="text-slate-500">Pilih undangan untuk mengelola daftar tamu Anda.</p>
                    </div>
                </div>

                <div v-if="invitations.length === 0" class="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200">
                    <div class="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                        <Users class="w-10 h-10 text-slate-400" />
                    </div>
                    <h3 class="text-xl font-semibold text-slate-800 mb-2">Belum Ada Undangan</h3>
                    <p class="text-slate-500 text-center max-w-sm mb-6">
                        Anda harus memiliki undangan terlebih dahulu untuk mengelola buku tamu.
                    </p>
                    <button 
                        @click="createNewInvitation"
                        class="flex items-center gap-2 px-6 py-3 bg-teal-600 text-white font-medium rounded-xl hover:bg-teal-700 transition-all"
                    >
                        <Plus class="w-5 h-5" /> Buat Undangan
                    </button>
                </div>

                <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div 
                        v-for="inv in invitations"
                        :key="inv.id"
                        class="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg transition-all flex flex-col gap-4"
                    >
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center">
                                <Mail class="w-6 h-6 text-teal-600" />
                            </div>
                            <div class="flex-1 min-w-0">
                                <h3 class="font-bold text-slate-800 truncate">{{ inv.name }}</h3>
                                <p class="text-xs text-slate-400">{{ inv.status.toUpperCase() }}</p>
                            </div>
                        </div>
                        <button 
                            @click="manageGuests(inv)"
                            class="w-full py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-all"
                        >
                            Buka Buku Tamu
                        </button>
                    </div>
                </div>
            </div>

            <!-- Invoice Tab -->
            <div v-if="activeTab === 'invoice'" class="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200">
                <div class="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                    <FileText class="w-10 h-10 text-slate-400" />
                </div>
                <h3 class="text-xl font-semibold text-slate-800 mb-2">Belum Ada Invoice</h3>
                <p class="text-slate-500 text-center">Riwayat pembayaran & invoice akan muncul di sini</p>
            </div>

            <!-- Tutorial Tab -->
            <div v-if="activeTab === 'tutorial'" class="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200">
                <div class="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                    <GraduationCap class="w-10 h-10 text-slate-400" />
                </div>
                <h3 class="text-xl font-semibold text-slate-800 mb-2">Tutorial</h3>
                <p class="text-slate-500 text-center">Video tutorial cara menggunakan Tamuu akan segera hadir</p>
            </div>
        </div>
    </main>
    </div> <!-- Close flex-1 flex wrapper -->
  </div>
</template>
