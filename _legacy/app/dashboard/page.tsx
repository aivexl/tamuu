'use client';

import React from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { InvitationInfoCard } from '@/components/dashboard/InvitationInfoCard';
import { IconGridMenu } from '@/components/dashboard/IconGridMenu';
import { StatusToggles } from '@/components/dashboard/StatusToggles';
import { SectionList } from '@/components/dashboard/SectionList';
import { AddSectionButton } from '@/components/dashboard/AddSectionButton';
import { Modal } from '@/components/ui/Modal';
import { useInvitationStore } from '@/lib/store';

export default function DashboardPage() {
    const activePanel = useInvitationStore((state) => state.activePanel);
    const setActivePanel = useInvitationStore((state) => state.setActivePanel);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-teal-50">
            <DashboardHeader />

            <div className="max-w-4xl mx-auto p-6 space-y-6">
                <InvitationInfoCard />

                <IconGridMenu />

                <StatusToggles />

                <div className="space-y-3">
                    <h2 className="text-lg font-semibold text-gray-900">Kelola Halaman</h2>
                    <SectionList />
                    <AddSectionButton />
                </div>
            </div>

            {/* Panels will be rendered based on activePanel */}
            <Modal
                isOpen={activePanel !== null}
                onClose={() => setActivePanel(null)}
                title={activePanel ? activePanel.charAt(0).toUpperCase() + activePanel.slice(1) : ''}
                size="lg"
            >
                <div className="text-center py-12">
                    <p className="text-gray-600">
                        Panel untuk <strong>{activePanel}</strong> akan ditambahkan di sini
                    </p>
                </div>
            </Modal>
        </div>
    );
}
