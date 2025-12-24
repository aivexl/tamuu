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
import * as XLSX from 'xlsx';
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

// Share Confirm Modal State
const showShareConfirm = ref(false);
const pendingShareGuest = ref<Guest | null>(null);

// Guest Form State
const showAddForm = ref(false);
const isSubmittingAdd = ref(false);
const newGuest = ref({
    name: '',
    phone: '',
    address: 'di tempat',
    tableNumber: '',
    tier: 'reguler' as const,
    guestCount: 1
});

// Country Codes from countries-list library
import { countries } from 'countries-list';

// Helper function to convert ISO country code to emoji flag
function isoToEmoji(isoCode: string): string {
    return isoCode
        .toUpperCase()
        .split('')
        .map(char => String.fromCodePoint(127397 + char.charCodeAt(0)))
        .join('');
}

// Build country codes list from the library (without ISO in display)
const allCountryCodes = Object.entries(countries).map(([iso, data]) => ({
    code: String(data.phone[0] || ''),
    flag: isoToEmoji(iso),
    name: data.name
})).filter(c => c.code); // Filter out countries without phone codes

// Indonesia should always be at the top, then sort alphabetically
const sortedCountryCodes = computed(() => {
    const list = [...allCountryCodes].sort((a, b) => a.name.localeCompare(b.name));
    const indoIdx = list.findIndex(c => c.code === '62');
    if (indoIdx > -1) {
        const indo = list.splice(indoIdx, 1)[0];
        list.unshift(indo);
    }
    return list;
});

const selectedCountryCode = ref('62');
const selectedEditCountryCode = ref('62');

function getFlag(phone: string | null) {
    if (!phone) return '🇮🇩';
    // Sort codes by length descending to match longest possible prefix first (e.g. 673 before 6)
    const sortedByLen = [...allCountryCodes].sort((a, b) => b.code.length - a.code.length);
    const match = sortedByLen.find(c => phone.startsWith(c.code));
    return match ? match.flag : ''; // Remove globe icon
}

function formatPhoneDisplay(phone: string | null) {
    if (!phone) return '-';
    // Just show the number, the flag will be next to it
    return '+' + phone;
}

function sanitizePhoneNumber(phone: string, countryCode: string): string {
    let cleaned = phone.replace(/\D/g, '');
    if (!cleaned) return '';
    
    // Check if user already entered a number with a valid country code
    // Sort by length descending to avoid partial matches (e.g. 1 matching a number starting with 12)
    const sortedByLen = [...allCountryCodes].sort((a, b) => b.code.length - a.code.length);
    for (const c of sortedByLen) {
        if (cleaned.startsWith(c.code)) {
            // Already starts with a valid international code, do not force 62 or anything else
            return cleaned; 
        }
    }

    // If starts with 0 (traditional local format), strip it and use the ACTIVE country code from dropdown
    if (cleaned.startsWith('0')) {
        return countryCode + cleaned.substring(1);
    }
    
    // Otherwise, assume it's a local number without 0 and prepend active country code
    return countryCode + cleaned;
}

// Edit Guest State
const showEditForm = ref(false);
const isSubmittingEdit = ref(false);
const editingGuest = ref<Guest | null>(null);
const editForm = ref({
    name: '',
    phone: '',
    address: '',
    tableNumber: '',
    tier: 'reguler' as Guest['tier'],
    guestCount: 1
});

// Computed
const filteredGuests = computed(() => {
    if (!searchQuery.value) return guests.value;
    const q = searchQuery.value.toLowerCase();
    return guests.value.filter(g => 
        g.name.toLowerCase().includes(q) || 
        g.phone?.includes(q) || 
        g.address?.toLowerCase().includes(q) ||
        g.checkInCode?.toLowerCase().includes(q)
    );
});

const stats = computed(() => {
    const total = guests.value.reduce((acc, g) => acc + (g.guestCount || 0), 0);
    const vip = guests.value.filter(g => g.tier === 'vip' || g.tier === 'vvip').length;
    const checkedIn = guests.value.filter(g => g.checkedInAt).length;
    const waSent = guests.value.filter(g => g.sharedAt).length;
    const checkedOut = guests.value.filter(g => g.checkedOutAt).length;
    return { total, vip, checkedIn, waSent, checkedOut };
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
    if (!newGuest.value.name || isSubmittingAdd.value) return;
    isSubmittingAdd.value = true;
    try {
        const sanitizedData = {
            ...newGuest.value,
            phone: newGuest.value.phone ? sanitizePhoneNumber(newGuest.value.phone, selectedCountryCode.value) : null
        };
        const created = await guestsApi.addGuest(invitationId, sanitizedData);
        guests.value.unshift(created);
        showAddForm.value = false;
        newGuest.value = { name: '', phone: '', address: 'di tempat', tableNumber: '', tier: 'reguler', guestCount: 1 };
        showToast('Tamu berhasil ditambahkan');
    } catch (e) {
        console.error('Add guest failed:', e);
        showToast('Gagal menambahkan tamu');
    } finally {
        isSubmittingAdd.value = false;
    }
}

const showDeleteConfirm = ref(false);
const guestToDelete = ref<Guest | null>(null);

function handleDeleteGuest(guest: Guest) {
    guestToDelete.value = guest;
    showDeleteConfirm.value = true;
}

async function confirmDelete() {
    if (!guestToDelete.value) return;
    try {
        await guestsApi.deleteGuest(guestToDelete.value.id);
        guests.value = guests.value.filter(g => g.id !== guestToDelete.value!.id);
        showDeleteConfirm.value = false;
        guestToDelete.value = null;
        showToast('Tamu berhasil dihapus');
    } catch (e) {
        console.error('Delete failed:', e);
        showToast('Gagal menghapus tamu');
    }
}


function openEditModal(guest: Guest) {
    editingGuest.value = guest;
    
    // Determine country code from phone
    let phoneStr = guest.phone || '';
    let foundCode = '62';
    
    // Sort codes by length descending to match longest possible prefix first
    const sortedByLen = [...allCountryCodes].sort((a, b) => b.code.length - a.code.length);
    for (const c of sortedByLen) {
        if (phoneStr.startsWith(c.code)) {
            foundCode = c.code;
            phoneStr = phoneStr.substring(c.code.length);
            break;
        }
    }
    selectedEditCountryCode.value = foundCode;

    editForm.value = {
        name: guest.name,
        phone: phoneStr,
        address: guest.address,
        tableNumber: guest.tableNumber || '',
        tier: guest.tier,
        guestCount: guest.guestCount
    };
    showEditForm.value = true;
}

async function handleUpdateGuest() {
    if (!editingGuest.value || isSubmittingEdit.value) return;
    
    // Capture the ID and data to prevent race conditions if modal is closed
    const guestId = editingGuest.value.id;
    const updateData = { 
        ...editForm.value,
        phone: editForm.value.phone ? sanitizePhoneNumber(editForm.value.phone, selectedEditCountryCode.value) : null
    };
    
    isSubmittingEdit.value = true;
    try {
        await guestsApi.updateGuest(guestId, updateData);
        
        // Update local state using captured ID and sanitized data
        const idx = guests.value.findIndex(g => g.id === guestId);
        if (idx !== -1) {
            guests.value[idx] = { 
                ...guests.value[idx], 
                ...updateData
            } as Guest;
        }
        
        showEditForm.value = false;
        editingGuest.value = null;
        showToast('Data tamu diperbarui');
    } catch (e) {
        console.error('Update guest failed:', e);
        showToast('Gagal memperbarui data tamu');
    } finally {
        isSubmittingEdit.value = false;
    }
}

const toast = ref({ show: false, message: '' });
let toastTimeout: any = null;

function showToast(message: string) {
    toast.value.message = message;
    toast.value.show = true;
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.value.show = false;
    }, 3000);
}

function copyGeneralLink() {
    if (!invitation.value?.slug) return;
    const url = `https://tamuu.id/${invitation.value.slug}`;
    navigator.clipboard.writeText(url);
    showToast('Link General disalin!');
}

function copyGuestLink(guest: Guest) {
    if (!invitation.value?.slug) return;
    const url = `https://tamuu.id/${invitation.value.slug}?to=${encodeURIComponent(guest.name)}`;
    navigator.clipboard.writeText(url);
    showToast(`Link untuk ${guest.name} disalin!`);
}

async function shareWhatsApp(guest: Guest) {
    if (!invitation.value?.slug) return;
    const phone = guest.phone ? guest.phone.replace(/\D/g, '') : '';
    const formattedPhone = phone.startsWith('0') ? '62' + phone.substring(1) : phone;
    
    const message = `${invitationMessage.value}\n\nLink Undangan: https://tamuu.id/${invitation.value.slug}?to=${encodeURIComponent(guest.name)}`;
    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    
    // Use visibilitychange event to detect when user returns from WhatsApp
    const handleVisibilityChange = async () => {
        if (document.visibilityState === 'visible') {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            // Small delay to ensure smooth UX
            await new Promise(resolve => setTimeout(resolve, 300));
            // Show professional modal
            pendingShareGuest.value = guest;
            showShareConfirm.value = true;
        }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
}

async function confirmShareSuccess() {
    if (pendingShareGuest.value) {
        await markAsShared(pendingShareGuest.value.id);
    }
    showShareConfirm.value = false;
    pendingShareGuest.value = null;
}

function cancelShareConfirm() {
    showShareConfirm.value = false;
    pendingShareGuest.value = null;
}

async function markAsShared(guestId: string) {
    try {
        const sharedAt = new Date().toISOString();
        
        // Optimistic update: update local state immediately
        const idx = guests.value.findIndex(g => g.id === guestId);
        if (idx !== -1) {
            guests.value[idx] = { ...guests.value[idx], sharedAt } as Guest;
        }
        
        // Persist to backend without blocking UI refresh
        await guestsApi.updateGuest(guestId, { sharedAt });
    } catch (e) {
        console.error('Failed to mark as shared:', e);
        // On error, we might want to refresh to get correct state
        await loadData();
    }
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
    const headers = ['TIER', 'NAMA TAMU', 'NO WHATSAPP', 'ALAMAT', 'JUMLAH TAMU', 'MEJA/KURSI/RUANGAN'];
    const data = [
        ['VIP', 'Joni Saputra', '628123456789', 'Bandung', 2, 'Meja A1'],
        ['REGULER', 'Siti Aminah', '628987654321', 'di tempat', 1, 'Room 302']
    ];
    
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
    
    // Add dropdown validation for TIER column (A2:A100)
    if (!worksheet['!dataValidation']) worksheet['!dataValidation'] = [];
    // Note: Standard XLSX library doesn't support data validation easily WITHOUT extra plugins or manual XML manipulation.
    // For now, I'll provide a clean Excel file with instructions.
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Format Import');
    XLSX.writeFile(workbook, 'format-import-tamu.xlsx');
}

async function handleFileUpload(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    if (file.name.endsWith('.csv')) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result as string;
            processData(text, 'csv');
        };
        reader.readAsText(file);
    } else {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            if (!sheetName) return;
            const worksheet = workbook.Sheets[sheetName];
            if (!worksheet) return;
            const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            processData(json, 'excel');
        };
        reader.readAsArrayBuffer(file);
    }
}

async function processData(data: any, format: 'csv' | 'excel') {
    let importedGuests: any[] = [];
    
    if (format === 'csv') {
        const lines = data.split('\n');
        importedGuests = lines.slice(1).filter((l: string) => l.trim()).map((line: string) => {
            const cols = line.split(',');
            return {
                tier: (cols[0]?.trim().toLowerCase() || 'reguler') as any,
                name: cols[1]?.trim() || '',
                phone: cols[2] ? sanitizePhoneNumber(cols[2].toString().trim(), selectedCountryCode.value) : '',
                address: cols[3]?.trim() || 'di tempat',
                guestCount: parseInt(cols[4] || '1') || 1,
                tableNumber: cols[5]?.toString().trim() || ''
            };
        });
    } else {
        // Excel data is array of arrays
        importedGuests = data.slice(1).map((cols: any) => ({
            tier: (String(cols[0] || '').trim().toLowerCase() || 'reguler') as any,
            name: String(cols[1] || '').trim(),
            phone: cols[2] ? sanitizePhoneNumber(String(cols[2]).trim(), selectedCountryCode.value) : '',
            address: String(cols[3] || '').trim() || 'di tempat',
            guestCount: parseInt(cols[4] || '1') || 1,
            tableNumber: String(cols[5] || '').trim() || ''
        }));
    }

    importedGuests = importedGuests.filter((g: any) => g.name);

    if (importedGuests.length > 0) {
        try {
            await guestsApi.bulkAddGuests(invitationId, importedGuests);
            await loadData();
            isImportModalOpen.value = false;
            showToast(`Berhasil mengimpor ${importedGuests.length} tamu.`);
        } catch (err) {
            showToast('Gagal mengimpor tamu. Periksa format file Anda.');
        }
    }
}

onMounted(loadData);
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex flex-col">
    <AppHeader />

    <main class="w-full p-4 lg:p-8 space-y-8">
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
                <div class="w-full lg:w-96 grid grid-cols-2 gap-3">
                    <div class="p-4 rounded-2xl bg-teal-50 border border-teal-100 col-span-2">
                        <p class="text-[10px] text-teal-600 font-bold uppercase mb-0.5">Total Tamu (Orang)</p>
                        <p class="text-2xl font-black text-teal-900">{{ stats.total }}</p>
                    </div>
                    <div class="p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
                        <p class="text-[10px] text-indigo-600 font-bold uppercase mb-0.5">WA Terkirim</p>
                        <p class="text-2xl font-black text-indigo-900">{{ stats.waSent }}</p>
                    </div>
                    <div class="p-4 rounded-2xl bg-amber-50 border border-amber-100">
                        <p class="text-[10px] text-amber-600 font-bold uppercase mb-0.5">VIP & VVIP</p>
                        <p class="text-2xl font-black text-amber-900">{{ stats.vip }}</p>
                    </div>
                    <div class="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                        <p class="text-[10px] text-emerald-600 font-bold uppercase mb-0.5">Sudah Check-in</p>
                        <p class="text-2xl font-black text-emerald-900">{{ stats.checkedIn }}</p>
                    </div>
                    <div class="p-4 rounded-2xl bg-rose-50 border border-rose-100">
                        <p class="text-[10px] text-rose-600 font-bold uppercase mb-0.5">Sudah Check-out</p>
                        <p class="text-2xl font-black text-rose-900">{{ stats.checkedOut }}</p>
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
        <div class="rounded-3xl overflow-visible p-1">
            <div class="w-full overflow-visible">
                <table class="w-full text-left table-fixed border-separate border-spacing-0">
                    <thead>
                        <tr class="bg-[#2C5F5F] text-white">
                            <th class="col-id px-3 py-4 text-[11px] font-black uppercase tracking-tight whitespace-nowrap">ID TAMU</th>
                            <th class="col-tier px-3 py-4 text-[11px] font-black uppercase tracking-tight whitespace-nowrap">TIER</th>
                            <th class="col-name px-3 py-4 text-[11px] font-black uppercase tracking-tight whitespace-nowrap w-[150px]">NAMA TAMU</th>
                            <th class="col-phone px-3 py-4 text-[11px] font-black uppercase tracking-tight whitespace-nowrap w-[120px]">NO WHATSAPP</th>
                            <th class="col-addr px-3 py-4 text-[11px] font-black uppercase tracking-tight whitespace-nowrap">ALAMAT</th>
                            <th class="col-table px-3 py-4 text-[11px] font-black uppercase tracking-tight whitespace-nowrap">MEJA/KURSI/RUANGAN</th>
                            <th class="col-count px-3 py-4 text-[11px] font-black uppercase tracking-tight whitespace-nowrap text-center">JUMLAH TAMU</th>
                            <th class="col-time px-3 py-4 text-[11px] font-black uppercase tracking-tight whitespace-nowrap">DATE</th>
                            <th class="col-time-long px-3 py-4 text-[11px] font-black uppercase tracking-tight whitespace-nowrap">CHECK-IN</th>
                            <th class="col-time-long px-3 py-4 text-[11px] font-black uppercase tracking-tight whitespace-nowrap">CHECK-OUT</th>
                            <th class="col-status px-3 py-4 text-[11px] font-black uppercase tracking-tight whitespace-nowrap text-center">KEHADIRAN</th>
                            <th class="col-send px-3 py-4 text-[11px] font-black uppercase tracking-tight whitespace-nowrap text-center">SEND WA</th>
                            <th class="col-status px-3 py-4 text-[11px] font-black uppercase tracking-tight whitespace-nowrap text-center">STATUS</th>
                            <th class="col-action px-3 py-4 text-[11px] font-black uppercase tracking-tight whitespace-nowrap text-center">COPY</th>
                            <th class="col-action px-2 py-4 text-[11px] font-black uppercase tracking-tight whitespace-nowrap text-center">EDIT</th>
                            <th class="col-delete px-2 py-4 text-[11px] font-black uppercase tracking-tight whitespace-nowrap text-center">DELETE</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        <tr v-if="filteredGuests.length === 0" class="hover:bg-slate-50/30">
                            <td colspan="16" class="px-6 py-12 text-center text-slate-400 italic">
                                Belum ada data tamu. Klik "Tambah Tamu" atau "Import" untuk memulai.
                            </td>
                        </tr>
                        <tr v-for="guest in filteredGuests" :key="guest.id" class="hover:bg-slate-50 transition-all duration-200">
                            <td class="col-id px-3 py-5 text-[12px] font-mono text-slate-500 uppercase font-bold tracking-tight">
                                {{ guest.checkInCode }}
                            </td>
                            <td class="col-tier px-3 py-5 text-center">
                                <span :class="[
                                    'text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ring-1 ring-inset',
                                    guest.tier === 'vvip' ? 'bg-purple-50 text-purple-700 ring-purple-100' :
                                    guest.tier === 'vip' ? 'bg-amber-50 text-amber-700 ring-amber-100' :
                                    'bg-slate-50 text-slate-600 ring-slate-100'
                                ]">
                                    {{ guest.tier === 'reguler' ? 'REG' : guest.tier.toUpperCase() }}
                                </span>
                            </td>
                            <td class="col-name px-3 py-5">
                                <span class="text-[12px] font-black text-slate-800 truncate block">{{ guest.name }}</span>
                            </td>
                            <td class="col-phone px-3 py-5 text-[12px] font-bold text-slate-700">
                                <span class="flex items-center gap-1.5">
                                    <span v-if="getFlag(guest.phone)" class="text-lg leading-none">{{ getFlag(guest.phone) }}</span>
                                    <span class="tabular-nums">+{{ guest.phone }}</span>
                                </span>
                            </td>
                            <td class="col-addr px-3 py-5 text-[12px] text-slate-600 truncate font-medium max-w-[120px]">
                                {{ guest.address }}
                            </td>
                            <td class="col-table px-3 py-5 text-[12px] font-black text-indigo-600 truncate animate-in slide-in-from-left-2 duration-500">
                                {{ guest.tableNumber || '-' }}
                            </td>
                            <td class="col-count px-3 py-5 text-center text-[13px] font-black text-[#2C5F5F]">
                                {{ guest.guestCount }}
                            </td>
                            <td class="col-time px-3 py-5 text-[11px] text-slate-500 font-bold whitespace-nowrap">
                                {{ guest.checkedInAt ? new Date(guest.checkedInAt).toLocaleDateString('id-ID', {day:'2-digit', month:'2-digit'}) : '-' }}
                            </td>
                            <td class="col-time-long px-3 py-5 text-[11px] text-slate-500 font-bold tabular-nums">
                                {{ guest.checkedInAt ? new Date(guest.checkedInAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }) : '-' }}
                            </td>
                            <td class="col-time-long px-3 py-5 text-[11px] text-slate-500 font-bold tabular-nums">
                                {{ guest.checkedOutAt ? new Date(guest.checkedOutAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }) : '-' }}
                            </td>
                            <td class="col-status px-3 py-5 text-center">
                                <span v-if="guest.checkedInAt" class="px-2 py-1 bg-emerald-100 text-emerald-700 text-[9px] font-black rounded-lg tracking-tight">HADIR</span>
                                <span v-else class="px-2 py-1 bg-slate-100 text-slate-300 text-[9px] font-black rounded-lg tracking-tight uppercase">BELUM</span>
                            </td>
                            <td class="col-send px-3 py-5 text-center relative hover:z-20">
                                <div class="relative group mx-auto w-fit">
                                    <button 
                                        @click="shareWhatsApp(guest)"
                                        :class="[
                                            'p-2 rounded-xl transition-all hover:scale-110 shadow-sm flex items-center justify-center',
                                            guest.sharedAt ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                                        ]"
                                    >
                                        <Check v-if="guest.sharedAt" class="w-4 h-4" />
                                        <MessageSquare v-else class="w-4 h-4" />
                                    </button>
                                    
                                    <!-- Tooltip -->
                                    <div v-if="guest.sharedAt" class="absolute invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 bottom-0 left-1/2 -translate-x-1/2 translate-y-full pt-2 z-[100]">
                                        <div class="bg-slate-900 text-white text-[10px] font-black py-1.5 px-3 rounded-lg whitespace-nowrap shadow-2xl ring-1 ring-white/10">
                                            Kirim Ulang WA
                                            <div class="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-2 h-2 bg-slate-900 rotate-45"></div>
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td class="col-status px-3 py-5 text-center">
                                <span v-if="guest.sharedAt" class="text-emerald-500 text-[10px] font-black tracking-tight">TERKIRIM</span>
                                <span v-else class="text-slate-300 text-[10px] font-black tracking-tight uppercase">BELUM</span>
                            </td>
                            <td class="col-action px-3 py-5 text-center">
                                <button @click="copyGuestLink(guest)" class="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all hover:scale-110">
                                    <Copy class="w-4 h-4" />
                                </button>
                            </td>
                            <td class="col-action px-2 py-5 text-center border-l border-slate-100">
                                <button @click="openEditModal(guest)" class="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-all hover:scale-110">
                                    <Edit2 class="w-4 h-4" />
                                </button>
                            </td>
                            <td class="col-delete px-2 py-5 text-center">
                                <button @click="handleDeleteGuest(guest)" class="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all hover:scale-110">
                                    <Trash2 class="w-4 h-4" />
                                </button>
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
                <div class="grid grid-cols-12 gap-3">
                    <div class="col-span-12 md:col-span-5">
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                            Negara <span class="text-indigo-500 font-black">+Kode</span>
                        </label>
                        <div class="relative group">
                            <select v-model="selectedCountryCode" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 appearance-none text-sm font-bold text-slate-700 transition-all cursor-pointer pr-10">
                                <option v-for="c in sortedCountryCodes" :key="c.code" :value="c.code">
                                    {{ c.flag }} {{ c.name }} +{{ c.code }}
                                </option>
                            </select>
                            <ChevronDown class="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none group-hover:text-teal-600 transition-colors" />
                        </div>
                    </div>
                    <div class="col-span-12 md:col-span-7">
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Nomor WhatsApp</label>
                        <div class="relative group">
                            <input v-model="newGuest.phone" type="text" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 text-sm font-bold text-slate-700 transition-all" placeholder="81234567..." />
                        </div>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Alamat</label>
                        <input v-model="newGuest.address" type="text" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-teal-500" placeholder="Contoh: Jakarta" />
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Tier (Kategori)</label>
                        <select v-model="newGuest.tier" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-teal-500">
                            <option value="reguler">Reguler</option>
                            <option value="vip">VIP</option>
                            <option value="vvip">VVIP</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Meja / Kursi / Ruangan (Opsional)</label>
                    <input v-model="newGuest.tableNumber" type="text" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500" placeholder="Contoh: Meja A1, Room 302, dsb." />
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Jumlah Tamu</label>
                    <input v-model="newGuest.guestCount" type="number" min="1" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-teal-500" />
                </div>
            </div>
            <div class="mt-8 flex gap-3">
                <button 
                    @click="showAddForm = false" 
                    :disabled="isSubmittingAdd"
                    class="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl disabled:opacity-50"
                >
                    Batal
                </button>
                <button 
                    @click="handleAddGuest" 
                    :disabled="isSubmittingAdd"
                    class="flex-1 py-3 bg-teal-600 text-white font-bold rounded-xl shadow-lg shadow-teal-600/20 hover:bg-teal-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    <Loader2 v-if="isSubmittingAdd" class="w-4 h-4 animate-spin" />
                    Simpan Tamu
                </button>
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
                <input type="file" @change="handleFileUpload" class="absolute inset-0 opacity-0 cursor-pointer" accept=".csv,.xlsx" />
                <div class="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-teal-100 group-hover:text-teal-600 transition-colors mb-4">
                    <FileUp class="w-8 h-8" />
                </div>
                <p class="font-bold text-slate-700 text-center">Klik atau seret file CSV/Excel ke sini</p>
                <p class="text-xs text-slate-400 mt-1 uppercase tracking-widest font-bold text-center">Maksimal 5MB | Format .csv, .xlsx</p>
            </div>

            <div class="mt-8 flex justify-end">
                <button @click="isImportModalOpen = false" class="px-6 py-3 text-slate-500 font-bold hover:text-slate-800">Tutup</button>
            </div>
        </div>
    </div>

    <!-- Modal: Share Confirmation -->
    <div v-if="showShareConfirm" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" @click="cancelShareConfirm" />
        <div class="relative bg-white w-full max-w-sm rounded-3xl p-8 shadow-2xl animate-in zoom-in duration-200 overflow-hidden">
            <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
            
            <!-- Icon -->
            <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-50 flex items-center justify-center">
                <MessageSquare class="w-8 h-8 text-emerald-600" />
            </div>
            
            <!-- Content -->
            <h3 class="text-xl font-black text-slate-900 text-center mb-2">Konfirmasi Pengiriman</h3>
            <p class="text-slate-500 text-center mb-6">
                Apakah pesan untuk <span class="font-bold text-slate-800">"{{ pendingShareGuest?.name }}"</span> berhasil dikirim via WhatsApp?
            </p>
            
            <!-- Buttons -->
            <div class="flex gap-3">
                <button 
                    @click="cancelShareConfirm"
                    class="flex-1 py-3 px-4 text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition-colors"
                >
                    Belum
                </button>
                <button 
                    @click="confirmShareSuccess"
                    class="flex-1 py-3 px-4 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                >
                    <Check class="w-4 h-4" /> Sudah Terkirim
                </button>
            </div>
        </div>
    </div>

    <!-- Modal: Edit Guest -->
    <div v-if="showEditForm" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" @click="showEditForm = false" />
        <div class="relative bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl animate-in zoom-in duration-300">
            <h2 class="text-2xl font-black text-slate-900 mb-6">Edit Data Tamu</h2>
            <div class="space-y-4">
                <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Nama Lengkap</label>
                    <input v-model="editForm.name" type="text" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-teal-500" placeholder="Contoh: Bpk. Budi & Kel." />
                </div>
                <div class="grid grid-cols-12 gap-3">
                    <div class="col-span-12 md:col-span-5">
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                            Negara <span class="text-blue-500 font-black">+Kode</span>
                        </label>
                        <div class="relative group">
                            <select v-model="selectedEditCountryCode" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 appearance-none text-sm font-bold text-slate-700 transition-all cursor-pointer pr-10">
                                <option v-for="c in sortedCountryCodes" :key="c.code" :value="c.code">
                                    {{ c.flag }} {{ c.name }} +{{ c.code }}
                                </option>
                            </select>
                            <ChevronDown class="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none group-hover:text-blue-600 transition-colors" />
                        </div>
                    </div>
                    <div class="col-span-12 md:col-span-7">
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Nomor WhatsApp</label>
                        <div class="relative group">
                            <input v-model="editForm.phone" type="text" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm font-bold text-slate-700 transition-all" placeholder="81234567..." />
                        </div>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Alamat</label>
                        <input v-model="editForm.address" type="text" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-teal-500" />
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Tier (Kategori)</label>
                        <select v-model="editForm.tier" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-teal-500">
                            <option value="reguler">Reguler</option>
                            <option value="vip">VIP</option>
                            <option value="vvip">VVIP</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Meja / Kursi / Ruangan (Opsional)</label>
                    <input v-model="editForm.tableNumber" type="text" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500" placeholder="Contoh: Meja A1, Room 302, dsb." />
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Jumlah Tamu</label>
                    <input v-model="editForm.guestCount" type="number" min="1" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-teal-500" />
                </div>
            </div>
            <div class="mt-8 flex gap-3">
                <button 
                    @click="showEditForm = false" 
                    :disabled="isSubmittingEdit"
                    class="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl disabled:opacity-50"
                >
                    Batal
                </button>
                <button 
                    @click="handleUpdateGuest" 
                    :disabled="isSubmittingEdit"
                    class="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    <Loader2 v-if="isSubmittingEdit" class="w-4 h-4 animate-spin" />
                    Simpan Perubahan
                </button>
            </div>
        </div>
    </div>
  </div>
    <!-- Modal: Konfirmasi Hapus -->
    <div v-if="showDeleteConfirm" class="fixed inset-0 z-[100] flex items-center justify-center p-4 min-h-screen">
        <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" @click="showDeleteConfirm = false" />
        <div class="relative bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl animate-in zoom-in duration-300 text-center">
            <div class="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 class="w-10 h-10" />
            </div>
            <h3 class="text-xl font-black text-slate-900 mb-2">Hapus Tamu?</h3>
            <p class="text-slate-500 text-sm mb-8">Data <b>{{ guestToDelete?.name }}</b> yang dihapus tidak dapat dikembalikan.</p>
            
            <div class="flex flex-col gap-3">
                <button 
                    @click="confirmDelete"
                    class="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-black rounded-2xl transition-all shadow-lg shadow-red-200"
                >
                    Hapus Sekarang
                </button>
                <button 
                    @click="showDeleteConfirm = false"
                    class="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-all"
                >
                    Batal
                </button>
            </div>
        </div>
    </div>

    <!-- Notification Toast -->
    <Transition
        enter-active-class="transform transition ease-out duration-300"
        enter-from-class="translate-y-10 opacity-0"
        enter-to-class="translate-y-0 opacity-100"
        leave-active-class="transition ease-in duration-200"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
    >
        <div v-if="toast.show" class="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200]">
            <div class="bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 ring-1 ring-white/10">
                <Check class="w-4 h-4 text-emerald-400" />
                <span class="text-sm font-bold tracking-tight">{{ toast.message }}</span>
            </div>
        </div>
    </Transition>
</template>

<style scoped>
select {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
}

/* Custom Table Styles */
table {
  border-collapse: separate;
  border-spacing: 0 12px; /* Row gap */
}

th {
  background-color: #2C5F5F;
  border-radius: 0;
  box-shadow: inset -1px 0 0 rgba(255, 255, 255, 0.1);
}

/* Header rounding */
thead tr th:first-child { border-radius: 16px 0 0 16px; }
thead tr th:last-child { border-radius: 0 16px 16px 0; }

td {
  background: white;
  border-top: 1px solid rgba(0,0,0,0.03);
  border-bottom: 1px solid rgba(0,0,0,0.03);
  position: relative;
  box-shadow: 0 2px 4px rgba(0,0,0,0.02); /* Very subtle bottom shadow */
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Column vertical shadow divider */
td {
  border-right: 1px solid rgba(0,0,0,0.04);
}

/* Row card feeling */
td:first-child {
  border-left: 1px solid rgba(0,0,0,0.03);
  border-radius: 16px 0 0 16px;
}

td:last-child {
  border-right: none;
  border-radius: 0 16px 16px 0;
}

tr:hover td {
  background-color: #f8fafc;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  border-color: rgba(44, 95, 95, 0.1);
}

/* Proportional widths (Total: 100%) */
.col-id { width: 4.5%; }
.col-tier { width: 4.5%; }
.col-name { width: 14%; }
.col-phone { width: 11%; }
.col-addr { width: 10%; }
.col-table { width: 10%; }
.col-count { width: 5%; }
.col-time { width: 5%; }
.col-time-long { width: 5%; } /* Two columns: 10% total */
.col-status { width: 5%; }    /* Two columns: 10% total */
.col-send { width: 5%; }
.col-action { width: 3%; }    /* Two columns: 6% total */
.col-delete { width: 5%; }

</style>
