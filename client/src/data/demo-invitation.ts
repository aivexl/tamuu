import type { Invitation, Guest, Analytics } from '@/lib/types';

export const demoInvitation: Invitation = {
    id: '1',
    title: 'Undangan Pernikahan Muhyina & Misbah',
    slug: 'muhyina-misbah',
    isActive: true,
    invitationType: 'scroll',
    activeUntil: '2025-08-02T23:59:59',
    createdAt: '2025-01-01T00:00:00',
    updatedAt: '2025-02-08T14:51:00',
    theme: {
        id: 'elegant-gold',
        name: 'Elegant Gold',
        category: 'elegant',
        colors: {
            primary: '#b8860b',
            secondary: '#ffd700',
            accent: '#8b7355',
            background: '#fffef7',
            text: '#2c1810',
        },
        fontFamily: 'Cormorant Garamond',
    },
    background: {
        type: 'image',
        url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1920',
    },
    music: {
        title: 'A Thousand Years',
        artist: 'Christina Perri',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
        autoplay: true,
    },
    greeting: {
        enabled: true,
        title: 'Walimatul \'Urs',
        message: 'Kepada Yth.\nBapak/Ibu/Saudara/i\n\nTanpa mengurangi rasa hormat, kami mengundang Anda untuk hadir di acara pernikahan kami.',
        buttonText: 'Open Invitation',
    },
    sections: [
        {
            id: 's1',
            type: 'opening',
            title: 'Opening',
            isVisible: true,
            order: 1,
            data: {
                groomName: 'Misbah',
                brideName: 'Muhyina',
                tagline: 'Walimatul \'Urs',
                eventDate: '2025-08-02',
                showDate: true,
            },
        },
        {
            id: 's2',
            type: 'quotes',
            title: 'Quotes',
            isVisible: true,
            order: 2,
            data: {
                quote: 'Dan di antara tanda-tanda kekuasaan-Nya ialah Dia menciptakan untukmu pasangan dari jenismu sendiri, supaya kamu merasa tenteram kepadanya, dan dijadikan-Nya di antaramu rasa kasih dan sayang. Sungguh, pada yang demikian itu benar-benar terdapat tanda-tanda (Kebesaran Allah) bagi kaum yang berpikir.',
                author: 'QS. Ar-Rum',
                verse: 'Ayat 21',
            },
        },
        {
            id: 's3',
            type: 'couple',
            title: 'Couple',
            isVisible: true,
            order: 3,
            data: {
                groom: {
                    fullName: 'Misbahul Munir, S.Kom',
                    nickname: 'Misbah',
                    fatherName: 'Bapak Abdullah',
                    motherName: 'Ibu Siti Aminah',
                    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
                    instagram: '@misbah',
                },
                bride: {
                    fullName: 'Muhyina Azzahra, S.Pd',
                    nickname: 'Muhyina',
                    fatherName: 'Bapak Muhammad',
                    motherName: 'Ibu Fatimah',
                    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
                    instagram: '@muhyina',
                },
            },
        },
        {
            id: 's4',
            type: 'event',
            title: 'Event',
            isVisible: true,
            order: 4,
            data: {
                events: [
                    {
                        id: 'e1',
                        name: 'Akad Nikah',
                        date: '2025-08-02',
                        startTime: '08:00',
                        endTime: '10:00',
                        location: 'Masjid Agung',
                        address: 'Jl. Masjid Agung No. 1, Kota',
                    },
                    {
                        id: 'e2',
                        name: 'Resepsi Pernikahan',
                        date: '2025-08-02',
                        startTime: '11:00',
                        endTime: '14:00',
                        location: 'Gedung Serbaguna',
                        address: 'Jl. Merdeka No. 45, Kota',
                    },
                ],
            },
        },
        {
            id: 's5',
            type: 'maps',
            title: 'Maps',
            isVisible: true,
            order: 5,
            data: {
                embedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3966.4827042984406!2d106.82271431476895!3d-6.200000095501207!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e69f43c7a0c679d%3A0x3d9e89a98020db!2sMonas!5e0!3m2!1sen!2sid!4v1234567890',
                latitude: -6.200000,
                longitude: 106.822714,
                locationName: 'Gedung Serbaguna',
                image: 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?w=800', // Added image for Maps
            },
        },
        {
            id: 's6',
            type: 'rsvp',
            title: 'RSVP',
            isVisible: true,
            order: 6,
            data: {
                formFields: [
                    {
                        id: 'name',
                        name: 'name',
                        label: 'Nama Lengkap',
                        type: 'text',
                        required: true,
                    },
                    {
                        id: 'attendance',
                        name: 'attendance',
                        label: 'Konfirmasi Kehadiran',
                        type: 'select',
                        required: true,
                        options: ['Hadir', 'Tidak Hadir', 'Masih Ragu'],
                    },
                ],
                requireAttendance: true,
                requireGuestCount: true,
                customFields: [],
            },
        },
        {
            id: 's7',
            type: 'thanks',
            title: 'Thanks',
            isVisible: true,
            order: 7,
            data: {
                message: 'Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir untuk memberikan doa restu kepada kami.',
                signature: 'Kami yang berbahagia,\nMuhyina & Misbah',
            },
        },
    ],
    templateId: ''
};

export const demoGuests: Guest[] = [
    {
        id: 'g1',
        name: 'Keluarga Besar Bapak H. Ahmad',
        phone: '+6281234567890',
        invitationUrl: 'https://tamu.id/muhyina-misbah?to=keluarga-ahmad',
        qrCode: 'QR_CODE_g1',
        checkedIn: false,
    },
    {
        id: 'g2',
        name: 'Ibu Hj. Siti Fatimah',
        phone: '+6281234567891',
        invitationUrl: 'https://tamu.id/muhyina-misbah?to=ibu-siti',
        qrCode: 'QR_CODE_g2',
        checkedIn: true,
        rsvp: {
            id: 'r1',
            invitationId: '1',
            guestName: 'Ibu Hj. Siti Fatimah',
            attendance: 'attending',
            guestCount: 2,
            message: 'Barakallahu laka wa baraka alaika wa jamaa bainakuma fii khair.',
            customResponses: {},
            submittedAt: '2025-02-01T10:00:00',
        },
    },
];

export const demoAnalytics: Analytics = {
    totalGuests: 500,
    totalViews: 1250,
    totalRSVP: 350,
    attending: 300,
    notAttending: 20,
    pending: 30,
    checkedIn: 0,
};
