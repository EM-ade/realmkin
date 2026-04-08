import type { Metadata } from "next";
import KingdomGameClient from "./KingdomGameClient";

export const metadata: Metadata = {
  title: "Kingdom — Realmkin Arcade",
  description: "Build your village, train your army, and conquer the realm in this fantasy strategy game.",
};

/**
 * Kingdom Game — Server Component Route
 *
 * This is a server component that wraps the client-side Phaser game.
 * The actual game canvas is rendered client-side via dynamic import with ssr: false.
 */
export default function KingdomPage() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#1a1a2e]">
      <KingdomGameClient />
    </div>
  );
}
