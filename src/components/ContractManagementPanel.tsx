import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';

interface ContractConfig {
  contract_address: string;
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
    contractAddress: '',
    name: '',
    blockchain: 'solana',
    weeklyRate: 200,
    welcomeBonus: 200
  });

  const gatekeeperBase = process.env.NEXT_PUBLIC_GATEKEEPER_BASE || "https://gatekeeper-bot.fly.dev";

  useEffect(() => {
    if (isVisible) {
      fetchContracts();
    }
  }, [isVisible]);

  const fetchContracts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        setError('Authentication required');
        return;
      }

      const token = await user.getIdToken();
      const response = await fetch(`${gatekeeperBase}/api/admin/contracts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch contracts');
      }

      const data = await response.json();
      setContracts(data.contracts || []);
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

      const token = await user.getIdToken();
      const url = editingContract 
        ? `${gatekeeperBase}/api/admin/contracts/${encodeURIComponent(editingContract.contract_address)}`
        : `${gatekeeperBase}/api/admin/contracts`;
      
      const method = editingContract ? 'PUT' : 'POST';
      const body = editingContract 
        ? {
            name: formData.name,
            blockchain: formData.blockchain,
            weekly_rate: formData.weeklyRate,
            welcome_bonus: formData.welcomeBonus
          }
        : {
            contractAddress: formData.contractAddress,
            name: formData.name,
            blockchain: formData.blockchain,
            weeklyRate: formData.weeklyRate,
            welcomeBonus: formData.welcomeBonus
          };

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save contract');
      }

      // Reset form and refresh list
      setFormData({
        contractAddress: '',
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
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const response = await fetch(`${gatekeeperBase}/api/admin/contracts/${encodeURIComponent(contractAddress)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to deactivate contract');
      }

      await fetchContracts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate contract');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      contractAddress: '',
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
              onClick={() => setShowAddForm(true)}
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
                      <div className="text-sm text-[#C4A962] mb-2 font-mono">
                        {contract.contract_address}
                      </div>
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
