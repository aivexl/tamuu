'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Toggle } from '@/components/ui/Toggle';
import { Alert } from '@/components/ui/Alert';
import { useInvitationStore } from '@/lib/store';

export const StatusToggles: React.FC = () => {
    const invitation = useInvitationStore((state) => state.invitation);
    const updateInvitationStatus = useInvitationStore((state) => state.updateInvitationStatus);
    const updateInvitationType = useInvitationStore((state) => state.updateInvitationType);

    return (
        <div className="space-y-3">
            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-700">Status Undangan</span>
                        <span className="px-2 py-1 bg-green-500 text-white text-xs font-medium rounded-md">
                            Aktif
                        </span>
                    </div>
                    <Toggle
                        checked={invitation.isActive}
                        onChange={updateInvitationStatus}
                    />
                </div>
            </Card>

            <Card className="bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-700">Tipe Undangan</span>
                        <span className="px-2 py-1 bg-gray-800 text-white text-xs font-medium rounded-md">
                            Scroll
                        </span>
                    </div>
                    <Toggle
                        checked={invitation.invitationType === 'standard'}
                        onChange={(checked) =>
                            updateInvitationType(checked ? 'standard' : 'scroll')
                        }
                    />
                </div>
            </Card>

            <Alert variant="warning" className="text-xs">
                <div className="flex items-center gap-2">
                    <span>🔒</span>
                    <span>
                        Bikin undangan dengan fitur terlengkap. Upgrade paket{' '}
                        <button className="text-red-600 font-semibold underline">Klik Disini</button>
                    </span>
                </div>
            </Alert>
        </div>
    );
};
