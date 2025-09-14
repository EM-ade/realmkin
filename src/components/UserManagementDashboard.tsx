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
      const userRewardsCollection = collection(db, "userRewards");
      const userRewardsSnapshot = await getDocs(userRewardsCollection);
      const userRewardsData = userRewardsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const usersCollection = collection(db, "users");
      const usersSnapshot = await getDocs(usersCollection);
      type UserDoc = { id: string; username: string; [key: string]: unknown };
      const usersData = usersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as UserDoc[];

      const mergedUsers = userRewardsData.map((reward) => {
        const user = usersData.find((u) => u.id === reward.id);
        return {
          ...reward,
          username: user ? user.username : "N/A",
        };
      }) as User[];

      setUsers(mergedUsers);
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
        user.walletAddress.toLowerCase().includes(searchTerm.toLowerCase()))
  );



  return (
    <div className="text-white">
      <div className="mb-6 flex justify-between items-center">
        <input
          type="text"
          placeholder="Search by username or wallet address"
          value={searchTerm}
          onChange={handleSearch}
          className="w-full p-3 bg-[#0B0B09] border border-[#404040] rounded-lg text-white placeholder-[#666] focus:outline-none focus:ring-2 focus:ring-[#DA9C2F]"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-[#0B0B09] border border-[#404040] rounded-lg">
          <thead>
            <tr className="border-b border-[#404040]">
              <th className="py-3 px-2 sm:px-4 text-left text-sm sm:text-base font-bold text-[#DA9C2F]">
                Username
              </th>
              <th className="py-3 px-2 sm:px-4 text-left text-sm sm:text-base font-bold text-[#DA9C2F]">
                Wallet Address
              </th>
              <th className="py-3 px-2 sm:px-4 text-left text-sm sm:text-base font-bold text-[#DA9C2F]">
                Total Realmkin
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr
                key={user.id}
                onClick={() => {
                  setSelectedUser(user);
                  setIsModalOpen(true);
                }}
                className="cursor-pointer hover:bg-[#1a1a1a] transition-colors"
              >
                <td className="border-t border-[#404040] px-2 sm:px-4 py-2 sm:py-3 text-sm">
                  {user.username}
                </td>
                <td className="border-t border-[#404040] px-2 sm:px-4 py-2 sm:py-3 font-mono text-xs">
                  {user.walletAddress}
                </td>
                <td className="border-t border-[#404040] px-2 sm:px-4 py-2 sm:py-3 font-bold text-[#DA9C2F] text-sm">
                  ₥{user.totalRealmkin}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onClose={() => setIsModalOpen(false)}
          onUpdate={(updatedUser) => {
            setUsers((prevUsers) =>
              prevUsers.map((user) =>
                user.id === updatedUser.id ? updatedUser : user
              )
            );
            setSelectedUser(updatedUser);
          }}
          onDelete={(userId) => {
            setUsers((prevUsers) =>
              prevUsers.filter((user) => user.id !== userId)
            );
            setIsModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default UserManagementDashboard;
