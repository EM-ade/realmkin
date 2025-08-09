import React from "react";
import { FaDiscord } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";

const SocialLinks = () => {
  return (
    <div className="flex justify-center items-center space-x-8 mt-4 mb-4">
      <div className="text-center">
        <a
          href="https://discord.gg/vwwbjFb4vQ"
          target="_blank"
          rel="noopener noreferrer"
          className="group"
        >
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 bg-[#2b1c3b] border-2 border-[#d3b136] rounded-lg transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-lg shadow-purple-500/30 animate-pulse-glow"></div>
            <div className="absolute inset-0 flex justify-center items-center">
              <FaDiscord className="text-[#d3b136] text-2xl group-hover:text-white transition-colors duration-300" />
            </div>
          </div>
        </a>
      </div>

      <div className="text-center">
        <a
          href="https://x.com/therealmkin?t=4GSXlbvQ_t3Tkz-VilvuNg&s=09"
          target="_blank"
          rel="noopener noreferrer"
          className="group"
        >
          <div className="relative w-12 h-12">
            <div
              className="absolute inset-0 bg-[#2b1c3b] border-2 border-[#d3b136] rounded-lg transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-lg shadow-purple-500/30 animate-pulse-glow"
              style={{ animationDelay: "0.5s" }}
            ></div>
            <div className="absolute inset-0 flex justify-center items-center">
              <FaXTwitter className="text-[#d3b136] text-2xl group-hover:text-white transition-colors duration-300" />
            </div>
          </div>
        </a>
      </div>
    </div>
  );
};

export default SocialLinks;
