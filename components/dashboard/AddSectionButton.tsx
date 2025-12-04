'use client';

import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const AddSectionButton: React.FC = () => {
    return (
        <Button
            variant="outline"
            className="w-full border-2 border-dashed border-teal-300 text-teal-600 hover:bg-teal-50 hover:border-teal-400"
        >
            <Plus className="w-5 h-5 mr-2" />
            Tambah Halaman
        </Button>
    );
};
