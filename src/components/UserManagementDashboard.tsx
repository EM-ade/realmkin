'use client';

import { useState, useEffect } from 'react';
import { db as firestore } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, increment, writeBatch } from 'firebase/firestore';

interface User {
  id: string;
  username: string;
  walletAddress: string;
  totalRealmkin: number;
}

const UserManagementDashboard = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [amount, setAmount] = useState(0);

  useEffect(() => {
    const fetchUsers = async () => {
      const userRewardsCollection = collection(firestore, 'userRewards');
      const userRewardsSnapshot = await getDocs(userRewardsCollection);
      const userRewardsData = userRewardsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const usersCollection = collection(firestore, 'users');
      const usersSnapshot = await getDocs(usersCollection);
      type UserDoc = { id: string; username: string; [key: string]: unknown };
      const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as UserDoc[];

      const mergedUsers = userRewardsData.map(reward => {
        const user = usersData.find(u => u.id === reward.id);
        return {
          ...reward,
          username: user ? user.username : 'N/A',
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
    user =>
      (user.username && user.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.walletAddress && user.walletAddress.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAddRealmkin = async () => {
    if (selectedUser) {
      const userRef = doc(firestore, 'userRewards', selectedUser.id);
      await updateDoc(userRef, {
        totalRealmkin: increment(amount)
      });
      // Update only the changed user to preserve usernames
      setUsers(prevUsers => prevUsers.map(user =>
        user.id === selectedUser.id
          ? { ...user, totalRealmkin: user.totalRealmkin + amount }
          : user
      ));
    }
  };

  const handleSubtractRealmkin = async () => {
    if (selectedUser) {
      const userRef = doc(firestore, 'userRewards', selectedUser.id);
      await updateDoc(userRef, {
        totalRealmkin: increment(-amount)
      });
      // Update only the changed user to preserve usernames
      setUsers(prevUsers => prevUsers.map(user =>
        user.id === selectedUser.id
          ? { ...user, totalRealmkin: Math.max(0, user.totalRealmkin - amount) }
          : user
      ));
    }
  };

  const handleSetRealmkin = async () => {
    if (selectedUser) {
      const userRef = doc(firestore, 'userRewards', selectedUser.id);
      await updateDoc(userRef, {
        totalRealmkin: amount
      });
      // Update only the changed user to preserve usernames
      setUsers(prevUsers => prevUsers.map(user =>
        user.id === selectedUser.id
          ? { ...user, totalRealmkin: amount }
          : user
      ));
    }
  };

  const handleMigration = async () => {
    const usersCollection = collection(firestore, 'userRewards');
    const userSnapshot = await getDocs(usersCollection);
    const batch = writeBatch(firestore);

    userSnapshot.forEach(doc => {
      const data = doc.data();
      if ((!data.totalRealmkin || data.totalRealmkin === 0) && data.totalClaimed > 0) {
        batch.update(doc.ref, { totalRealmkin: data.totalClaimed });
      }
    });

    await batch.commit();
    alert('Migration complete!');
  };

  return (
    <div className="text-white">
      <div className="mb-6 flex justify-between items-center">
        <input
          type="text"
          placeholder="Search by username or wallet address"
          value={searchTerm}
          onChange={handleSearch}
          className="w-full p-3 bg-[#1a0f2e] border-2 border-[#d3b136] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#d3b136]"
        />
        <button
          onClick={handleMigration}
          className="ml-4 bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg shadow-yellow-500/30"
        >
          Run Migration
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-[#1a0f2e] border-2 border-[#d3b136] rounded-lg">
          <thead>
            <tr className="border-b-2 border-[#d3b136]">
              <th className="py-3 px-2 sm:px-4 text-left text-base sm:text-lg font-bold text-glow">Username</th>
              <th className="py-3 px-2 sm:px-4 text-left text-base sm:text-lg font-bold text-glow">Wallet Address</th>
              <th className="py-3 px-2 sm:px-4 text-left text-base sm:text-lg font-bold text-glow">Total Realmkin</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr
                key={user.id}
                onClick={() => setSelectedUser(user)}
                className="cursor-pointer hover:bg-[#2b1c3b] transition-colors"
              >
                <td className="border-t border-[#d3b136] px-2 sm:px-4 py-2 sm:py-3 text-sm sm:text-base">{user.username}</td>
                <td className="border-t border-[#d3b136] px-2 sm:px-4 py-2 sm:py-3 font-mono text-xs sm:text-sm">{user.walletAddress}</td>
                <td className="border-t border-[#d3b136] px-2 sm:px-4 py-2 sm:py-3 font-bold text-yellow-400 text-sm sm:text-base">₥{user.totalRealmkin}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedUser && (
        <div className="mt-6 sm:mt-8 p-4 sm:p-6 bg-[#1a0f2e] border-2 border-[#d3b136] rounded-lg">
          <h2 className="text-xl sm:text-3xl font-bold mb-4 sm:mb-6 text-glow">
            Manage {selectedUser.username}
          </h2>
          <div className="flex items-center mb-4 sm:mb-6">
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(Number(e.target.value))}
              className="w-full p-2 sm:p-3 bg-[#2b1c3b] border-2 border-[#d3b136] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#d3b136] text-sm sm:text-base"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <button
              onClick={handleAddRealmkin}
              className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 sm:py-3 px-4 sm:px-6 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg shadow-green-500/30 text-sm sm:text-base"
            >
              Add Realmkin
            </button>
            <button
              onClick={handleSubtractRealmkin}
              className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 sm:py-3 px-4 sm:px-6 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg shadow-red-500/30 text-sm sm:text-base"
            >
              Subtract Realmkin
            </button>
            <button
              onClick={handleSetRealmkin}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 sm:py-3 px-4 sm:px-6 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg shadow-blue-500/30 text-sm sm:text-base"
            >
              Set Realmkin
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementDashboard;