'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Calendar, Clock } from 'lucide-react';
import { useInvitationStore } from '@/lib/store';
import { formatDate } from '@/lib/utils/date';

export const InvitationInfoCard: React.FC = () => {
    const invitation = useInvitationStore((state) => state.invitation);
    const activeUntil = new Date(invitation.activeUntil);

    return (
        <Card variant="glass" className="bg-gradient-to-br from-blue-50 to-teal-50 border-none">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white rounded-lg shadow-sm">
                        <Calendar className="w-6 h-6 text-teal-600" />
                    </div>
                    <div>
                        <div className="text-sm text-gray-600 mb-1">Aktif Sampai</div>
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-500" />
                            <span className="font-semibold text-gray-900">
                                {formatDate(activeUntil, 'dd MMMM yyyy')} - {formatDate(activeUntil, 'HH:mm')}
                            </span>
                        </div>
                    </div>
                </div>
                <Button variant="outline" size="sm" className="bg-yellow-400 border-yellow-500 text-gray-900 hover:bg-yellow-500">
                    Perpanjang
                </Button>
            </div>
        </Card>
    );
};
