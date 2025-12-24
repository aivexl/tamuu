import axios from 'axios';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';

const API_URL = "https://tamuu-api.shafania57.workers.dev/api";

/**
 * Helper to get auth headers
 */
async function getAuthHeaders() {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
}

export interface Guest {
    id: string;
    invitationId: string;
    name: string;
    phone: string | null;
    address: string;
    tier: 'reguler' | 'vip' | 'vvip';
    guestCount: number;
    checkInCode: string | null;
    checkedInAt: string | null;
    checkedOutAt: string | null;
    sharedAt: string | null;
    tableNumber: string | null;
    createdAt: string;
    updatedAt: string;
}

/**
 * Format phone number for export (ensure it starts with international code)
 */
function formatPhoneNumberInternational(phone: string | null): string {
    if (!phone) return '-';
    // Remove non-digits
    let cleaned = phone.replace(/\D/g, '');
    if (!cleaned) return '-';

    // If starts with 0, replace with 62
    if (cleaned.startsWith('0')) {
        return '62' + cleaned.substring(1);
    }

    return cleaned;
}

export const guestsApi = {
    /**
     * Get all guests for an invitation
     */
    async getGuests(invitationId: string): Promise<Guest[]> {
        const headers = await getAuthHeaders();
        const response = await axios.get(`${API_URL}/guests/${invitationId}`, {
            headers,
            withCredentials: true
        });
        return response.data.guests;
    },

    /**
     * Get summary stats for all guests
     */
    async getGuestStats(): Promise<{ totalGuests: number }> {
        const headers = await getAuthHeaders();
        const response = await axios.get(`${API_URL}/guests/stats/summary`, {
            headers,
            withCredentials: true
        });
        return response.data;
    },

    /**
     * Add a single guest
     */
    async addGuest(invitationId: string, guest: Partial<Guest>): Promise<Guest> {
        const headers = await getAuthHeaders();
        const response = await axios.post(`${API_URL}/guests/${invitationId}`, guest, {
            headers,
            withCredentials: true
        });
        return response.data.guest;
    },

    /**
     * Update guest details
     */
    async updateGuest(guestId: string, updates: Partial<Guest>): Promise<void> {
        const headers = await getAuthHeaders();
        await axios.put(`${API_URL}/guests/${guestId}`, updates, {
            headers,
            withCredentials: true
        });
    },

    /**
     * Delete guest
     */
    async deleteGuest(guestId: string): Promise<void> {
        const headers = await getAuthHeaders();
        await axios.delete(`${API_URL}/guests/${guestId}`, {
            headers,
            withCredentials: true
        });
    },

    /**
     * Bulk add guests
     */
    async bulkAddGuests(invitationId: string, guests: Partial<Guest>[]): Promise<{ count: number }> {
        const headers = await getAuthHeaders();
        const response = await axios.post(`${API_URL}/guests/${invitationId}/bulk`, { guests }, {
            headers,
            withCredentials: true
        });
        return response.data;
    },

    /**
     * Export guests to CSV
     */
    exportToCSV(guests: Guest[], filename = 'daftar-tamu.csv') {
        const headers = [
            'ID TAMU', 'TIER', 'NAMA TAMU', 'NO WHATSAPP', 'ALAMAT', 'MEJA/KURSI/RUANGAN', 'JUMLAH TAMU',
            'DATES CHECK IN', 'CHECK-IN', 'CHECK-OUT', 'KEHADIRAN', 'SEND WA', 'STATUS'
        ];

        const rows = guests.map(g => {
            const checkInDate = g.checkedInAt ? new Date(g.checkedInAt).toLocaleDateString('id-ID') : '-';
            const checkInTime = g.checkedInAt ? new Date(g.checkedInAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : '-';
            const checkOutTime = g.checkedOutAt ? new Date(g.checkedOutAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : '-';

            return [
                g.checkInCode || '-',
                g.tier.toUpperCase(),
                g.name,
                formatPhoneNumberInternational(g.phone),
                g.address,
                g.tableNumber || '-',
                g.guestCount,
                checkInDate,
                checkInTime,
                checkOutTime,
                g.checkedInAt ? 'HADIR' : 'BELUM HADIR',
                g.sharedAt ? 'SUDAH' : 'BELUM',
                g.sharedAt ? 'TERKIRIM' : 'BELUM'
            ];
        });

        const content = [
            headers.join(','),
            ...rows.map(r => r.map(val => `"${val}"`).join(','))
        ].join('\n');

        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    /**
     * Export guests to Excel (.xlsx)
     */
    exportToExcel(guests: Guest[], filename = 'daftar-tamu.xlsx') {
        const headers = [
            'ID TAMU', 'TIER', 'NAMA TAMU', 'NO WHATSAPP', 'ALAMAT', 'MEJA/KURSI/RUANGAN', 'JUMLAH TAMU',
            'DATES CHECK IN', 'CHECK-IN', 'CHECK-OUT', 'KEHADIRAN', 'SEND WA', 'STATUS'
        ];

        const data = guests.map(g => {
            const checkInDate = g.checkedInAt ? new Date(g.checkedInAt).toLocaleDateString('id-ID') : '-';
            const checkInTime = g.checkedInAt ? new Date(g.checkedInAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : '-';
            const checkOutTime = g.checkedOutAt ? new Date(g.checkedOutAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : '-';

            return {
                'ID TAMU': g.checkInCode || '-',
                'TIER': g.tier.toUpperCase(),
                'NAMA TAMU': g.name,
                'NO WHATSAPP': formatPhoneNumberInternational(g.phone),
                'ALAMAT': g.address,
                'MEJA/KURSI/RUANGAN': g.tableNumber || '-',
                'JUMLAH TAMU': g.guestCount,
                'DATES CHECK IN': checkInDate,
                'CHECK-IN': checkInTime,
                'CHECK-OUT': checkOutTime,
                'KEHADIRAN': g.checkedInAt ? 'HADIR' : 'BELUM HADIR',
                'SEND WA': g.sharedAt ? 'SUDAH' : 'BELUM',
                'STATUS': g.sharedAt ? 'TERKIRIM' : 'BELUM'
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(data, { header: headers });

        // Autofit columns
        const colWidths = headers.map(header => {
            const lengths = [header.length, ...data.map(row => String((row as any)[header] || '').length)];
            return { wch: Math.max(...lengths) + 2 };
        });
        worksheet['!cols'] = colWidths;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Daftar Tamu');

        XLSX.writeFile(workbook, filename);
    }
};
