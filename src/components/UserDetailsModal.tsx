"use client";

import { useState } from "react";
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

  const handleAddRealmkin = async () => {
    const userRef = doc(firestore, "userRewards", user.id);
    await updateDoc(userRef, {
      totalRealmkin: increment(amount),
    });
    onUpdate({ ...user, totalRealmkin: user.totalRealmkin + amount });
  };

  const handleSubtractRealmkin = async () => {
    const userRef = doc(firestore, "userRewards", user.id);
    await updateDoc(userRef, {
      totalRealmkin: increment(-amount),
    });
    onUpdate({
      ...user,
      totalRealmkin: Math.max(0, user.totalRealmkin - amount),
    });
  };

  const handleSetRealmkin = async () => {
    const userRef = doc(firestore, "userRewards", user.id);
    await updateDoc(userRef, {
      totalRealmkin: amount,
    });
    onUpdate({ ...user, totalRealmkin: amount });
  };

  const handleUpdateUsername = async () => {
    if (newUsername.trim() === "") {
      alert("Username cannot be empty");
      return;
    }

    // Check if the new username already exists
    const usersCollection = collection(firestore, "users");
    const usernameQuery = query(usersCollection, where("username", "==", newUsername));
    const usernameSnapshot = await getDocs(usernameQuery);

    if (!usernameSnapshot.empty && newUsername !== user.username) {
      alert("Username already exists. Please choose a different one.");
      return;
    }

    const userRef = doc(firestore, "users", user.id);
    await updateDoc(userRef, {
      username: newUsername,
    });

    onUpdate({ ...user, username: newUsername });
  };

  const handleDeleteUser = async () => {
    if (
      confirm(
        `Are you sure you want to delete user ${user.username}? This action cannot be undone.`
      )
    ) {
      // Delete from users collection
      await deleteDoc(doc(firestore, "users", user.id));
      // Delete from userRewards collection
      await deleteDoc(doc(firestore, "userRewards", user.id));

      onDelete(user.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#1a0f2e] border-2 border-[#d3b136] rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-glow">
            Manage {user.username}
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-300 transition-colors"
          >
            &times;
          </button>
        </div>
        <div className="mb-4">
          <p className="text-sm text-gray-400">Wallet: {user.walletAddress}</p>
          <p className="text-sm text-yellow-400 font-bold">
            Realmkin: ₥{user.totalRealmkin}
          </p>
        </div>
        <div className="mb-4">
          <input
            type="text"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            className="w-full p-3 bg-[#2b1c3b] border-2 border-[#d3b136] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#d3b136] mb-2"
            placeholder="New username"
          />
          <button
            onClick={handleUpdateUsername}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg shadow-purple-500/30 mb-4"
          >
            Update Username
          </button>
        </div>
        <div className="mb-4">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full p-3 bg-[#2b1c3b] border-2 border-[#d3b136] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#d3b136]"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={handleAddRealmkin}
            className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg shadow-green-500/30"
          >
            Add Realmkin
          </button>
          <button
            onClick={handleSubtractRealmkin}
            className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg shadow-red-500/30"
          >
            Subtract Realmkin
          </button>
          <button
            onClick={handleSetRealmkin}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg shadow-blue-500/30"
          >
            Set Realmkin
          </button>
        </div>
        <div className="mt-6">
          <button
            onClick={handleDeleteUser}
            className="w-full bg-red-700 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg shadow-red-500/30"
          >
            Delete User
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserDetailsModal;
