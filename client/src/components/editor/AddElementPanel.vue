<script setup lang="ts">
import { useTemplateStore } from '@/stores/template';
import { type TemplateElement, type ElementType } from '@/lib/types';
import Button from '@/components/ui/Button.vue';
import { Type, Image as ImageIcon, Clock, MessageSquare, MailOpen, Users, Heart } from 'lucide-vue-next';

interface Props {
  activeSection: string;
}

const props = defineProps<Props>();
const store = useTemplateStore();

const handleAddElement = async (type: ElementType) => {
    if (!store.activeTemplateId) return;

    const baseElement = {
        name: `New ${type}`,
        position: { x: 50, y: 50 },
        size: { width: 200, height: 100 },
        zIndex: 1,
        rotation: 0,
        flipHorizontal: false,
        flipVertical: false,
    };

    const newId = `el-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    let newElement: TemplateElement = { 
        ...baseElement, 
        type,
        id: newId
    } as TemplateElement;

    switch (type) {
        case 'text':
            newElement = {
                ...newElement,
                content: 'Double click to edit',
                textStyle: {
                    fontSize: 24,
                    fontFamily: 'Inter',
                    color: '#000000',
                    textAlign: 'left',
                    fontWeight: 'normal',
                    fontStyle: 'normal',
                    textDecoration: 'none',
                    lineHeight: 1.5,
                    letterSpacing: 0,
                },
                size: { width: 300, height: 50 },
                id: newId
            };
            break;
        case 'image':
             newElement = {
                ...newElement,
                imageUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400',
                size: { width: 200, height: 200 },
                id: newId
            };
            break;
        case 'countdown':
             newElement = {
                ...newElement,
                countdownConfig: {
                     targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                     style: 'classic',
                     showDays: true,
                     showHours: true,
                     showMinutes: true,
                     showSeconds: true,
                     backgroundColor: '#ffffff',
                     textColor: '#000000',
                     accentColor: '#b8860b',
                     labelColor: '#666666',
                     showLabels: true,
                     labels: { days: 'Hari', hours: 'Jam', minutes: 'Menit', seconds: 'Detik' }
                },
                size: { width: 340, height: 100 },
                id: newId
            };
            break;
        case 'icon':
             newElement = {
                ...newElement,
                iconStyle: {
                    iconName: 'instagram',
                    iconColor: '#b8860b',
                    iconSize: 48
                },
                size: { width: 64, height: 64 },
                id: newId
            };
            break;
         case 'rsvp-form':
             newElement = {
                ...newElement,
                rsvpFormConfig: {
                    backgroundColor: '#ffffff',
                    textColor: '#000000',
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
                    phoneLabel: 'Telepon',
                    messageLabel: 'Pesan',
                    attendanceLabel: 'Kehadiran',
                    submitButtonText: 'Kirim RSVP',
                    successMessage: 'Terima kasih!'
                },
                size: { width: 320, height: 450 },
                id: newId
            };
            break;
        case 'open_invitation_button':
             newElement = {
                ...newElement,
                content: 'Buka Undangan',
                textStyle: {
                    fontSize: 14,
                    fontFamily: 'Inter',
                    color: '#ffffff',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    fontStyle: 'normal',
                    textDecoration: 'none',
                },
                size: { width: 200, height: 48 },
                type: 'button',
                // Ensure openInvitationConfig is initialized if needed, or it might be handled elsewhere?
                // Wait, type is 'button', so we need openInvitationConfig here?
                // The previous code didn't have it in the switch case I read?
                // I'll check if I need to add it.
                // The previous code had:
                /*
                case 'open_invitation_button':
                     newElement = {
                        ...
                        type: 'button'
                    }
                */
                // It didn't have openInvitationConfig. If I add it, I should default it.
                openInvitationConfig: {
                    buttonText: 'Buka Undangan',
                    // Defaults...
                },
                id: newId
            };
            break;
         case 'guest_wishes':
             newElement = {
                ...newElement,
                name: 'Guest Wishes',
                size: { width: 320, height: 400 },
                id: newId
            };
            break;
    }

    await store.addElement(store.activeTemplateId, props.activeSection, newElement);
};
</script>

<template>
    <div class="space-y-4">
        <h3 class="font-semibold text-sm text-gray-900">Add Element</h3>
        <div class="grid grid-cols-2 gap-2">
            <Button 
                variant="outline" 
                class="flex flex-col items-center justify-center h-20 gap-2 hover:bg-blue-50 hover:border-blue-200 transition-all"
                @click="handleAddElement('image')"
            >
                <ImageIcon class="w-6 h-6 text-gray-600" />
                <span class="text-xs">Image</span>
            </Button>
            
            <Button 
                variant="outline" 
                class="flex flex-col items-center justify-center h-20 gap-2 hover:bg-blue-50 hover:border-blue-200 transition-all"
                @click="handleAddElement('text')"
            >
                <Type class="w-6 h-6 text-gray-600" />
                <span class="text-xs">Text</span>
            </Button>
            
            <Button 
                variant="outline" 
                class="flex flex-col items-center justify-center h-20 gap-2 hover:bg-blue-50 hover:border-blue-200 transition-all"
                @click="handleAddElement('icon')"
            >
                <Heart class="w-6 h-6 text-gray-600" />
                <span class="text-xs">Icon</span>
            </Button>

            <Button 
                variant="outline" 
                class="flex flex-col items-center justify-center h-20 gap-2 hover:bg-blue-50 hover:border-blue-200 transition-all"
                @click="handleAddElement('countdown')"
            >
                <Clock class="w-6 h-6 text-gray-600" />
                <span class="text-xs">Countdown</span>
            </Button>

             <Button 
                variant="outline" 
                class="flex flex-col items-center justify-center h-20 gap-2 hover:bg-blue-50 hover:border-blue-200 transition-all"
                @click="handleAddElement('rsvp-form')"
            >
                <MessageSquare class="w-6 h-6 text-gray-600" />
                <span class="text-xs">RSVP Form</span>
            </Button>

            <Button 
                variant="outline" 
                class="flex flex-col items-center justify-center h-20 gap-2 hover:bg-blue-50 hover:border-blue-200 transition-all"
                @click="handleAddElement('open_invitation_button')"
            >
                <MailOpen class="w-6 h-6 text-gray-600" />
                <span class="text-xs">Open Button</span>
            </Button>

             <Button 
                variant="outline" 
                class="flex flex-col items-center justify-center h-20 gap-2 hover:bg-blue-50 hover:border-blue-200 transition-all"
                @click="handleAddElement('guest_wishes')"
            >
                <Users class="w-6 h-6 text-gray-600" />
                <span class="text-xs">Guest Wishes</span>
            </Button>
        </div>
    </div>
</template>
