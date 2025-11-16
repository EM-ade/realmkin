"use client";

import React, { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import UserDetailsModal from "./UserDetailsModal";

interface User {
  id: string;
  username: string;
  walletAddress: string;
  totalRealmkin: number;
}

const UserManagementDashboard = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Try to fetch from userRewards first (production)
        let userRewardsData: Array<{ id: string; [key: string]: unknown }> = [];
        try {
          const userRewardsCollection = collection(db, "userRewards");
          const userRewardsSnapshot = await getDocs(userRewardsCollection);
          userRewardsData = userRewardsSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
        } catch (e) {
          console.log(
            "userRewards collection not found, using users collection",
          );
        }

        // Fetch users collection
        const usersCollection = collection(db, "users");
        const usersSnapshot = await getDocs(usersCollection);
        type UserDoc = {
          id: string;
          username: string;
          totalRealmkin?: number;
          [key: string]: unknown;
        };
        const usersData = usersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as UserDoc[];

        // If userRewards exists, merge with users
        let mergedUsers: User[] = [];
        if (userRewardsData.length > 0) {
          mergedUsers = userRewardsData.map((reward) => {
            const user = usersData.find((u) => u.id === reward.id);
            return {
              ...reward,
              username: user ? user.username : "N/A",
            };
          }) as User[];
        } else {
          // Otherwise, use users collection directly
          mergedUsers = usersData.map((user) => ({
            id: user.id,
            username: user.username || "N/A",
            walletAddress: user.walletAddress || "N/A",
            totalRealmkin: user.totalRealmkin || 0,
          })) as User[];
        }

        setUsers(mergedUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    fetchUsers();
  }, []);

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const filteredUsers = users.filter(
    (user) =>
      (user.username &&
        user.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.walletAddress &&
        user.walletAddress.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  return (
    <div className="text-white">
      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by username or wallet..."
          value={searchTerm}
          onChange={handleSearch}
          className="w-full p-3 bg-[#0B0B09] border border-[#DA9C2F]/30 rounded-lg text-white placeholder-[#666] focus:outline-none focus:ring-2 focus:ring-[#DA9C2F] text-sm md:text-base"
        />
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#DA9C2F]/20">
              <th className="py-3 px-4 text-left text-sm font-bold text-[#DA9C2F]">
                Username
              </th>
              <th className="py-3 px-4 text-left text-sm font-bold text-[#DA9C2F]">
                Wallet Address
              </th>
              <th className="py-3 px-4 text-right text-sm font-bold text-[#DA9C2F]">
                Total MKIN
              </th>
              <th className="py-3 px-4 text-center text-sm font-bold text-[#DA9C2F]">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr
                key={user.id}
                className="border-b border-[#DA9C2F]/10 hover:bg-[#DA9C2F]/5 transition-colors"
              >
                <td className="py-3 px-4 text-sm font-medium">
                  {user.username}
                </td>
                {/*<td className="py-3 px-4 text-sm font-mono text-[#DA9C2F]/80">
                  {user.walletAddress.slice(0, 8)}...
                  {user.walletAddress.slice(-8)}
                </td>*/}
                <td className="py-3 px-4 text-sm font-bold text-[#DA9C2F] text-right">
                  ₥{user.totalRealmkin.toLocaleString()}
                </td>
                <td className="py-3 px-4 text-center">
                  <button
                    onClick={() => {
                      setSelectedUser(user);
                      setIsModalOpen(true);
                    }}
                    className="px-3 py-1 bg-[#DA9C2F]/20 text-[#DA9C2F] rounded text-xs font-semibold hover:bg-[#DA9C2F]/40 transition-colors"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {filteredUsers.map((user) => (
          <div
            key={user.id}
            onClick={() => {
              setSelectedUser(user);
              setIsModalOpen(true);
            }}
            className="bg-[#0B0B09] border border-[#DA9C2F]/20 rounded-lg p-4 cursor-pointer hover:bg-[#1a1a1a] transition-colors"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="font-bold text-white text-sm">{user.username}</p>
                {/*<p className="text-[#DA9C2F]/80 font-mono text-xs mt-1">
                  {user.walletAddress.slice(0, 6)}...
                  {user.walletAddress.slice(-6)}
                </p>*/}
              </div>
              <div className="text-right">
                <p className="text-[#DA9C2F] font-bold text-sm">
                  ₥{user.totalRealmkin.toLocaleString()}
                </p>
                <p className="text-white/40 text-xs mt-1">MKIN</p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedUser(user);
                setIsModalOpen(true);
              }}
              className="w-full px-3 py-2 bg-[#DA9C2F]/20 text-[#DA9C2F] rounded text-xs font-semibold hover:bg-[#DA9C2F]/40 transition-colors"
            >
              View Details
            </button>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredUsers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-white/60 text-sm">No users found</p>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onClose={() => setIsModalOpen(false)}
          onUpdate={(updatedUser) => {
            setUsers((prevUsers) =>
              prevUsers.map((user) =>
                user.id === updatedUser.id ? updatedUser : user,
              ),
            );
            setSelectedUser(updatedUser);
          }}
          onDelete={(userId) => {
            setUsers((prevUsers) =>
              prevUsers.filter((user) => user.id !== userId),
            );
            setIsModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default UserManagementDashboard;
