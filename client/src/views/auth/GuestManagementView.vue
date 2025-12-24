<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { 
    FileUp, FileDown, Copy, 
    Search, Trash2, Edit2, Check, 
    MessageSquare, 
    ChevronDown, Download, Info,
    Plus, ArrowLeft, Loader2
} from 'lucide-vue-next';
import { guestsApi, type Guest } from '@/services/guests-api';
import { invitationsApi } from '@/lib/api/invitations';
import type { TemplateResponse } from '@/lib/api/invitations';
import AppHeader from '@/components/layout/AppHeader.vue';

const route = useRoute();
const router = useRouter();
const invitationId = route.params.invitationId as string;

// State
const guests = ref<Guest[]>([]);
const invitation = ref<TemplateResponse | null>(null);
const loading = ref(true);
const savingMessage = ref(false);
const searchQuery = ref('');
const isImportModalOpen = ref(false);
const showExportDropdown = ref(false);
const invitationMessage = ref('');

// Guest Form State
const showAddForm = ref(false);
const newGuest = ref({
    name: '',
    phone: '',
    address: 'di tempat',
    tier: 'reguler' as const,
    guestCount: 1
});

// Computed
const filteredGuests = computed(() => {
    if (!searchQuery.value) return guests.value;
    const q = searchQuery.value.toLowerCase();
    return guests.value.filter(g => 
        g.name.toLowerCase().includes(q) || 
        g.phone?.includes(q) || 
        g.address?.toLowerCase().includes(q)
    );
});

const stats = computed(() => {
    const total = guests.value.length;
    const vip = guests.value.filter(g => g.tier === 'vip' || g.tier === 'vvip').length;
    const checkedIn = guests.value.filter(g => g.checkedInAt).length;
    return { total, vip, checkedIn };
});

// Methods
async function loadData() {
    loading.value = true;
    try {
        const [guestList, invite] = await Promise.all([
            guestsApi.getGuests(invitationId),
            invitationsApi.getInvitation(invitationId)
        ]);
        guests.value = guestList;
        invitation.value = invite;
        
        // Set default message from DB or generate one based on event category
        invitationMessage.value = invite.invitationMessage || generateDefaultMessage(invite.category || 'wedding');
    } catch (e) {
        console.error('Failed to load data:', e);
    } finally {
        loading.value = false;
    }
}

function generateDefaultMessage(category: string): string {
    const categories: Record<string, string> = {
        wedding: "Tanpa mengurangi rasa hormat, kami bermaksud mengundang Bapak/Ibu/Saudara/i untuk hadir di acara Pernikahan kami.",
        birthday: "Hai! Aku ingin mengundangmu untuk merayakan ulang tahunku yang ke-...",
        aqiqah: "Syukuran Aqiqah putra/putri kami tercinta...",
        khitan: "Syukuran Khitanan putra kami...",
        graduation: "Mari bergabung dalam acara perayaan kelulusan...",
        party: "You are invited to our special party!",
    };
    return categories[category] || "Kami bermaksud mengundang Bapak/Ibu/Saudara/i untuk hadir di acara kami.";
}

async function saveMessage() {
    if (!invitation.value) return;
    savingMessage.value = true;
    try {
        await invitationsApi.updateInvitation(invitationId, {
            invitationMessage: invitationMessage.value
        });
        // Feedback toast would go here
    } catch (e) {
        console.error('Failed to save message:', e);
    } finally {
        savingMessage.value = false;
    }
}

async function handleAddGuest() {
    if (!newGuest.value.name) return;
    try {
        const created = await guestsApi.addGuest(invitationId, newGuest.value);
        guests.value.unshift(created);
        showAddForm.value = false;
        newGuest.value = { name: '', phone: '', address: 'di tempat', tier: 'reguler', guestCount: 1 };
    } catch (e) {
        console.error('Add guest failed:', e);
    }
}

async function handleDeleteGuest(id: string) {
    if (!confirm('Hapus tamu ini?')) return;
    try {
        await guestsApi.deleteGuest(id);
        guests.value = guests.value.filter(g => g.id !== id);
    } catch (e) {
        console.error('Delete failed:', e);
    }
}

async function updateGuestField(guest: Guest, field: keyof Guest, value: any) {
    try {
        await guestsApi.updateGuest(guest.id, { [field]: value });
        const idx = guests.value.findIndex(g => g.id === guest.id);
        if (idx !== -1) guests.value[idx] = { ...guests.value[idx], [field]: value } as Guest;
    } catch (e) {
        console.error('Update failed:', e);
    }
}

function copyGeneralLink() {
    if (!invitation.value?.slug) return;
    const url = `https://tamuu.id/${invitation.value.slug}`;
    navigator.clipboard.writeText(url);
    alert('Link General disalin!');
}

function copyGuestLink(guest: Guest) {
    if (!invitation.value?.slug) return;
    const url = `https://tamuu.id/${invitation.value.slug}?to=${encodeURIComponent(guest.name)}`;
    navigator.clipboard.writeText(url);
    alert(`Link untuk ${guest.name} disalin!`);
}

function shareWhatsApp(guest: Guest) {
    if (!invitation.value?.slug) return;
    const phone = guest.phone ? guest.phone.replace(/\D/g, '') : '';
    const formattedPhone = phone.startsWith('0') ? '62' + phone.substring(1) : phone;
    
    const message = `${invitationMessage.value}\n\nLink Undangan: https://tamuu.id/${invitation.value.slug}?to=${encodeURIComponent(guest.name)}`;
    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}

function handleExport(format: 'csv' | 'excel') {
    if (format === 'csv') {
        guestsApi.exportToCSV(guests.value);
    } else {
        guestsApi.exportToExcel(guests.value);
    }
    showExportDropdown.value = false;
}

function downloadImportFormat() {
    const csvContent = "Nama,WhatsApp,Alamat,Status,Jumlah Tamu\nJoni Saputra,08123456789,Bandung,vip,2\nSiti Aminah,08987654321,di tempat,reguler,1";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'format-import-tamu-tamuu.csv';
    a.click();
}

async function handleFileUpload(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        const text = e.target?.result as string;
        const lines = text.split('\n');
        if (lines.length < 2) return;
        
        const importedGuests = lines.slice(1).filter(l => l.trim()).map(line => {
            const cols = line.split(',');
            return {
                name: cols[0]?.trim(),
                phone: cols[1]?.trim() || '',
                address: cols[2]?.trim() || 'di tempat',
                tier: (cols[3]?.trim().toLowerCase() || 'reguler') as 'reguler' | 'vip' | 'vvip',
                guestCount: parseInt(cols[4]) || 1
            };
        }).filter(g => g.name);

        if (importedGuests.length > 0) {
            try {
                await guestsApi.bulkAddGuests(invitationId, importedGuests);
                await loadData();
                isImportModalOpen.value = false;
            } catch (err) {
                alert('Gagal mengimpor tamu. Periksa format file Anda.');
            }
        }
    };
    reader.readAsText(file);
}

onMounted(loadData);
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex flex-col">
    <AppHeader />

    <main class="flex-1 max-w-7xl mx-auto w-full p-4 lg:p-8 space-y-8">
        <!-- Breadcrumb & Title -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div class="space-y-1">
                <button @click="router.back()" class="flex items-center text-sm text-slate-500 hover:text-teal-600 transition-colors mb-2">
                    <ArrowLeft class="w-4 h-4 mr-1" /> Kembali ke Dashboard
                </button>
                <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight">Buku Tamu Digital</h1>
                <p class="text-slate-500">Kelola tamu dan kirim undangan personal dengan mudah.</p>
            </div>
            <div class="flex items-center gap-3">
                <button @click="copyGeneralLink" class="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 transition-all shadow-sm">
                    <Copy class="w-4 h-4" /> Copy General Link
                </button>
                <div class="h-8 w-px bg-slate-200" />
                <button @click="showAddForm = true" class="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white font-semibold rounded-xl hover:bg-teal-700 transition-all shadow-lg shadow-teal-600/20">
                    <Plus class="w-5 h-5" /> Tambah Tamu
                </button>
            </div>
        </div>

        <!-- Custom Message Section -->
        <div class="bg-white rounded-3xl p-6 lg:p-8 border border-slate-200 shadow-sm overflow-hidden relative">
            <div class="absolute top-0 right-0 w-32 h-32 bg-teal-50 rounded-full -mr-16 -mt-16 opacity-50" />
            <div class="relative z-10 flex flex-col lg:flex-row gap-8 items-start">
                <div class="flex-1 space-y-4">
                    <div class="flex items-center gap-2 text-teal-700 font-bold text-sm uppercase tracking-wider">
                        <MessageSquare class="w-4 h-4" /> Pesan Undangan WhatsApp
                    </div>
                    <p class="text-sm text-slate-500 italic">Pesan ini akan dikirimkan bersama link undangan personal tamu.</p>
                    <textarea 
                        v-model="invitationMessage"
                        rows="4"
                        class="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all outline-none text-slate-700"
                        placeholder="Tulis pesan undanganmu di sini..."
                    ></textarea>
                    <div class="flex items-center justify-between">
                        <span class="text-xs text-slate-400">Tersimpan otomatis ke database undangan Anda.</span>
                        <button 
                            @click="saveMessage" 
                            :disabled="savingMessage"
                            class="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-all disabled:opacity-50"
                        >
                            <Loader2 v-if="savingMessage" class="w-4 h-4 animate-spin" />
                            <Check v-else class="w-4 h-4" />
                            Simpan Pesan
                        </button>
                    </div>
                </div>
                <div class="w-full lg:w-72 grid grid-cols-1 gap-4">
                    <div class="p-5 rounded-2xl bg-teal-50 border border-teal-100">
                        <p class="text-xs text-teal-600 font-bold uppercase mb-1">Total Tamu</p>
                        <p class="text-3xl font-black text-teal-900">{{ stats.total }}</p>
                    </div>
                    <div class="p-5 rounded-2xl bg-amber-50 border border-amber-100">
                        <p class="text-xs text-amber-600 font-bold uppercase mb-1">VIP & VVIP</p>
                        <p class="text-3xl font-black text-amber-900">{{ stats.vip }}</p>
                    </div>
                    <div class="p-5 rounded-2xl bg-emerald-50 border border-emerald-100">
                        <p class="text-xs text-emerald-600 font-bold uppercase mb-1">Sudah Check-in</p>
                        <p class="text-3xl font-black text-emerald-900">{{ stats.checkedIn }}</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Toolbar -->
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200">
            <div class="relative flex-1 max-w-md">
                <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                    v-model="searchQuery"
                    type="text"
                    placeholder="Cari nama, nomor, atau alamat..."
                    class="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-transparent rounded-xl focus:bg-white focus:border-teal-500 transition-all outline-none"
                />
            </div>
            <div class="flex items-center gap-2">
                <button @click="isImportModalOpen = true" class="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all font-medium">
                    <FileUp class="w-4 h-4" /> Import Excel/CSV
                </button>
                
                <div class="relative">
                    <button 
                        @click="showExportDropdown = !showExportDropdown" 
                        class="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all font-medium"
                    >
                        <FileDown class="w-4 h-4" /> Export <ChevronDown class="w-4 h-4" />
                    </button>
                    
                    <div v-if="showExportDropdown" class="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 py-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        <button @click="handleExport('csv')" class="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center gap-3 text-sm text-slate-700 font-medium">
                            <FileDown class="w-4 h-4 text-emerald-600" /> Export ke CSV
                        </button>
                        <button @click="handleExport('excel')" class="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center gap-3 text-sm text-slate-700 font-medium">
                            <Download class="w-4 h-4 text-teal-600" /> Export ke Excel
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Guest List Table -->
        <div class="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            <div class="overflow-x-auto">
                <table class="w-full text-left">
                    <thead>
                        <tr class="bg-slate-50/50 border-b border-slate-100">
                            <th class="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Nama Tamu</th>
                            <th class="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">WhatsApp</th>
                            <th class="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Alamat</th>
                            <th class="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                            <th class="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Tamu</th>
                            <th class="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Check-in</th>
                            <th class="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        <tr v-if="filteredGuests.length === 0" class="hover:bg-slate-50/30">
                            <td colspan="7" class="px-6 py-12 text-center text-slate-400 italic">
                                Belum ada data tamu. Klik "Tambah Tamu" atau "Import" untuk memulai.
                            </td>
                        </tr>
                        <tr v-for="guest in filteredGuests" :key="guest.id" class="hover:bg-slate-50/50 transition-colors group">
                            <td class="px-6 py-4">
                                <span class="font-semibold text-slate-800 block">{{ guest.name }}</span>
                                <span class="text-[10px] text-slate-400 font-mono uppercase tracking-tighter">{{ guest.checkInCode }}</span>
                            </td>
                            <td class="px-6 py-4 text-slate-600 tabular-nums">
                                {{ guest.phone || '-' }}
                            </td>
                            <td class="px-6 py-4">
                                <div class="flex items-center gap-1 group/addr">
                                    <input 
                                        :value="guest.address" 
                                        @blur="updateGuestField(guest, 'address', ($event.target as HTMLInputElement).value)"
                                        class="bg-transparent border-none p-0 text-sm text-slate-600 focus:ring-0 w-32 outline-none border-b border-transparent hover:border-slate-200 focus:border-teal-500"
                                    />
                                    <Edit2 class="w-3 h-3 text-slate-300 opacity-0 group-hover/addr:opacity-100" />
                                </div>
                            </td>
                            <td class="px-6 py-4">
                                <select 
                                    :value="guest.tier" 
                                    @change="updateGuestField(guest, 'tier', ($event.target as HTMLSelectElement).value)"
                                    :class="[
                                        'text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full border-none focus:ring-2 outline-none cursor-pointer',
                                        guest.tier === 'vvip' ? 'bg-purple-100 text-purple-700 ring-purple-200' :
                                        guest.tier === 'vip' ? 'bg-amber-100 text-amber-700 ring-amber-200' :
                                        'bg-slate-100 text-slate-600 ring-slate-200'
                                    ]"
                                >
                                    <option value="reguler">Reguler</option>
                                    <option value="vip">VIP</option>
                                    <option value="vvip">VVIP</option>
                                </select>
                            </td>
                            <td class="px-6 py-4 text-center text-slate-600 font-medium">
                                {{ guest.guestCount }}
                            </td>
                            <td class="px-6 py-4">
                                <span v-if="guest.checkedInAt" class="flex items-center gap-1 text-emerald-600 text-xs font-bold">
                                    <Check class="w-3 h-3" /> HADIR
                                </span>
                                <span v-else class="text-slate-300 text-[10px] font-bold">BELUM HADIR</span>
                            </td>
                            <td class="px-6 py-4 text-right">
                                <div class="flex items-center justify-end gap-2">
                                    <button 
                                        @click="shareWhatsApp(guest)"
                                        class="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                                        title="Kirim WA"
                                    >
                                        <MessageSquare class="w-4 h-4" />
                                    </button>
                                    <button 
                                        @click="copyGuestLink(guest)"
                                        class="p-2 bg-teal-50 text-teal-600 rounded-lg hover:bg-teal-100 transition-colors"
                                        title="Copy Link"
                                    >
                                        <Copy class="w-4 h-4" />
                                    </button>
                                    <button 
                                        @click="handleDeleteGuest(guest.id)"
                                        class="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors"
                                        title="Hapus"
                                    >
                                        <Trash2 class="w-4 h-4" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </main>

    <!-- Modal: Tambah Tamu -->
    <div v-if="showAddForm" class="fixed inset-0 z-50 flex items-center justify-center p-4 min-h-screen">
        <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" @click="showAddForm = false" />
        <div class="relative bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl animate-in zoom-in duration-300">
            <h2 class="text-2xl font-black text-slate-900 mb-6">Tambah Tamu Baru</h2>
            <div class="space-y-4">
                <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Nama Lengkap</label>
                    <input v-model="newGuest.name" type="text" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-teal-500" placeholder="Contoh: Bpk. Budi & Kel." />
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">WhatsApp (Opsional)</label>
                    <input v-model="newGuest.phone" type="text" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-teal-500" placeholder="Contoh: 0812..." />
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Alamat/Meja</label>
                        <input v-model="newGuest.address" type="text" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-teal-500" />
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Status</label>
                        <select v-model="newGuest.tier" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-teal-500">
                            <option value="reguler">Reguler</option>
                            <option value="vip">VIP</option>
                            <option value="vvip">VVIP</option>
                        </select>
                    </div>
                </div>
            </div>
            <div class="mt-8 flex gap-3">
                <button @click="showAddForm = false" class="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl">Batal</button>
                <button @click="handleAddGuest" class="flex-1 py-3 bg-teal-600 text-white font-bold rounded-xl shadow-lg shadow-teal-600/20 hover:bg-teal-700">Simpan Tamu</button>
            </div>
        </div>
    </div>

    <!-- Modal: Import -->
    <div v-if="isImportModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" @click="isImportModalOpen = false" />
        <div class="relative bg-white w-full max-w-lg rounded-3xl p-8 shadow-2xl overflow-hidden">
            <div class="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-teal-500 to-emerald-500" />
            <h2 class="text-2xl font-black text-slate-900 mb-2">Import Daftar Tamu</h2>
            <p class="text-slate-500 mb-6 font-medium">Unggah file CSV atau Excel untuk menambahkan tamu massal secara kilat.</p>
            
            <div class="p-6 bg-amber-50 rounded-2xl border border-amber-100 mb-6 flex gap-4">
                <div class="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <Info class="w-5 h-5 text-amber-600" />
                </div>
                <div class="space-y-1">
                    <h4 class="font-bold text-amber-800 text-sm">Gunakan Format yang Benar</h4>
                    <p class="text-xs text-amber-700/80 leading-relaxed">Penting bagi sistem untuk mengenali struktur data Anda. Silakan unduh template kami di bawah ini.</p>
                    <button @click="downloadImportFormat" class="text-xs font-black text-amber-800 underline uppercase tracking-wider mt-2 hover:text-amber-950">Unduh Format Template</button>
                </div>
            </div>

            <div class="border-2 border-dashed border-slate-200 rounded-3xl p-10 flex flex-col items-center justify-center hover:border-teal-500 hover:bg-teal-50/30 transition-all cursor-pointer relative group">
                <input type="file" @change="handleFileUpload" class="absolute inset-0 opacity-0 cursor-pointer" accept=".csv" />
                <div class="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-teal-100 group-hover:text-teal-600 transition-colors mb-4">
                    <FileUp class="w-8 h-8" />
                </div>
                <p class="font-bold text-slate-700">Klik atau seret file CSV ke sini</p>
                <p class="text-xs text-slate-400 mt-1 uppercase tracking-widest font-bold">Maksimal 5MB | Format .csv</p>
            </div>

            <div class="mt-8 flex justify-end">
                <button @click="isImportModalOpen = false" class="px-6 py-3 text-slate-500 font-bold hover:text-slate-800">Tutup</button>
            </div>
        </div>
    </div>
  </div>
</template>

<style scoped>
select {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
}
</style>
