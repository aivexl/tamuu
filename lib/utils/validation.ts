import { z } from 'zod';

export const openingSchema = z.object({
    groomName: z.string().min(1, 'Nama mempelai pria wajib diisi'),
    brideName: z.string().min(1, 'Nama mempelai wanita wajib diisi'),
    tagline: z.string().optional(),
    eventDate: z.string().min(1, 'Tanggal acara wajib diisi'),
    showDate: z.boolean().default(true),
});

export const quotesSchema = z.object({
    quote: z.string().min(1, 'Kutipan wajib diisi'),
    author: z.string().min(1, 'Penulis wajib diisi'),
    verse: z.string().optional(),
});

export const personSchema = z.object({
    fullName: z.string().min(1, 'Nama lengkap wajib diisi'),
    nickname: z.string().min(1, 'Nama panggilan wajib diisi'),
    fatherName: z.string().min(1, 'Nama ayah wajib diisi'),
    motherName: z.string().min(1, 'Nama ibu wajib diisi'),
    photo: z.string().url('URL foto tidak valid').optional().or(z.literal('')),
    instagram: z.string().optional(),
    facebook: z.string().optional(),
});

export const coupleSchema = z.object({
    groom: personSchema,
    bride: personSchema,
});

export const eventItemSchema = z.object({
    id: z.string(),
    name: z.string().min(1, 'Nama acara wajib diisi'),
    date: z.string().min(1, 'Tanggal wajib diisi'),
    startTime: z.string().min(1, 'Waktu mulai wajib diisi'),
    endTime: z.string().min(1, 'Waktu selesai wajib diisi'),
    location: z.string().min(1, 'Lokasi wajib diisi'),
    address: z.string().min(1, 'Alamat wajib diisi'),
});

export const eventSchema = z.object({
    events: z.array(eventItemSchema).min(1, 'Minimal satu acara harus ditambahkan'),
});

export const mapsSchema = z.object({
    embedUrl: z.string().url('URL embed tidak valid'),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    locationName: z.string().min(1, 'Nama lokasi wajib diisi'),
});

export const rsvpFormFieldSchema = z.object({
    id: z.string(),
    name: z.string(),
    label: z.string(),
    type: z.enum(['text', 'select', 'number']),
    required: z.boolean(),
    options: z.array(z.string()).optional(),
});

export const rsvpSchema = z.object({
    formFields: z.array(rsvpFormFieldSchema),
    requireAttendance: z.boolean(),
    requireGuestCount: z.boolean(),
    customFields: z.array(rsvpFormFieldSchema),
});

export const thanksSchema = z.object({
    message: z.string().min(1, 'Pesan ucapan terima kasih wajib diisi'),
    signature: z.string().min(1, 'Tanda tangan wajib diisi'),
});
