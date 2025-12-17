'use client';

import React, { useState } from 'react';
import { RSVPFormConfig, RSVPResponse } from '@/lib/types';

interface RSVPFormProps {
    config: RSVPFormConfig;
    templateId: string;
    onSubmit?: (response: Omit<RSVPResponse, 'id' | 'createdAt'>) => Promise<void>;
    className?: string;
}

export const RSVPForm: React.FC<RSVPFormProps> = ({ config, templateId, onSubmit, className = '' }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        message: '',
        attendance: '' as 'hadir' | 'tidak_hadir' | 'ragu' | '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validate required fields
        if (!formData.name.trim()) {
            setError('Nama wajib diisi');
            return;
        }
        if (!formData.message.trim()) {
            setError('Ucapan wajib diisi');
            return;
        }

        setIsSubmitting(true);
        try {
            if (onSubmit) {
                await onSubmit({
                    templateId,
                    name: formData.name,
                    email: formData.email || undefined,
                    phone: formData.phone || undefined,
                    message: formData.message,
                    attendance: formData.attendance || undefined,
                    isPublic: true,
                });
            }
            setIsSubmitted(true);
            setFormData({ name: '', email: '', phone: '', message: '', attendance: '' });
        } catch (err) {
            setError('Gagal mengirim ucapan. Silakan coba lagi.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSubmitted) {
        return (
            <div
                className={`p-6 rounded-xl text-center ${className}`}
                style={{
                    backgroundColor: config.backgroundColor,
                    color: config.textColor,
                    border: `1px solid ${config.borderColor}`
                }}
            >
                <div className="text-4xl mb-4">💐</div>
                <h3 className="text-xl font-semibold mb-2">Terima Kasih!</h3>
                <p>{config.successMessage}</p>
                <button
                    onClick={() => setIsSubmitted(false)}
                    className="mt-4 px-4 py-2 rounded-lg text-sm"
                    style={{
                        backgroundColor: config.buttonColor,
                        color: config.buttonTextColor
                    }}
                >
                    Kirim Ucapan Lagi
                </button>
            </div>
        );
    }

    return (
        <form
            onSubmit={handleSubmit}
            className={`p-6 rounded-xl ${className}`}
            style={{
                backgroundColor: config.backgroundColor,
                color: config.textColor,
                border: `1px solid ${config.borderColor}`
            }}
        >
            {error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                    {error}
                </div>
            )}

            {config.showNameField && (
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">
                        {config.nameLabel} <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
                        style={{
                            borderColor: config.borderColor,
                            backgroundColor: 'rgba(255,255,255,0.9)',
                            color: '#333'
                        }}
                        placeholder="Masukkan nama Anda"
                    />
                </div>
            )}

            {config.showEmailField && (
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">
                        {config.emailLabel}
                    </label>
                    <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
                        style={{
                            borderColor: config.borderColor,
                            backgroundColor: 'rgba(255,255,255,0.9)',
                            color: '#333'
                        }}
                        placeholder="email@example.com"
                    />
                </div>
            )}

            {config.showPhoneField && (
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">
                        {config.phoneLabel}
                    </label>
                    <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
                        style={{
                            borderColor: config.borderColor,
                            backgroundColor: 'rgba(255,255,255,0.9)',
                            color: '#333'
                        }}
                        placeholder="08xxxxxxxxxx"
                    />
                </div>
            )}

            {config.showAttendanceField && (
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">
                        {config.attendanceLabel}
                    </label>
                    <select
                        value={formData.attendance}
                        onChange={(e) => setFormData({ ...formData, attendance: e.target.value as any })}
                        className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
                        style={{
                            borderColor: config.borderColor,
                            backgroundColor: 'rgba(255,255,255,0.9)',
                            color: '#333'
                        }}
                    >
                        <option value="">Pilih kehadiran</option>
                        <option value="hadir">Hadir</option>
                        <option value="tidak_hadir">Tidak Hadir</option>
                        <option value="ragu">Masih Ragu</option>
                    </select>
                </div>
            )}

            {config.showMessageField && (
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">
                        {config.messageLabel} <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 min-h-[100px]"
                        style={{
                            borderColor: config.borderColor,
                            backgroundColor: 'rgba(255,255,255,0.9)',
                            color: '#333'
                        }}
                        placeholder="Tuliskan ucapan dan doa Anda..."
                    />
                </div>
            )}

            <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-lg font-medium transition-all hover:opacity-90 disabled:opacity-50"
                style={{
                    backgroundColor: config.buttonColor,
                    color: config.buttonTextColor
                }}
            >
                {isSubmitting ? 'Mengirim...' : config.submitButtonText}
            </button>
        </form>
    );
};

// Default RSVP form config
export const getDefaultRSVPFormConfig = (): RSVPFormConfig => ({
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    textColor: '#333333',
    buttonColor: '#b8860b',
    buttonTextColor: '#ffffff',
    borderColor: '#e5e5e5',
    showNameField: true,
    showEmailField: true,
    showPhoneField: true,
    showMessageField: true,
    showAttendanceField: true,
    nameLabel: 'Nama',
    emailLabel: 'Email',
    phoneLabel: 'No. HP',
    messageLabel: 'Ucapan & Doa',
    attendanceLabel: 'Kehadiran',
    submitButtonText: 'Kirim Ucapan',
    successMessage: 'Ucapan Anda telah terkirim. Semoga kita bisa bertemu di hari bahagia kami!',
});

export default RSVPForm;
