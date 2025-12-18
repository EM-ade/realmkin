export interface ProjectConfig {
    id: string;
    name: string;
    token: {
        symbol: string;     // e.g., 'MKIN', 'GARGS'
        image: string;      // Token icon path
    };
    theme: {
        primary: string;    // Hex color for accents
        colorClass: string; // Tailwind class for text color
        borderClass: string; // Tailwind class for borders
        bgClass: string;    // Tailwind class for backgrounds
    };
    staking: {
        baseRate: number;   // SOL per second
    };
}

export const PROJECTS: ProjectConfig[] = [
    {
        id: 'realmkin',
        name: 'Realmkin',
        token: {
            symbol: 'MKIN',
            image: '/realmkin-logo.png'
        },
        theme: {
            primary: '#f4c752',
            colorClass: 'text-[#f4c752]',
            borderClass: 'border-[#f4c752]',
            bgClass: 'bg-[#f4c752]'
        },
        staking: {
            baseRate: 0.00000000066
        }
    }
    // Future projects can be added here
];
