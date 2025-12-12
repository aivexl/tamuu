'use client';

import React, { useEffect, useState } from 'react';
import { CountdownConfig, CountdownStyle } from '@/lib/types';

interface CountdownTimerProps {
    config: CountdownConfig;
    className?: string;
}

interface TimeLeft {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
}

const calculateTimeLeft = (targetDate: string): TimeLeft => {
    const target = new Date(targetDate).getTime();
    if (isNaN(target)) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }
    const difference = target - new Date().getTime();

    if (difference <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
    };
};

// Elegant style with cards and shadows
const ElegantCountdown: React.FC<{ timeLeft: TimeLeft; config: CountdownConfig }> = ({ timeLeft, config }) => (
    <div className="flex gap-4 justify-center" style={{ color: config.textColor }}>
        {config.showDays && (
            <div className="text-center">
                <div
                    className="text-4xl font-bold px-4 py-3 rounded-lg shadow-lg"
                    style={{ backgroundColor: config.backgroundColor, color: config.accentColor }}
                >
                    {String(timeLeft.days).padStart(2, '0')}
                </div>
                {config.showLabels && (
                    <div className="text-xs mt-2 uppercase tracking-wider" style={{ color: config.dayLabelColor || config.labelColor }}>
                        {config.labels.days}
                    </div>
                )}
            </div>
        )}
        {config.showHours && (
            <div className="text-center">
                <div
                    className="text-4xl font-bold px-4 py-3 rounded-lg shadow-lg"
                    style={{ backgroundColor: config.backgroundColor, color: config.accentColor }}
                >
                    {String(timeLeft.hours).padStart(2, '0')}
                </div>
                {config.showLabels && (
                    <div className="text-xs mt-2 uppercase tracking-wider" style={{ color: config.hourLabelColor || config.labelColor }}>
                        {config.labels.hours}
                    </div>
                )}
            </div>
        )}
        {config.showMinutes && (
            <div className="text-center">
                <div
                    className="text-4xl font-bold px-4 py-3 rounded-lg shadow-lg"
                    style={{ backgroundColor: config.backgroundColor, color: config.accentColor }}
                >
                    {String(timeLeft.minutes).padStart(2, '0')}
                </div>
                {config.showLabels && (
                    <div className="text-xs mt-2 uppercase tracking-wider" style={{ color: config.minuteLabelColor || config.labelColor }}>
                        {config.labels.minutes}
                    </div>
                )}
            </div>
        )}
        {config.showSeconds && (
            <div className="text-center">
                <div
                    className="text-4xl font-bold px-4 py-3 rounded-lg shadow-lg"
                    style={{ backgroundColor: config.backgroundColor, color: config.accentColor }}
                >
                    {String(timeLeft.seconds).padStart(2, '0')}
                </div>
                {config.showLabels && (
                    <div className="text-xs mt-2 uppercase tracking-wider" style={{ color: config.secondLabelColor || config.labelColor }}>
                        {config.labels.seconds}
                    </div>
                )}
            </div>
        )}
    </div>
);

// Minimal style - just numbers
const MinimalCountdown: React.FC<{ timeLeft: TimeLeft; config: CountdownConfig }> = ({ timeLeft, config }) => (
    <div className="flex items-center justify-center gap-2 font-mono" style={{ color: config.textColor }}>
        {config.showDays && (
            <>
                <span className="text-3xl font-bold" style={{ color: config.accentColor }}>
                    {String(timeLeft.days).padStart(2, '0')}
                </span>
                {config.showLabels && <span className="text-sm" style={{ color: config.dayLabelColor || config.labelColor }}>{config.labels.days}</span>}
                <span className="text-2xl mx-1">:</span>
            </>
        )}
        {config.showHours && (
            <>
                <span className="text-3xl font-bold" style={{ color: config.accentColor }}>
                    {String(timeLeft.hours).padStart(2, '0')}
                </span>
                {config.showLabels && <span className="text-sm" style={{ color: config.hourLabelColor || config.labelColor }}>{config.labels.hours}</span>}
                <span className="text-2xl mx-1">:</span>
            </>
        )}
        {config.showMinutes && (
            <>
                <span className="text-3xl font-bold" style={{ color: config.accentColor }}>
                    {String(timeLeft.minutes).padStart(2, '0')}
                </span>
                {config.showLabels && <span className="text-sm" style={{ color: config.minuteLabelColor || config.labelColor }}>{config.labels.minutes}</span>}
                {config.showSeconds && <span className="text-2xl mx-1">:</span>}
            </>
        )}
        {config.showSeconds && (
            <>
                <span className="text-3xl font-bold" style={{ color: config.accentColor }}>
                    {String(timeLeft.seconds).padStart(2, '0')}
                </span>
                {config.showLabels && <span className="text-sm" style={{ color: config.secondLabelColor || config.labelColor }}>{config.labels.seconds}</span>}
            </>
        )}
    </div>
);

// Flip style - like old airport displays
const FlipCountdown: React.FC<{ timeLeft: TimeLeft; config: CountdownConfig }> = ({ timeLeft, config }) => (
    <div className="flex gap-3 justify-center">
        {config.showDays && (
            <div className="text-center">
                <div
                    className="relative overflow-hidden rounded-lg shadow-xl"
                    style={{ backgroundColor: '#1a1a2e' }}
                >
                    <div
                        className="text-4xl font-bold px-3 py-4 font-mono"
                        style={{ color: config.accentColor }}
                    >
                        {String(timeLeft.days).padStart(2, '0')}
                    </div>
                    <div className="absolute inset-x-0 top-1/2 h-px bg-black/30"></div>
                </div>
                {config.showLabels && (
                    <div className="text-xs mt-2 uppercase" style={{ color: config.dayLabelColor || config.labelColor }}>
                        {config.labels.days}
                    </div>
                )}
            </div>
        )}
        {config.showHours && (
            <div className="text-center">
                <div
                    className="relative overflow-hidden rounded-lg shadow-xl"
                    style={{ backgroundColor: '#1a1a2e' }}
                >
                    <div
                        className="text-4xl font-bold px-3 py-4 font-mono"
                        style={{ color: config.accentColor }}
                    >
                        {String(timeLeft.hours).padStart(2, '0')}
                    </div>
                    <div className="absolute inset-x-0 top-1/2 h-px bg-black/30"></div>
                </div>
                {config.showLabels && (
                    <div className="text-xs mt-2 uppercase" style={{ color: config.hourLabelColor || config.labelColor }}>
                        {config.labels.hours}
                    </div>
                )}
            </div>
        )}
        {config.showMinutes && (
            <div className="text-center">
                <div
                    className="relative overflow-hidden rounded-lg shadow-xl"
                    style={{ backgroundColor: '#1a1a2e' }}
                >
                    <div
                        className="text-4xl font-bold px-3 py-4 font-mono"
                        style={{ color: config.accentColor }}
                    >
                        {String(timeLeft.minutes).padStart(2, '0')}
                    </div>
                    <div className="absolute inset-x-0 top-1/2 h-px bg-black/30"></div>
                </div>
                {config.showLabels && (
                    <div className="text-xs mt-2 uppercase" style={{ color: config.minuteLabelColor || config.labelColor }}>
                        {config.labels.minutes}
                    </div>
                )}
            </div>
        )}
        {config.showSeconds && (
            <div className="text-center">
                <div
                    className="relative overflow-hidden rounded-lg shadow-xl"
                    style={{ backgroundColor: '#1a1a2e' }}
                >
                    <div
                        className="text-4xl font-bold px-3 py-4 font-mono"
                        style={{ color: config.accentColor }}
                    >
                        {String(timeLeft.seconds).padStart(2, '0')}
                    </div>
                    <div className="absolute inset-x-0 top-1/2 h-px bg-black/30"></div>
                </div>
                {config.showLabels && (
                    <div className="text-xs mt-2 uppercase" style={{ color: config.secondLabelColor || config.labelColor }}>
                        {config.labels.seconds}
                    </div>
                )}
            </div>
        )}
    </div>
);

// Circle style - with progress rings
const CircleCountdown: React.FC<{ timeLeft: TimeLeft; config: CountdownConfig }> = ({ timeLeft, config }) => {
    const getStrokeDasharray = (value: number, max: number) => {
        const circumference = 2 * Math.PI * 40;
        const progress = (value / max) * circumference;
        return `${progress} ${circumference}`;
    };

    return (
        <div className="flex gap-4 justify-center">
            {config.showDays && (
                <div className="relative w-20 h-20">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle cx="40" cy="40" r="36" fill="none" stroke={config.backgroundColor} strokeWidth="4" />
                        <circle
                            cx="40" cy="40" r="36" fill="none"
                            stroke={config.accentColor} strokeWidth="4"
                            strokeDasharray={getStrokeDasharray(timeLeft.days % 100, 100)}
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xl font-bold" style={{ color: config.textColor }}>
                            {timeLeft.days}
                        </span>
                        {config.showLabels && (
                            <span className="text-[10px] uppercase" style={{ color: config.dayLabelColor || config.labelColor }}>
                                {config.labels.days}
                            </span>
                        )}
                    </div>
                </div>
            )}
            {config.showHours && (
                <div className="relative w-20 h-20">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle cx="40" cy="40" r="36" fill="none" stroke={config.backgroundColor} strokeWidth="4" />
                        <circle
                            cx="40" cy="40" r="36" fill="none"
                            stroke={config.accentColor} strokeWidth="4"
                            strokeDasharray={getStrokeDasharray(timeLeft.hours, 24)}
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xl font-bold" style={{ color: config.textColor }}>
                            {String(timeLeft.hours).padStart(2, '0')}
                        </span>
                        {config.showLabels && (
                            <span className="text-[10px] uppercase" style={{ color: config.hourLabelColor || config.labelColor }}>
                                {config.labels.hours}
                            </span>
                        )}
                    </div>
                </div>
            )}
            {config.showMinutes && (
                <div className="relative w-20 h-20">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle cx="40" cy="40" r="36" fill="none" stroke={config.backgroundColor} strokeWidth="4" />
                        <circle
                            cx="40" cy="40" r="36" fill="none"
                            stroke={config.accentColor} strokeWidth="4"
                            strokeDasharray={getStrokeDasharray(timeLeft.minutes, 60)}
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xl font-bold" style={{ color: config.textColor }}>
                            {String(timeLeft.minutes).padStart(2, '0')}
                        </span>
                        {config.showLabels && (
                            <span className="text-[10px] uppercase" style={{ color: config.minuteLabelColor || config.labelColor }}>
                                {config.labels.minutes}
                            </span>
                        )}
                    </div>
                </div>
            )}
            {config.showSeconds && (
                <div className="relative w-20 h-20">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle cx="40" cy="40" r="36" fill="none" stroke={config.backgroundColor} strokeWidth="4" />
                        <circle
                            cx="40" cy="40" r="36" fill="none"
                            stroke={config.accentColor} strokeWidth="4"
                            strokeDasharray={getStrokeDasharray(timeLeft.seconds, 60)}
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xl font-bold" style={{ color: config.textColor }}>
                            {String(timeLeft.seconds).padStart(2, '0')}
                        </span>
                        {config.showLabels && (
                            <span className="text-[10px] uppercase" style={{ color: config.secondLabelColor || config.labelColor }}>
                                {config.labels.seconds}
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// Card style - with gradient backgrounds
const CardCountdown: React.FC<{ timeLeft: TimeLeft; config: CountdownConfig }> = ({ timeLeft, config }) => (
    <div className="flex gap-3 justify-center">
        {config.showDays && (
            <div
                className="text-center px-4 py-3 rounded-xl shadow-lg"
                style={{
                    background: `linear-gradient(135deg, ${config.backgroundColor}, ${config.accentColor}20)`,
                    border: `1px solid ${config.accentColor}40`
                }}
            >
                <div className="text-3xl font-bold" style={{ color: config.accentColor }}>
                    {String(timeLeft.days).padStart(2, '0')}
                </div>
                {config.showLabels && (
                    <div className="text-xs uppercase mt-1" style={{ color: config.dayLabelColor || config.labelColor }}>
                        {config.labels.days}
                    </div>
                )}
            </div>
        )}
        {config.showHours && (
            <div
                className="text-center px-4 py-3 rounded-xl shadow-lg"
                style={{
                    background: `linear-gradient(135deg, ${config.backgroundColor}, ${config.accentColor}20)`,
                    border: `1px solid ${config.accentColor}40`
                }}
            >
                <div className="text-3xl font-bold" style={{ color: config.accentColor }}>
                    {String(timeLeft.hours).padStart(2, '0')}
                </div>
                {config.showLabels && (
                    <div className="text-xs uppercase mt-1" style={{ color: config.hourLabelColor || config.labelColor }}>
                        {config.labels.hours}
                    </div>
                )}
            </div>
        )}
        {config.showMinutes && (
            <div
                className="text-center px-4 py-3 rounded-xl shadow-lg"
                style={{
                    background: `linear-gradient(135deg, ${config.backgroundColor}, ${config.accentColor}20)`,
                    border: `1px solid ${config.accentColor}40`
                }}
            >
                <div className="text-3xl font-bold" style={{ color: config.accentColor }}>
                    {String(timeLeft.minutes).padStart(2, '0')}
                </div>
                {config.showLabels && (
                    <div className="text-xs uppercase mt-1" style={{ color: config.minuteLabelColor || config.labelColor }}>
                        {config.labels.minutes}
                    </div>
                )}
            </div>
        )}
        {config.showSeconds && (
            <div
                className="text-center px-4 py-3 rounded-xl shadow-lg"
                style={{
                    background: `linear-gradient(135deg, ${config.backgroundColor}, ${config.accentColor}20)`,
                    border: `1px solid ${config.accentColor}40`
                }}
            >
                <div className="text-3xl font-bold" style={{ color: config.accentColor }}>
                    {String(timeLeft.seconds).padStart(2, '0')}
                </div>
                {config.showLabels && (
                    <div className="text-xs uppercase mt-1" style={{ color: config.secondLabelColor || config.labelColor }}>
                        {config.labels.seconds}
                    </div>
                )}
            </div>
        )}
    </div>
);

// Neon style with glowing effects
const NeonCountdown: React.FC<{ timeLeft: TimeLeft; config: CountdownConfig }> = ({ timeLeft, config }) => (
    <div className="flex gap-4 justify-center" style={{ backgroundColor: '#0a0a0a', padding: '20px', borderRadius: '12px' }}>
        {config.showDays && (
            <div className="text-center">
                <div
                    className="text-4xl font-bold px-4 py-2 font-mono"
                    style={{
                        color: config.accentColor,
                        textShadow: `0 0 10px ${config.accentColor}, 0 0 20px ${config.accentColor}, 0 0 30px ${config.accentColor}`,
                    }}
                >
                    {String(timeLeft.days).padStart(2, '0')}
                </div>
                {config.showLabels && (
                    <div
                        className="text-xs uppercase tracking-widest mt-2"
                        style={{
                            color: config.dayLabelColor || config.labelColor,
                            textShadow: `0 0 5px ${config.dayLabelColor || config.labelColor}`,
                        }}
                    >
                        {config.labels.days}
                    </div>
                )}
            </div>
        )}
        <div className="text-4xl font-bold self-center" style={{ color: config.accentColor, textShadow: `0 0 10px ${config.accentColor}` }}>:</div>
        {config.showHours && (
            <div className="text-center">
                <div
                    className="text-4xl font-bold px-4 py-2 font-mono"
                    style={{
                        color: config.accentColor,
                        textShadow: `0 0 10px ${config.accentColor}, 0 0 20px ${config.accentColor}, 0 0 30px ${config.accentColor}`,
                    }}
                >
                    {String(timeLeft.hours).padStart(2, '0')}
                </div>
                {config.showLabels && (
                    <div
                        className="text-xs uppercase tracking-widest mt-2"
                        style={{
                            color: config.hourLabelColor || config.labelColor,
                            textShadow: `0 0 5px ${config.hourLabelColor || config.labelColor}`,
                        }}
                    >
                        {config.labels.hours}
                    </div>
                )}
            </div>
        )}
        <div className="text-4xl font-bold self-center" style={{ color: config.accentColor, textShadow: `0 0 10px ${config.accentColor}` }}>:</div>
        {config.showMinutes && (
            <div className="text-center">
                <div
                    className="text-4xl font-bold px-4 py-2 font-mono"
                    style={{
                        color: config.accentColor,
                        textShadow: `0 0 10px ${config.accentColor}, 0 0 20px ${config.accentColor}, 0 0 30px ${config.accentColor}`,
                    }}
                >
                    {String(timeLeft.minutes).padStart(2, '0')}
                </div>
                {config.showLabels && (
                    <div
                        className="text-xs uppercase tracking-widest mt-2"
                        style={{
                            color: config.minuteLabelColor || config.labelColor,
                            textShadow: `0 0 5px ${config.minuteLabelColor || config.labelColor}`,
                        }}
                    >
                        {config.labels.minutes}
                    </div>
                )}
            </div>
        )}
        {config.showSeconds && (
            <>
                <div className="text-4xl font-bold self-center" style={{ color: config.accentColor, textShadow: `0 0 10px ${config.accentColor}` }}>:</div>
                <div className="text-center">
                    <div
                        className="text-4xl font-bold px-4 py-2 font-mono"
                        style={{
                            color: config.accentColor,
                            textShadow: `0 0 10px ${config.accentColor}, 0 0 20px ${config.accentColor}, 0 0 30px ${config.accentColor}`,
                        }}
                    >
                        {String(timeLeft.seconds).padStart(2, '0')}
                    </div>
                    {config.showLabels && (
                        <div
                            className="text-xs uppercase tracking-widest mt-2"
                            style={{
                                color: config.secondLabelColor || config.labelColor,
                                textShadow: `0 0 5px ${config.secondLabelColor || config.labelColor}`,
                            }}
                        >
                            {config.labels.seconds}
                        </div>
                    )}
                </div>
            </>
        )}
    </div>
);

export const CountdownTimer: React.FC<CountdownTimerProps> = ({ config, className = '' }) => {
    const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => calculateTimeLeft(config.targetDate));

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft(config.targetDate));
        }, 1000);

        return () => clearInterval(timer);
    }, [config.targetDate]);

    const renderCountdown = () => {
        switch (config.style) {
            case 'elegant':
                return <ElegantCountdown timeLeft={timeLeft} config={config} />;
            case 'minimal':
                return <MinimalCountdown timeLeft={timeLeft} config={config} />;
            case 'flip':
                return <FlipCountdown timeLeft={timeLeft} config={config} />;
            case 'circle':
                return <CircleCountdown timeLeft={timeLeft} config={config} />;
            case 'card':
                return <CardCountdown timeLeft={timeLeft} config={config} />;
            case 'neon':
                return <NeonCountdown timeLeft={timeLeft} config={config} />;
            default:
                return <ElegantCountdown timeLeft={timeLeft} config={config} />;
        }
    };

    return (
        <div className={className}>
            {renderCountdown()}
        </div>
    );
};

// Default countdown config
export const getDefaultCountdownConfig = (): CountdownConfig => ({
    targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
    style: 'elegant',
    showDays: true,
    showHours: true,
    showMinutes: true,
    showSeconds: true,
    backgroundColor: '#ffffff',
    textColor: '#1a1a2e',
    accentColor: '#b8860b',
    labelColor: '#666666',
    dayLabelColor: '#666666',
    hourLabelColor: '#666666',
    minuteLabelColor: '#666666',
    secondLabelColor: '#666666',
    showLabels: true,
    labels: {
        days: 'Hari',
        hours: 'Jam',
        minutes: 'Menit',
        seconds: 'Detik',
    },
});

export default CountdownTimer;
