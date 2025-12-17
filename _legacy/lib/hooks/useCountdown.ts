import { useState, useEffect } from 'react';
import { getCountdown, type Countdown } from '@/lib/utils/date';

export function useCountdown(targetDate: string | Date): Countdown {
    const [countdown, setCountdown] = useState<Countdown>(getCountdown(targetDate));

    useEffect(() => {
        const interval = setInterval(() => {
            setCountdown(getCountdown(targetDate));
        }, 1000);

        return () => clearInterval(interval);
    }, [targetDate]);

    return countdown;
}
