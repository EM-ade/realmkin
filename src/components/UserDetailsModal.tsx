"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { doc, updateDoc, increment, deleteDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db as firestore } from "@/lib/firebase";

interface User {
  id: string;
  username: string;
  walletAddress: string;
  totalRealmkin: number;
}

interface UserDetailsModalProps {
  user: User;
  onClose: () => void;
  onUpdate: (updatedUser: User) => void;
  onDelete: (userId: string) => void;
}

const UserDetailsModal = ({
  user,
  onClose,
  onUpdate,
  onDelete,
}: UserDetailsModalProps) => {
  const [amount, setAmount] = useState(0);
  const [newUsername, setNewUsername] = useState(user.username);
  const [isBusy, setIsBusy] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const getValidAmount = (): number => {
    const v = Math.trunc(Number(amount));
    return isNaN(v) ? 0 : Math.max(0, v);
  };

  const handleAddRealmkin = async () => {
    try {
      setIsBusy(true);
      const delta = getValidAmount();
      if (delta <= 0) return;
      const userRef = doc(firestore, "userRewards", user.id);
      await updateDoc(userRef, { totalRealmkin: increment(delta) });
      onUpdate({ ...user, totalRealmkin: user.totalRealmkin + delta });
    } catch (e) {
      console.error(e);
      alert("Failed to add Realmkin");
    } finally {
      setIsBusy(false);
    }
  };

  const handleSubtractRealmkin = async () => {
    try {
      setIsBusy(true);
      const delta = getValidAmount();
      if (delta <= 0) return;
      const userRef = doc(firestore, "userRewards", user.id);
      await updateDoc(userRef, { totalRealmkin: increment(-delta) });
      onUpdate({ ...user, totalRealmkin: Math.max(0, user.totalRealmkin - delta) });
    } catch (e) {
      console.error(e);
      alert("Failed to subtract Realmkin");
    } finally {
      setIsBusy(false);
    }
  };

  const handleSetRealmkin = async () => {
    try {
      setIsBusy(true);
      const value = getValidAmount();
      const userRef = doc(firestore, "userRewards", user.id);
      await updateDoc(userRef, { totalRealmkin: value });
      onUpdate({ ...user, totalRealmkin: value });
    } catch (e) {
      console.error(e);
      alert("Failed to set Realmkin");
    } finally {
      setIsBusy(false);
    }
  };

  const handleUpdateUsername = async () => {
    if (newUsername.trim() === "") {
      alert("Username cannot be empty");
      return;
    }

    try {
      setIsBusy(true);
      // Check if the new username already exists
      const usersCollection = collection(firestore, "users");
      const usernameQuery = query(usersCollection, where("username", "==", newUsername));
      const usernameSnapshot = await getDocs(usernameQuery);

      if (!usernameSnapshot.empty && newUsername !== user.username) {
        alert("Username already exists. Please choose a different one.");
        return;
      }

      const userRef = doc(firestore, "users", user.id);
      await updateDoc(userRef, { username: newUsername });
      onUpdate({ ...user, username: newUsername });
    } catch (e) {
      console.error(e);
      alert("Failed to update username");
    } finally {
      setIsBusy(false);
    }
  };

  const handleDeleteUser = async () => {
    if (
      confirm(
        `Are you sure you want to delete user ${user.username}? This action cannot be undone.`
      )
    ) {
      try {
        setIsBusy(true);
        await deleteDoc(doc(firestore, "users", user.id));
        await deleteDoc(doc(firestore, "userRewards", user.id));
        onDelete(user.id);
        onClose();
      } catch (e) {
        console.error(e);
        alert("Failed to delete user");
      } finally {
        setIsBusy(false);
      }
    }
  };

  if (!mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] border border-[#DA9C2F]/30 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-[#DA9C2F] mb-1">
              {user.username}
            </h2>
            <p className="text-white/60 text-xs">User Management</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white text-2xl leading-none transition-colors"
          >
            ×
          </button>
        </div>

        {/* User Info */}
        <div className="bg-[#0f0f0f] rounded-lg p-4 mb-6 border border-[#DA9C2F]/20">
          <div className="space-y-2">
            <div>
              <p className="text-white/60 text-xs mb-1">Wallet Address</p>
              <p className="text-white/80 text-xs font-mono break-all">{user.walletAddress}</p>
            </div>
            <div className="pt-2 border-t border-[#DA9C2F]/10">
              <p className="text-white/60 text-xs mb-1">Current Balance</p>
              <p className="text-[#DA9C2F] font-bold text-lg">₥{user.totalRealmkin.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Update Username Section */}
        <div className="mb-6">
          <label className="text-white/60 text-xs font-semibold block mb-2">Update Username</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              className="flex-1 p-2 bg-[#0B0B09] border border-[#DA9C2F]/30 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#DA9C2F] text-sm"
              placeholder="New username"
            />
            <button
              onClick={handleUpdateUsername}
              disabled={isBusy}
              className="px-4 py-2 bg-[#DA9C2F] text-black font-semibold rounded-lg hover:bg-[#ffbf00] transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save
            </button>
          </div>
        </div>

        {/* Balance Management Section */}
        <div className="mb-6">
          <label className="text-white/60 text-xs font-semibold block mb-2">Manage Balance</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            placeholder="Enter amount"
            className="w-full p-3 bg-[#0B0B09] border border-[#DA9C2F]/30 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#DA9C2F] mb-3 text-sm"
          />
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={handleAddRealmkin}
              disabled={isBusy}
              className="px-3 py-2 bg-green-500/20 text-green-400 border border-green-500/30 font-semibold rounded-lg hover:bg-green-500/30 transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + Add
            </button>
            <button
              onClick={handleSubtractRealmkin}
              disabled={isBusy}
              className="px-3 py-2 bg-orange-500/20 text-orange-400 border border-orange-500/30 font-semibold rounded-lg hover:bg-orange-500/30 transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              − Subtract
            </button>
            <button
              onClick={handleSetRealmkin}
              disabled={isBusy}
              className="px-3 py-2 bg-[#DA9C2F]/20 text-[#DA9C2F] border border-[#DA9C2F]/30 font-semibold rounded-lg hover:bg-[#DA9C2F]/30 transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              = Set
            </button>
          </div>
        </div>

        {/* Delete User Section */}
        <div className="pt-4 border-t border-[#DA9C2F]/10">
          <button
            onClick={handleDeleteUser}
            disabled={isBusy}
            className="w-full px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 font-semibold rounded-lg hover:bg-red-500/30 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🗑️ Delete User
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default UserDetailsModal;
