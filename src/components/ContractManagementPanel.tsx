import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, updateDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';

interface ContractConfig {
  contract_address: string;
  magic_eden_symbol?: string;
  name: string;
  blockchain: string;
  weekly_rate: number;
  welcome_bonus: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ContractManagementPanelProps {
  isVisible: boolean;
  onClose: () => void;
}

export default function ContractManagementPanel({ isVisible, onClose }: ContractManagementPanelProps) {
  const [contracts, setContracts] = useState<ContractConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingContract, setEditingContract] = useState<ContractConfig | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    contractAddress: '', // required (doc ID)
    magicEdenSymbol: '', // optional (for Magic Eden filtering)
    name: '',
    blockchain: 'solana',
    weeklyRate: 200,
    welcomeBonus: 200
  });

  useEffect(() => {
    if (isVisible) {
      fetchContracts();
    }
  }, [isVisible]);

  const fetchContracts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Read from Firestore: contractBonusConfigs
      const snap = await getDocs(collection(db, 'contractBonusConfigs'));
      const list: ContractConfig[] = snap.docs.map(d => {
        const v = d.data() as any;
        return {
          contract_address: d.id,
          magic_eden_symbol: v.magic_eden_symbol ? String(v.magic_eden_symbol) : undefined,
          name: v.name || '',
          blockchain: v.blockchain || 'solana',
          weekly_rate: Number(v.weekly_rate) || 0,
          welcome_bonus: Number(v.welcome_bonus) || 0,
          is_active: Boolean(v.is_active ?? true),
          created_at: (v.createdAt?.toDate?.() || v.createdAt || new Date()).toISOString(),
          updated_at: (v.updatedAt?.toDate?.() || v.updatedAt || new Date()).toISOString(),
        };
      });
      setContracts(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contracts');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        setError('Authentication required');
        return;
      }

      if (editingContract) {
        // Update existing
        const ref = doc(db, 'contractBonusConfigs', editingContract.contract_address);
        await updateDoc(ref, {
          magic_eden_symbol: formData.magicEdenSymbol || null,
          name: formData.name,
          blockchain: formData.blockchain,
          weekly_rate: Number(formData.weeklyRate),
          welcome_bonus: Number(formData.welcomeBonus),
          updatedAt: serverTimestamp(),
        });
      } else {
        // Create new (ID = contract address)
        const id = formData.contractAddress.trim();
        const ref = doc(db, 'contractBonusConfigs', id);
        await setDoc(ref, {
          magic_eden_symbol: formData.magicEdenSymbol || null,
          name: formData.name,
          blockchain: formData.blockchain,
          weekly_rate: Number(formData.weeklyRate),
          welcome_bonus: Number(formData.welcomeBonus),
          is_active: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      // Reset form and refresh list
      setFormData({
        contractAddress: '',
        magicEdenSymbol: '',
        name: '',
        blockchain: 'solana',
        weeklyRate: 200,
        welcomeBonus: 200
      });
      setShowAddForm(false);
      setEditingContract(null);
      await fetchContracts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save contract');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (contract: ContractConfig) => {
    setEditingContract(contract);
    setFormData({
      contractAddress: contract.contract_address,
      magicEdenSymbol: contract.magic_eden_symbol || '',
      name: contract.name,
      blockchain: contract.blockchain,
      weeklyRate: contract.weekly_rate,
      welcomeBonus: contract.welcome_bonus
    });
    setShowAddForm(true);
  };

  const handleDeactivate = async (contractAddress: string) => {
    if (!confirm('Are you sure you want to deactivate this contract?')) return;

    setLoading(true);
    try {
      const ref = doc(db, 'contractBonusConfigs', contractAddress);
      await updateDoc(ref, { is_active: false, updatedAt: serverTimestamp() });
      await fetchContracts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate contract');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (contractAddress: string) => {
    if (!confirm('This will permanently delete the contract config. Continue?')) return;
    setLoading(true);
    try {
      const ref = doc(db, 'contractBonusConfigs', contractAddress);
      await deleteDoc(ref);
      await fetchContracts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete contract');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      contractAddress: '',
      magicEdenSymbol: '',
      name: '',
      blockchain: 'solana',
      weeklyRate: 200,
      welcomeBonus: 200
    });
    setShowAddForm(false);
    setEditingContract(null);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] rounded-lg border border-[#DA9C2F] max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-[#DA9C2F]">Contract Management</h2>
            <button
              onClick={onClose}
              className="text-white hover:text-[#DA9C2F] text-2xl"
            >
              ×
            </button>
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-500 text-red-300 px-4 py-2 rounded mb-4">
              {error}
            </div>
          )}

          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white">Active Contracts</h3>
            <button
              onClick={() => {
                setEditingContract(null);
                setFormData({
                  contractAddress: '',
                  magicEdenSymbol: '',
                  name: '',
                  blockchain: 'solana',
                  weeklyRate: 200,
                  welcomeBonus: 200,
                });
                setShowAddForm(true);
              }}
              className="bg-[#DA9C2F] text-black px-4 py-2 rounded hover:bg-[#C4A962] transition-colors"
            >
              Add Contract
            </button>
          </div>

          {/* Add/Edit Form */}
          {showAddForm && (
            <div className="bg-[#2a2a2a] rounded-lg p-4 mb-6 border border-[#444]">
              <h4 className="text-lg font-semibold text-white mb-4">
                {editingContract ? 'Edit Contract' : 'Add New Contract'}
              </h4>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#C4A962] mb-1">
                      Contract Address
                    </label>
                    <input
                      type="text"
                      value={formData.contractAddress}
                      onChange={(e) => setFormData({ ...formData, contractAddress: e.target.value })}
                      disabled={!!editingContract}
                      className="w-full bg-[#1a1a1a] border border-[#444] rounded px-3 py-2 text-white disabled:opacity-50"
                      placeholder="0x... or base58 address"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#C4A962] mb-1">
                      Magic Eden Symbol (optional)
                    </label>
                    <input
                      type="text"
                      value={formData.magicEdenSymbol}
                      onChange={(e) => setFormData({ ...formData, magicEdenSymbol: e.target.value })}
                      className="w-full bg-[#1a1a1a] border border-[#444] rounded px-3 py-2 text-white"
                      placeholder="e.g., the_realmkin_kins"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#C4A962] mb-1">
                      Collection Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-[#1a1a1a] border border-[#444] rounded px-3 py-2 text-white"
                      placeholder="e.g., Premium Realmkin Collection"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#C4A962] mb-1">
                      Blockchain
                    </label>
                    <select
                      value={formData.blockchain}
                      onChange={(e) => setFormData({ ...formData, blockchain: e.target.value })}
                      className="w-full bg-[#1a1a1a] border border-[#444] rounded px-3 py-2 text-white"
                    >
                      <option value="solana">Solana</option>
                      <option value="ethereum">Ethereum</option>
                      <option value="polygon">Polygon</option>
                      <option value="base">Base</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#C4A962] mb-1">
                      Weekly Rate (MKIN per NFT)
                    </label>
                    <input
                      type="number"
                      value={formData.weeklyRate}
                      onChange={(e) => setFormData({ ...formData, weeklyRate: parseInt(e.target.value) })}
                      className="w-full bg-[#1a1a1a] border border-[#444] rounded px-3 py-2 text-white"
                      min="1"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#C4A962] mb-1">
                      Welcome Bonus (MKIN per NFT)
                    </label>
                    <input
                      type="number"
                      value={formData.welcomeBonus}
                      onChange={(e) => setFormData({ ...formData, welcomeBonus: parseInt(e.target.value) })}
                      className="w-full bg-[#1a1a1a] border border-[#444] rounded px-3 py-2 text-white"
                      min="0"
                      required
                    />
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-[#DA9C2F] text-black px-4 py-2 rounded hover:bg-[#C4A962] transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : (editingContract ? 'Update' : 'Add')} Contract
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Contracts List */}
          {loading && !showAddForm ? (
            <div className="text-center py-8">
              <div className="text-white">Loading contracts...</div>
            </div>
          ) : (
            <div className="space-y-3">
              {contracts.map((contract) => (
                <div key={contract.contract_address} className="bg-[#2a2a2a] rounded-lg p-4 border border-[#444]">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-semibold text-white">{contract.name}</h4>
                        <span className="text-xs bg-[#DA9C2F] text-black px-2 py-1 rounded">
                          {contract.blockchain.toUpperCase()}
                        </span>
                        {!contract.is_active && (
                          <span className="text-xs bg-red-600 text-white px-2 py-1 rounded">
                            INACTIVE
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-[#C4A962] mb-1 font-mono">Address: {contract.contract_address}</div>
                      {contract.magic_eden_symbol && (
                        <div className="text-xs text-gray-400 mb-2 font-mono">ME Symbol: {contract.magic_eden_symbol}</div>
                      )}
                      <div className="flex space-x-4 text-sm text-gray-300">
                        <span>Weekly: {contract.weekly_rate} MKIN</span>
                        <span>Bonus: {contract.welcome_bonus} MKIN</span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(contract)}
                        className="text-[#DA9C2F] hover:text-[#C4A962] text-sm"
                      >
                        Edit
                      </button>
                      {contract.is_active && (
                        <button
                          onClick={() => handleDeactivate(contract.contract_address)}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          Deactivate
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(contract.contract_address)}
                        className="text-red-500 hover:text-red-400 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {contracts.length === 0 && !loading && (
                <div className="text-center py-8 text-gray-400">
                  No contracts configured yet.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
