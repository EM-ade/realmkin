"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { updateUserProfile, isUsernameTaken } from "@/services/profileService";
import { nftService } from "@/services/nftService";

// Add Material Icons styling
const materialIconStyle = {
  fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24"
};

interface NFT {
  mint: string;
  name: string;
  image: string;
}

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  walletAddress: string;
  currentUsername?: string;
  currentAvatarUrl?: string;
  onSuccess: () => void;
}

export default function ProfileEditModal({
  isOpen,
  onClose,
  userId,
  walletAddress,
  currentUsername,
  currentAvatarUrl,
  onSuccess,
}: ProfileEditModalProps) {
  const [username, setUsername] = useState(currentUsername || "");
  const [selectedAvatar, setSelectedAvatar] = useState(currentAvatarUrl || "");
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(false);
  const [nftsLoading, setNftsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [showNftPicker, setShowNftPicker] = useState(false);

  // Fetch user's NFTs
  useEffect(() => {
    const fetchNFTs = async () => {
      if (!isOpen || !walletAddress) return;

      setNftsLoading(true);
      try {
        const nftCollection = await nftService.fetchAllContractNFTs(walletAddress);
        const userNFTs = nftCollection?.nfts || [];
        setNfts(
          userNFTs.map((nft) => ({
            mint: nft.mint,
            name: nft.name || "Unnamed NFT",
            image: nft.image || "/realmkin-logo.png",
          }))
        );
      } catch (error) {
        console.error("Error fetching NFTs:", error);
      } finally {
        setNftsLoading(false);
      }
    };

    fetchNFTs();
  }, [isOpen, walletAddress]);

  // Check username availability with debounce
  useEffect(() => {
    if (!username || username === currentUsername || currentUsername) {
      setUsernameError(null);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setUsernameChecking(true);
      try {
        // Validate format
        const normalizedUsername = username.toLowerCase().trim();
        if (!/^[a-z0-9_]{3,20}$/.test(normalizedUsername)) {
          setUsernameError(
            "Username must be 3-20 characters (letters, numbers, underscores only)"
          );
          return;
        }

        // Check availability
        const taken = await isUsernameTaken(normalizedUsername);
        if (taken) {
          setUsernameError("Username is already taken");
        } else {
          setUsernameError(null);
        }
      } catch (error) {
        console.error("Error checking username:", error);
      } finally {
        setUsernameChecking(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [username, currentUsername]);

  const handleSave = async () => {
    if (!userId) return;

    console.log("💾 Saving profile...", {
      currentUsername,
      newUsername: username,
      currentAvatar: currentAvatarUrl,
      selectedAvatar,
      avatarChanged: selectedAvatar !== currentAvatarUrl,
    });

    setLoading(true);
    setError(null);

    try {
      const updates: any = {};

      // Update username if changed
      if (username.trim() && username.trim() !== currentUsername) {
        updates.username = username.trim();
      }

      // Update avatar if changed (or if no current avatar and one is selected)
      if (selectedAvatar && selectedAvatar !== currentAvatarUrl) {
        updates.avatarUrl = selectedAvatar;
        console.log("✅ Avatar will be updated to:", selectedAvatar);
      }

      // Check if there are any updates to make
      if (Object.keys(updates).length === 0) {
        console.log("⚠️ No changes detected");
        setError("No changes to save");
        setLoading(false);
        return;
      }

      console.log("📤 Sending updates:", updates);
      const result = await updateUserProfile(userId, updates);

      if (!result.success) {
        console.error("❌ Update failed:", result.error);
        setError(result.error || "Failed to update profile");
        return;
      }

      console.log("✅ Profile updated successfully!");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("❌ Error saving profile:", error);
      setError(error instanceof Error ? error.message : "Failed to save profile");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#111111] rounded-2xl border-2 border-[#fbbf24] shadow-[0_0_50px_rgba(251,191,36,0.15)] max-w-[440px] w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#27272a]/50">
          <h2 className="text-xl font-bold text-white uppercase tracking-tight">Edit Profile</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined" style={materialIconStyle}>close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Avatar Section */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative group">
              <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-[#fbbf24]/50 bg-gray-900 shadow-lg shadow-[#fbbf24]/10">
                <Image
                  src={selectedAvatar || "/realmkin-logo.png"}
                  alt="Avatar"
                  width={112}
                  height={112}
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowNftPicker(!showNftPicker)}
                className="absolute bottom-0 right-0 bg-[#fbbf24] text-black p-2 rounded-full border-2 border-[#111111] shadow-lg hover:scale-105 transition-transform flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-sm font-bold" style={materialIconStyle}>
                  photo_camera
                </span>
              </button>
            </div>
            <p className="mt-4 text-xs font-semibold text-gray-400 uppercase tracking-widest">
              Update Avatar
            </p>
          </div>

          {/* Username Field */}
          <div className="space-y-2 mb-6">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1" htmlFor="username">
              Username
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#fbbf24]/60 material-symbols-outlined text-lg" style={materialIconStyle}>
                alternate_email
              </span>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading || usernameChecking}
                placeholder="Enter your username"
                className="w-full bg-black/40 border border-[#27272a] focus:border-[#fbbf24]/50 focus:ring-1 focus:ring-[#fbbf24]/50 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder-gray-600 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            {usernameChecking && (
              <p className="text-xs text-gray-400 mt-1 ml-1">Checking availability...</p>
            )}
            {usernameError && (
              <p className="text-xs text-red-400 mt-1 ml-1">{usernameError}</p>
            )}
            {!usernameError && username && !currentUsername && !usernameChecking && (
              <p className="text-xs text-green-400 mt-1 ml-1">✓ Username is available</p>
            )}
          </div>

          {/* NFT Picker (Collapsible) */}
          {showNftPicker && (
            <div className="mb-6">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider ml-1 mb-3">
                Select from your NFTs
              </label>

              {nftsLoading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#fbbf24]"></div>
                </div>
              ) : nfts.length === 0 ? (
                <div className="text-center py-8 bg-black/40 rounded-lg border border-[#27272a]">
                  <p className="text-gray-400 text-sm">No NFTs found in your wallet</p>
                  <p className="text-xs text-gray-500 mt-2">
                    Get some Realmkin NFTs to use as your avatar!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3 max-h-64 overflow-y-auto p-2 bg-black/40 rounded-lg border border-[#27272a]">
                  {nfts.map((nft) => (
                    <button
                      key={nft.mint}
                      type="button"
                      onClick={() => {
                        setSelectedAvatar(nft.image);
                        setShowNftPicker(false);
                      }}
                      className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                        selectedAvatar === nft.image
                          ? "border-[#fbbf24] scale-95"
                          : "border-transparent hover:border-[#fbbf24]/30"
                      }`}
                    >
                      <Image
                        src={nft.image}
                        alt={nft.name}
                        width={100}
                        height={100}
                        className="w-full h-full object-cover"
                      />
                      {selectedAvatar === nft.image && (
                        <div className="absolute inset-0 bg-[#fbbf24]/20 flex items-center justify-center">
                          <span className="material-symbols-outlined text-white text-2xl" style={materialIconStyle}>
                            check_circle
                          </span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 mb-6">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="mt-10 space-y-3">
            <button
              onClick={handleSave}
              disabled={loading || usernameChecking}
              className="w-full bg-[#fbbf24] hover:brightness-110 text-black font-bold py-4 rounded-xl transition-all shadow-lg shadow-[#fbbf24]/10 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-xl" style={materialIconStyle}>
                save
              </span>
              {loading ? "Saving..." : "Save Changes"}
            </button>
            <button
              onClick={onClose}
              disabled={loading}
              className="w-full text-gray-500 hover:text-white text-sm font-semibold py-2 transition-colors"
            >
              Discard Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
