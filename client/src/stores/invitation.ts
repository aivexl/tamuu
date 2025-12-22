import { defineStore } from "pinia";
import type {
    Invitation,
    InvitationSection,
    Guest,
    Analytics,
    TemplateElement
} from "@/lib/types";
import {
    demoInvitation,
    demoGuests,
    demoAnalytics,
} from "@/data/demo-invitation";

interface State {
    invitation: Invitation;
    guests: Guest[];
    analytics: Analytics;
    activePanel: string | null;
    activeSection: string | null;
}

export const useInvitationStore = defineStore("invitation", {
    state: (): State => ({
        invitation: demoInvitation,
        guests: demoGuests,
        analytics: demoAnalytics,
        activePanel: null,
        activeSection: null,
    }),

    actions: {
        setInvitation(invitation: Invitation) {
            this.invitation = invitation;
        },

        updateSection(sectionId: string, data: Partial<InvitationSection>) {
            this.invitation.sections = this.invitation.sections.map((section) =>
                section.id === sectionId ? { ...section, ...data } : section
            );
        },

        toggleSectionVisibility(sectionId: string) {
            this.invitation.sections = this.invitation.sections.map((section) =>
                section.id === sectionId
                    ? { ...section, isVisible: !section.isVisible }
                    : section
            );
        },

        updateInvitationStatus(isActive: boolean) {
            this.invitation.isActive = isActive;
        },

        updateInvitationType(type: "scroll" | "standard") {
            this.invitation.invitationType = type;
        },

        setActivePanel(panel: string | null) {
            this.activePanel = panel;
        },

        setActiveSection(sectionId: string | null) {
            this.activeSection = sectionId;
        },

        updateTheme(theme: Invitation["theme"]) {
            this.invitation.theme = theme;
        },

        updateBackground(background: Invitation["background"]) {
            this.invitation.background = background;
        },

        updateMusic(music: Invitation["music"]) {
            this.invitation.music = music;
        },

        updateGreeting(greeting: Invitation["greeting"]) {
            this.invitation.greeting = greeting;
        },

        addGuest(guest: Guest) {
            this.guests.push(guest);
        },

        updateGuest(id: string, guestData: Partial<Guest>) {
            this.guests = this.guests.map((guest) =>
                guest.id === id ? { ...guest, ...guestData } : guest
            );
        },

        deleteGuest(id: string) {
            this.guests = this.guests.filter((guest) => guest.id !== id);
        },

        reorderSections(newOrder: InvitationSection[]) {
            this.invitation.sections = newOrder;
        },

        updateTemplateId(templateId: string) {
            this.invitation.templateId = templateId;
        },

        updateThumbnail(url: string) {
            this.invitation.thumbnailUrl = url;
        },

        moveSection(index: number, direction: 'up' | 'down') {
            const sections = [...this.invitation.sections];
            if (direction === 'up' && index > 0) {
                const prev = sections[index - 1];
                const curr = sections[index];
                if (prev && curr) {
                    sections[index] = prev;
                    sections[index - 1] = curr;
                }
            } else if (direction === 'down' && index < sections.length - 1) {
                const next = sections[index + 1];
                const curr = sections[index];
                if (next && curr) {
                    sections[index] = next;
                    sections[index + 1] = curr;
                }
            }
            // Reassign order
            this.invitation.sections = sections.map((s, i) => ({ ...s, order: i + 1 }));
        },

        duplicateSection(sectionId: string) {
            const index = this.invitation.sections.findIndex(s => s.id === sectionId);
            if (index === -1) return;

            const original = this.invitation.sections[index];
            if (!original) return;

            const newSection: InvitationSection = {
                ...original,
                id: crypto.randomUUID(), // Ensure distinct ID
                title: `${original.title} (Copy)`,
                isVisible: true, // Default to visible for copy? or keep original? let's keep visible
                order: index + 2, // Insert after
                data: JSON.parse(JSON.stringify(original.data)) // Deep copy data
            };

            const sections = [...this.invitation.sections];
            sections.splice(index + 1, 0, newSection);

            // Reorder
            this.invitation.sections = sections.map((s, i) => ({ ...s, order: i + 1 }));
        },

        deleteSection(sectionId: string) {
            this.invitation.sections = this.invitation.sections.filter(s => s.id !== sectionId);
            // Reorder
            this.invitation.sections = this.invitation.sections.map((s, i) => ({ ...s, order: i + 1 }));
        },

        updateUserElement(elementId: string, updates: Partial<TemplateElement>) {
            if (!this.invitation.elementOverrides) {
                this.invitation.elementOverrides = {};
            }
            this.invitation.elementOverrides[elementId] = {
                ...(this.invitation.elementOverrides[elementId] || {}),
                ...updates
            };
        },

        addSection() {
            const newSection: InvitationSection = {
                id: crypto.randomUUID(),
                type: 'custom',
                title: 'Halaman Baru',
                isVisible: true,
                order: this.invitation.sections.length + 1,
                data: {
                    quote: "Tulis kutipan di sini...",
                    author: "Penulis"
                } as any // Default to quotes-like data or empty
            };
            this.invitation.sections.push(newSection);
        }
    },
});
