export interface NavItem {
    label: string;
    href: string;
    icon: string;
    group?: "Ecosystem";
}

export const NAV_ITEMS: NavItem[] = [
    { label: "Home", href: "/", icon: "/dashboard.png" },
    { label: "Project Details", href: "/project-details", icon: "/realmkin-logo.png" },
    { label: "Wallet", href: "/wallet", icon: "/wallet.png" },
    { label: "Staking", href: "/staking", icon: "/staking.png" },
    { label: "My NFTs", href: "/my-nft", icon: "/flex-model.png", group: "Ecosystem" },
    { label: "Marketplace", href: "/marketplace", icon: "/marketplace_logo.png", group: "Ecosystem" },
    { label: "Game", href: "/game", icon: "/game.png", group: "Ecosystem" },
    { label: "Merches", href: "/merches", icon: "/merches.png", group: "Ecosystem" },
];

export const ADMIN_NAV_ITEMS: NavItem[] = [
    { label: "Admin", href: "/admin", icon: "/dashboard.png" },
];
