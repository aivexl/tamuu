import { create } from 'zustand';
import type { Invitation, InvitationSection, Guest, Analytics, SectionType } from './types';
import { demoInvitation, demoGuests, demoAnalytics } from './data/demo-invitation';

interface InvitationStore {
    invitation: Invitation;
    guests: Guest[];
    analytics: Analytics;
    activePanel: string | null;
    activeSection: string | null;

    // Actions
    setInvitation: (invitation: Invitation) => void;
    updateSection: (sectionId: string, data: Partial<InvitationSection>) => void;
    toggleSectionVisibility: (sectionId: string) => void;
    updateInvitationStatus: (isActive: boolean) => void;
    updateInvitationType: (type: 'scroll' | 'standard') => void;
    setActivePanel: (panel: string | null) => void;
    setActiveSection: (sectionId: string | null) => void;
    updateTheme: (theme: Invitation['theme']) => void;
    updateBackground: (background: Invitation['background']) => void;
    updateMusic: (music: Invitation['music']) => void;
    updateGreeting: (greeting: Invitation['greeting']) => void;
    addGuest: (guest: Guest) => void;
    updateGuest: (id: string, guest: Partial<Guest>) => void;
    deleteGuest: (id: string) => void;
    reorderSections: (newOrder: InvitationSection[]) => void;
    updateTemplateId: (templateId: string) => void;
}

export const useInvitationStore = create<InvitationStore>((set) => ({
    invitation: demoInvitation,
    guests: demoGuests,
    analytics: demoAnalytics,
    activePanel: null,
    activeSection: null,

    setInvitation: (invitation) => set({ invitation }),

    updateSection: (sectionId, data) =>
        set((state) => ({
            invitation: {
                ...state.invitation,
                sections: state.invitation.sections.map((section) =>
                    section.id === sectionId ? { ...section, ...data } : section
                ),
            },
        })),

    toggleSectionVisibility: (sectionId) =>
        set((state) => ({
            invitation: {
                ...state.invitation,
                sections: state.invitation.sections.map((section) =>
                    section.id === sectionId
                        ? { ...section, isVisible: !section.isVisible }
                        : section
                ),
            },
        })),

    updateInvitationStatus: (isActive) =>
        set((state) => ({
            invitation: { ...state.invitation, isActive },
        })),

    updateInvitationType: (invitationType) =>
        set((state) => ({
            invitation: { ...state.invitation, invitationType },
        })),

    setActivePanel: (panel) => set({ activePanel: panel }),

    setActiveSection: (sectionId) => set({ activeSection: sectionId }),

    updateTheme: (theme) =>
        set((state) => ({
            invitation: { ...state.invitation, theme },
        })),

    updateBackground: (background) =>
        set((state) => ({
            invitation: { ...state.invitation, background },
        })),

    updateMusic: (music) =>
        set((state) => ({
            invitation: { ...state.invitation, music },
        })),

    updateGreeting: (greeting) =>
        set((state) => ({
            invitation: { ...state.invitation, greeting },
        })),

    addGuest: (guest) =>
        set((state) => ({
            guests: [...state.guests, guest],
        })),

    updateGuest: (id, guestData) =>
        set((state) => ({
            guests: state.guests.map((guest) =>
                guest.id === id ? { ...guest, ...guestData } : guest
            ),
        })),

    deleteGuest: (id) =>
        set((state) => ({
            guests: state.guests.filter((guest) => guest.id !== id),
        })),

    reorderSections: (newOrder) =>
        set((state) => ({
            invitation: {
                ...state.invitation,
                sections: newOrder,
            },
        })),

    updateTemplateId: (templateId) =>
        set((state) => ({
            invitation: { ...state.invitation, templateId },
        })),
}));
