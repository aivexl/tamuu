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
    createdAt: string;
    updatedAt: string;
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
        const headers = ['Nama', 'WhatsApp', 'Alamat', 'Status', 'Jumlah Tamu', 'Kode Check-in', 'Status Check-in'];
        const rows = guests.map(g => [
            g.name,
            g.phone || '',
            g.address,
            g.tier.toUpperCase(),
            g.guestCount,
            g.checkInCode || '',
            g.checkedInAt ? 'Sudah Masuk' : 'Belum Masuk'
        ]);

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
    }
};
