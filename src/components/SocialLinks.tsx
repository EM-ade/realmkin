import React from "react";
import { FaDiscord } from "react-icons/fa";
import { FaTelegramPlane } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";

type SocialLinksVariant = "dark" | "light";

type SocialLinksProps = {
  variant?: SocialLinksVariant;
  className?: string;
};

const SocialLinks: React.FC<SocialLinksProps> = ({ variant = "dark", className = "" }) => {
  const textColorClass = variant === "light" ? "text-white" : "text-black";
  const secondaryTextHover = variant === "light" ? "hover:text-white/80" : "hover:text-gray-900";

  return (
    <div
      className={`flex flex-row justify-between items-center gap-4 w-full max-w-3xl mx-auto ${textColorClass} ${className}`}
    >
      <div className="flex items-center gap-6 text-sm font-medium">
        <a
          href="/TheRealmkinWhitePaper.pdf"
          download
          className={`transition-colors ${secondaryTextHover}`}
        >
          Docs
        </a>
        <a
          href="mailto:support@therealmkin.com"
          className={`transition-colors ${secondaryTextHover}`}
        >
          Support
        </a>
      </div>

      <div className="flex items-center gap-4 text-xl">
        <a
          href="https://discord.gg/vwwbjFb4vQ"
          target="_blank"
          rel="noopener noreferrer"
          className="transition-transform duration-200 hover:scale-110"
          aria-label="Discord"
        >
          <FaDiscord />
        </a>
        <a
          href="https://x.com/therealmkin?t=4GSXlbvQ_t3Tkz-VilvuNg&s=09"
          target="_blank"
          rel="noopener noreferrer"
          className="transition-transform duration-200 hover:scale-110"
          aria-label="X (Twitter)"
        >
          <FaXTwitter />
        </a>
        <a
          href="https://t.me/therealmkin"
          target="_blank"
          rel="noopener noreferrer"
          className="transition-transform duration-200 hover:scale-110"
          aria-label="Telegram"
        >
          <FaTelegramPlane />
        </a>
      </div>
    </div>
  );
};

export default SocialLinks;
