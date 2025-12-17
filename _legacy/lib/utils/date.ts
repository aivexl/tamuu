import { format, differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds } from 'date-fns';

export function formatDate(date: string | Date, formatStr: string = 'PPP'): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, formatStr);
}

export function formatTime(date: string | Date): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, 'HH:mm');
}

export interface Countdown {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
}

export function getCountdown(targetDate: string | Date): Countdown {
    const now = new Date();
    const target = typeof targetDate === 'string' ? new Date(targetDate) : targetDate;

    if (now >= target) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
    }

    const days = differenceInDays(target, now);
    const hours = differenceInHours(target, now) % 24;
    const minutes = differenceInMinutes(target, now) % 60;
    const seconds = differenceInSeconds(target, now) % 60;

    return { days, hours, minutes, seconds, isExpired: false };
}
