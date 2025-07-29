
import React from "react";
import { FaDiscord, FaInstagram, FaTwitter } from "react-icons/fa";

const SocialLinks = () => {
  return (
    <div className="flex justify-center items-center space-x-4 mt-4 mb-4">
      <a
        href="https://discord.com"
        target="_blank"
        rel="noopener noreferrer"
        className="group"
      >
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 bg-purple-800 border-2 border-yellow-400 rounded-lg transition-transform duration-300 group-hover:scale-110"></div>
          <div className="absolute inset-0 flex justify-center items-center">
            <FaDiscord className="text-yellow-400 text-2xl" />
          </div>
        </div>
      </a>
      <a
        href="https://instagram.com"
        target="_blank"
        rel="noopener noreferrer"
        className="group"
      >
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 bg-purple-800 border-2 border-yellow-400 rounded-lg transition-transform duration-300 group-hover:scale-110"></div>
          <div className="absolute inset-0 flex justify-center items-center">
            <FaInstagram className="text-yellow-400 text-2xl" />
          </div>
        </div>
      </a>
      <a
        href="https://twitter.com"
        target="_blank"
        rel="noopener noreferrer"
        className="group"
      >
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 bg-purple-800 border-2 border-yellow-400 rounded-lg transition-transform duration-300 group-hover:scale-110"></div>
          <div className="absolute inset-0 flex justify-center items-center">
            <FaTwitter className="text-yellow-400 text-2xl" />
          </div>
        </div>
      </a>
    </div>
  );
};

export default SocialLinks;
