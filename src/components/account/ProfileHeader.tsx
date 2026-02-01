"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { getUserProfile } from "@/services/profileService";

interface ProfileHeaderProps {
  userId: string;
  level: number;
  onEditProfile?: () => void;
  onViewHistory?: () => void;
  onWithdraw?: () => void;
  onTransfer?: () => void;
  refreshKey?: number; // Add refresh trigger
}

export default function ProfileHeader({
  userId,
  level,
  onEditProfile,
  onViewHistory,
  onWithdraw,
  onTransfer,
  refreshKey = 0,
}: ProfileHeaderProps) {
  const [username, setUsername] = useState<string>("Loading...");
  const [avatarUrl, setAvatarUrl] = useState<string>("/realmkin-logo.png");
  const [memberSince, setMemberSince] = useState<string>("2024");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) return;

      setLoading(true);
      try {
        const profile = await getUserProfile(userId);
        if (profile) {
          setUsername(profile.username || profile.email?.split("@")[0] || "RealmKeeper");
          setAvatarUrl(profile.avatarUrl || "/realmkin-logo.png");
          setMemberSince(profile.createdAt.getFullYear().toString());
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        setUsername("RealmKeeper");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId, refreshKey]); // Re-fetch when refreshKey changes
  return (
    <section className="bg-[#111111] rounded-2xl p-6 border border-[#27272a] relative">
      {/* Top Right Icons */}
      <div className="absolute top-4 right-4 flex space-x-3 text-gray-500">
        {/* History Icon */}
        <button
          onClick={onViewHistory}
          className="w-5 h-5 cursor-pointer hover:text-white transition-colors"
          title="View History"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        {/* Edit Icon */}
        <button
          onClick={onEditProfile}
          className="w-5 h-5 cursor-pointer hover:text-white transition-colors"
          title="Edit Profile"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* Avatar Section */}
      <div className="flex flex-col items-center mt-2">
        <div className="relative">
          {/* Main Avatar Image */}
          <div className="w-[100px] h-[100px] rounded-full overflow-hidden border-2 border-gray-800 bg-gray-900">
            <Image
              alt={`${username} Avatar`}
              className="w-full h-full object-cover"
              src={avatarUrl}
              width={100}
              height={100}
            />
          </div>
        </div>

        {/* Name and Subtext */}
        <h1 className="text-xl font-bold mt-4 text-white">
          {loading ? "Loading..." : username}
        </h1>
        <p className="text-xs text-gray-500 mt-1">Member since {memberSince}</p>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex flex-col gap-3">
        {/* Edit Profile (Full Width) */}
        <button
          onClick={onEditProfile}
          className="w-full py-2.5 rounded-xl border border-white/20 bg-transparent text-sm font-medium text-white hover:bg-white/5 transition-colors"
        >
          Edit Profile
        </button>

        {/* Withdraw & Transfer Row */}
        <div className="flex gap-3">
          <button
            onClick={onWithdraw}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#d946ef] text-white text-sm font-semibold flex justify-center items-center gap-2 shadow-lg shadow-purple-900/20 hover:opacity-90 transition-opacity"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M12 9.75l-3 3m0 0l3 3m-3-3h7.5M9 12.75V3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Withdraw
          </button>
          <button
            onClick={onTransfer}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#d946ef] text-white text-sm font-semibold flex justify-center items-center gap-2 shadow-lg shadow-purple-900/20 hover:opacity-90 transition-opacity"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Transfer
          </button>
        </div>
      </div>
    </section>
  );
}
