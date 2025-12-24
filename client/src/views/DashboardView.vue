<script setup lang="ts">
/**
 * DashboardView.vue
 * Premium user dashboard with sidebar navigation
 * Modern, clean design - completely different from reference
 */

import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { invitationsApi, type TemplateResponse } from '@/lib/api/invitations';
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

// Methods
async function loadInvitations() {
    loading.value = true;
    try {
        invitations.value = await invitationsApi.getMyInvitations();
    } catch (e) {
        console.error('Failed to load invitations:', e);
    } finally {
        loading.value = false;
    }
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
        <div class="h-16 flex items-center justify-between px-4 border-b border-slate-100">
            <div v-if="sidebarOpen" class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white font-bold shadow-lg shadow-teal-500/20">
                    T
                </div>
                <span class="font-bold text-xl text-slate-800">Tamuu</span>
            </div>
            <button 
                @click="sidebarOpen = !sidebarOpen"
                class="p-2 rounded-lg hover:bg-slate-100 text-slate-500 lg:hidden"
            >
                <X v-if="sidebarOpen" class="w-5 h-5" />
                <Menu v-else class="w-5 h-5" />
            </button>
        </div>

        <!-- User Profile Card -->
        <div v-if="sidebarOpen" class="p-4 border-b border-slate-100">
            <div class="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-slate-50 to-slate-100">
                <div class="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white font-medium">
                    {{ user?.name?.charAt(0) || user?.email?.charAt(0) || 'U' }}
                </div>
                <div class="flex-1 min-w-0">
                    <p class="font-medium text-slate-800 truncate">{{ user?.name || 'User' }}</p>
                    <p class="text-xs text-slate-500 truncate">{{ user?.email }}</p>
                </div>
            </div>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 p-3 space-y-1 overflow-y-auto">
            <p v-if="sidebarOpen" class="px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                Menu Utama
            </p>
            <button
                v-for="item in menuItems"
                :key="item.id"
                @click="activeTab = item.id"
                :class="[
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
                    activeTab === item.id
                        ? 'bg-teal-50 text-teal-700 font-medium'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                ]"
            >
                <component 
                    :is="item.icon" 
                    :class="[
                        'w-5 h-5 flex-shrink-0',
                        activeTab === item.id ? 'text-teal-600' : 'text-slate-400'
                    ]"
                />
                <span v-if="sidebarOpen">{{ item.label }}</span>
            </button>
        </nav>

        <!-- Account Section -->
        <div class="p-3 border-t border-slate-100">
            <p v-if="sidebarOpen" class="px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                Akun
            </p>
            <button
                v-for="item in accountItems"
                :key="item.id"
                @click="item.action?.()"
                :class="[
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
                    item.id === 'logout' 
                        ? 'text-red-600 hover:bg-red-50' 
                        : 'text-slate-600 hover:bg-slate-50'
                ]"
            >
                <component :is="item.icon" class="w-5 h-5 flex-shrink-0" />
                <span v-if="sidebarOpen">{{ item.label }}</span>
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
        <header class="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-20">
            <div class="flex items-center gap-4">
                <button 
                    @click="sidebarOpen = !sidebarOpen"
                    class="p-2 rounded-lg hover:bg-slate-100 text-slate-500 lg:hidden"
                >
                    <Menu class="w-5 h-5" />
                </button>
                <h1 class="text-xl font-semibold text-slate-800">
                    {{ menuItems.find(m => m.id === activeTab)?.label || 'Dashboard' }}
                </h1>
            </div>
            
            <div class="flex items-center gap-3">
                <button class="p-2 rounded-lg hover:bg-slate-100 text-slate-500 relative">
                    <Bell class="w-5 h-5" />
                    <span class="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>
            </div>
        </header>

        <!-- Content Area -->
        <div class="flex-1 p-6">
            <!-- Dashboard Tab -->
            <div v-if="activeTab === 'dashboard'" class="space-y-6">
                <!-- Stats Cards -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm text-slate-500">Total Undangan</p>
                                <p class="text-3xl font-bold text-slate-800">{{ invitations.length }}</p>
                            </div>
                            <div class="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center">
                                <Mail class="w-6 h-6 text-teal-600" />
                            </div>
                        </div>
                    </div>
                    <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm text-slate-500">Pengunjung</p>
                                <p class="text-3xl font-bold text-slate-800">0</p>
                            </div>
                            <div class="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                                <Users class="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                    </div>
                    <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm text-slate-500">RSVP</p>
                                <p class="text-3xl font-bold text-slate-800">0</p>
                            </div>
                            <div class="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
                                <Calendar class="w-6 h-6 text-purple-600" />
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Quick Actions -->
                <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <h2 class="font-semibold text-slate-800 mb-4">Aksi Cepat</h2>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <button 
                            @click="createNewInvitation"
                            class="flex flex-col items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-teal-50 to-emerald-50 hover:from-teal-100 hover:to-emerald-100 transition-all"
                        >
                            <div class="w-12 h-12 rounded-xl bg-teal-500 flex items-center justify-center text-white shadow-lg shadow-teal-500/30">
                                <Plus class="w-6 h-6" />
                            </div>
                            <span class="text-sm font-medium text-slate-700">Buat Undangan</span>
                        </button>
                        <button class="flex flex-col items-center gap-3 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all">
                            <div class="w-12 h-12 rounded-xl bg-slate-200 flex items-center justify-center text-slate-600">
                                <GraduationCap class="w-6 h-6" />
                            </div>
                            <span class="text-sm font-medium text-slate-700">Lihat Tutorial</span>
                        </button>
                        <button class="flex flex-col items-center gap-3 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all">
                            <div class="w-12 h-12 rounded-xl bg-slate-200 flex items-center justify-center text-slate-600">
                                <FileText class="w-6 h-6" />
                            </div>
                            <span class="text-sm font-medium text-slate-700">Invoice</span>
                        </button>
                        <button 
                            @click="router.push({ name: 'profile' })"
                            class="flex flex-col items-center gap-3 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all"
                        >
                            <div class="w-12 h-12 rounded-xl bg-slate-200 flex items-center justify-center text-slate-600">
                                <User class="w-6 h-6" />
                            </div>
                            <span class="text-sm font-medium text-slate-700">Edit Profil</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Invitations Tab -->
            <div v-if="activeTab === 'invitations'" class="space-y-6">
                <!-- Search & Create -->
                <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                    <div class="relative flex-1 max-w-md">
                        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input 
                            v-model="searchQuery"
                            type="text"
                            placeholder="Cari undangan..."
                            class="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                        />
                    </div>
                    <button 
                        @click="createNewInvitation"
                        class="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-medium rounded-xl shadow-lg shadow-teal-500/30 hover:shadow-xl hover:shadow-teal-500/40 transition-all"
                    >
                        <Plus class="w-5 h-5" />
                        Buat Undangan Baru
                    </button>
                </div>

                <!-- Loading State -->
                <div v-if="loading" class="flex flex-col items-center justify-center py-16">
                    <div class="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                    <p class="mt-4 text-slate-500">Memuat undangan...</p>
                </div>

                <!-- Empty State -->
                <div v-else-if="filteredInvitations.length === 0" class="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200">
                    <div class="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                        <Mail class="w-10 h-10 text-slate-400" />
                    </div>
                    <h3 class="text-xl font-semibold text-slate-800 mb-2">Belum Ada Undangan</h3>
                    <p class="text-slate-500 text-center max-w-sm mb-6">
                        Kamu belum memiliki undangan. Buat undangan baru dengan menekan tombol di bawah.
                    </p>
                    <button 
                        @click="createNewInvitation"
                        class="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-medium rounded-xl shadow-lg shadow-teal-500/30 hover:shadow-xl transition-all"
                    >
                        <Plus class="w-5 h-5" />
                        Buat Undangan Baru
                    </button>
                </div>

                <!-- Invitations Grid -->
                <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div 
                        v-for="inv in filteredInvitations"
                        :key="inv.id"
                        class="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg hover:border-teal-200 transition-all"
                    >
                        <!-- Thumbnail -->
                        <div class="aspect-[4/3] bg-slate-100 relative overflow-hidden">
                            <SafeImage 
                                v-if="inv.thumbnail"
                                :src="inv.thumbnail"
                                :alt="inv.name"
                                class="w-full h-full object-cover"
                            />
                            <div v-else class="w-full h-full flex items-center justify-center">
                                <Sparkles class="w-12 h-12 text-slate-300" />
                            </div>
                            
                            <!-- Overlay Actions -->
                            <div class="absolute inset-0 bg-black/50 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                <button 
                                    @click="viewInvitation(inv)"
                                    class="p-2 bg-white rounded-lg hover:bg-slate-100 transition-colors"
                                    title="Preview"
                                >
                                    <Eye class="w-5 h-5 text-slate-700" />
                                </button>
                                <button 
                                    @click="editInvitation(inv)"
                                    class="p-2 bg-white rounded-lg hover:bg-slate-100 transition-colors"
                                    title="Edit"
                                >
                                    <Edit3 class="w-5 h-5 text-slate-700" />
                                </button>
                                <button 
                                    @click="copyLink(inv)"
                                    class="p-2 bg-white rounded-lg hover:bg-slate-100 transition-colors"
                                    title="Copy Link"
                                >
                                    <Copy class="w-5 h-5 text-slate-700" />
                                </button>
                                <button 
                                    @click="manageGuests(inv)"
                                    class="p-2 bg-teal-500 rounded-lg hover:bg-teal-600 transition-colors"
                                    title="Daftar Tamu"
                                >
                                    <Users class="w-5 h-5 text-white" />
                                </button>
                            </div>
                        </div>

                        <!-- Info -->
                        <div class="p-4">
                            <h3 class="font-semibold text-slate-800 truncate">{{ inv.name }}</h3>
                            <p v-if="inv.slug" class="text-sm text-teal-600 truncate">tamuu.pages.dev/{{ inv.slug }}</p>
                            <p v-else class="text-sm text-slate-400">No slug</p>
                            <div class="flex items-center justify-between mt-3">
                                <span 
                                    :class="[
                                        'text-xs font-medium px-2 py-1 rounded-full',
                                        inv.status === 'published' 
                                            ? 'bg-green-100 text-green-700' 
                                            : 'bg-amber-100 text-amber-700'
                                    ]"
                                >
                                    {{ inv.status === 'published' ? 'Published' : 'Draft' }}
                                </span>
                                <button class="text-slate-400 hover:text-red-500 transition-colors">
                                    <Trash2 class="w-4 h-4" />
                                </button>
                            </div>
                        </div>
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
