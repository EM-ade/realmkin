import React, { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  deleteDoc,
} from "firebase/firestore";

interface RewardTier {
  minNFTs: number;
  maxNFTs: number;
  weeklyRate: number;
}

interface ContractConfig {
  contract_address: string;
  magic_eden_symbol?: string;
  name: string;
  blockchain: string;
  tiers: RewardTier[];
  welcome_bonus: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ContractManagementPanelProps {
  isVisible: boolean;
  onClose: () => void;
}

export default function ContractManagementPanel({
  isVisible,
  onClose,
}: ContractManagementPanelProps) {
  const [contracts, setContracts] = useState<ContractConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingContract, setEditingContract] = useState<ContractConfig | null>(
    null,
  );

  // Form state
  const [formData, setFormData] = useState({
    contractAddress: "",
    magicEdenSymbol: "",
    name: "",
    blockchain: "solana",
    tiers: [
      { minNFTs: 1, maxNFTs: 1, weeklyRate: 20 },
      { minNFTs: 2, maxNFTs: 5, weeklyRate: 25 },
      { minNFTs: 6, maxNFTs: 9, weeklyRate: 40 },
      { minNFTs: 10, maxNFTs: 19, weeklyRate: 60 },
      { minNFTs: 20, maxNFTs: 999, weeklyRate: 100 },
    ] as RewardTier[],
    welcomeBonus: 200,
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
      const snap = await getDocs(collection(db, "contractBonusConfigs"));
      type ContractDoc = {
        magic_eden_symbol?: unknown;
        name?: unknown;
        blockchain?: unknown;
        tiers?: unknown;
        welcome_bonus?: unknown;
        is_active?: unknown;
        createdAt?: { toDate?: () => Date } | Date | string;
        updatedAt?: { toDate?: () => Date } | Date | string;
      };
      const list: ContractConfig[] = snap.docs.map((d) => {
        const v = d.data() as ContractDoc;
        const createdRaw =
          v.createdAt &&
          typeof v.createdAt === "object" &&
          "toDate" in v.createdAt
            ? (v.createdAt as { toDate?: () => Date }).toDate?.() || new Date()
            : (v.createdAt as Date | string | undefined) || new Date();
        const updatedRaw =
          v.updatedAt &&
          typeof v.updatedAt === "object" &&
          "toDate" in v.updatedAt
            ? (v.updatedAt as { toDate?: () => Date }).toDate?.() || new Date()
            : (v.updatedAt as Date | string | undefined) || new Date();

        // Parse tiers - handle both old and new format
        let tiers: RewardTier[] = [];

        if (Array.isArray(v.tiers) && v.tiers.length > 0) {
          // New format with tiers array
          tiers = v.tiers
            .map((t: unknown) => {
              const tier = t as {
                minNFTs?: unknown;
                maxNFTs?: unknown;
                weeklyRate?: unknown;
              };
              return {
                minNFTs: Number(tier.minNFTs || 1),
                maxNFTs: Number(tier.maxNFTs || 999),
                weeklyRate: Number(tier.weeklyRate || 200),
              };
            })
            .filter((t) => t.minNFTs > 0 && t.maxNFTs > 0 && t.weeklyRate > 0);
        }

        // If no valid tiers, use default tier
        if (tiers.length === 0) {
          tiers = [{ minNFTs: 1, maxNFTs: 999, weeklyRate: 200 }];
        }

        return {
          contract_address: d.id,
          magic_eden_symbol: v.magic_eden_symbol
            ? String(v.magic_eden_symbol)
            : undefined,
          name: typeof v.name === "string" ? v.name : "",
          blockchain:
            typeof v.blockchain === "string" ? v.blockchain : "solana",
          tiers,
          welcome_bonus: Number(v.welcome_bonus ?? 200) || 200,
          is_active: Boolean(v.is_active ?? true),
          created_at: (createdRaw instanceof Date
            ? createdRaw
            : new Date(String(createdRaw))
          ).toISOString(),
          updated_at: (updatedRaw instanceof Date
            ? updatedRaw
            : new Date(String(updatedRaw))
          ).toISOString(),
        };
      });
      setContracts(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load contracts");
    } finally {
      setLoading(false);
    }
  };

  const validateTiers = (tiers: RewardTier[]): string | null => {
    if (!tiers || tiers.length === 0) {
      return "At least one tier is required";
    }

    for (let i = 0; i < tiers.length; i++) {
      const tier = tiers[i];
      if (tier.minNFTs < 1) {
        return `Tier ${i + 1}: minNFTs must be at least 1`;
      }
      if (tier.maxNFTs < tier.minNFTs) {
        return `Tier ${i + 1}: maxNFTs must be >= minNFTs`;
      }
      if (tier.weeklyRate <= 0) {
        return `Tier ${i + 1}: weeklyRate must be positive`;
      }
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        setError("Authentication required");
        setLoading(false);
        return;
      }

      // Validate tiers
      const tierError = validateTiers(formData.tiers);
      if (tierError) {
        setError(tierError);
        setLoading(false);
        return;
      }

      if (editingContract) {
        // Update existing
        const ref = doc(
          db,
          "contractBonusConfigs",
          editingContract.contract_address,
        );
        await updateDoc(ref, {
          magic_eden_symbol: formData.magicEdenSymbol || null,
          name: formData.name,
          blockchain: formData.blockchain,
          tiers: formData.tiers,
          welcome_bonus: Number(formData.welcomeBonus),
          updatedAt: serverTimestamp(),
        });
      } else {
        // Create new
        const id = formData.contractAddress.trim();
        if (!id) {
          setError("Contract address is required");
          setLoading(false);
          return;
        }
        const ref = doc(db, "contractBonusConfigs", id);
        await setDoc(ref, {
          magic_eden_symbol: formData.magicEdenSymbol || null,
          name: formData.name,
          blockchain: formData.blockchain,
          tiers: formData.tiers,
          welcome_bonus: Number(formData.welcomeBonus),
          is_active: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      // Reset form and refresh
      resetForm();
      setShowAddForm(false);
      setEditingContract(null);
      await fetchContracts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save contract");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (contract: ContractConfig) => {
    setEditingContract(contract);
    setFormData({
      contractAddress: contract.contract_address,
      magicEdenSymbol: contract.magic_eden_symbol || "",
      name: contract.name,
      blockchain: contract.blockchain,
      tiers: [...contract.tiers],
      welcomeBonus: contract.welcome_bonus,
    });
    setShowAddForm(true);
  };

  const handleDeactivate = async (contractAddress: string) => {
    setLoading(true);
    setError(null);
    try {
      const contract = contracts.find(
        (c) => c.contract_address === contractAddress,
      );
      if (!contract) return;

      const ref = doc(db, "contractBonusConfigs", contractAddress);
      await updateDoc(ref, {
        is_active: !contract.is_active,
        updatedAt: serverTimestamp(),
      });
      await fetchContracts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (contractAddress: string) => {
    if (!confirm("Are you sure you want to delete this contract?")) return;
    setLoading(true);
    setError(null);
    try {
      const ref = doc(db, "contractBonusConfigs", contractAddress);
      await deleteDoc(ref);
      await fetchContracts();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete contract",
      );
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      contractAddress: "",
      magicEdenSymbol: "",
      name: "",
      blockchain: "solana",
      tiers: [
        { minNFTs: 1, maxNFTs: 1, weeklyRate: 20 },
        { minNFTs: 2, maxNFTs: 5, weeklyRate: 25 },
        { minNFTs: 6, maxNFTs: 9, weeklyRate: 40 },
        { minNFTs: 10, maxNFTs: 19, weeklyRate: 60 },
        { minNFTs: 20, maxNFTs: 999, weeklyRate: 100 },
      ],
      welcomeBonus: 200,
    });
  };

  const addTier = () => {
    const lastTier = formData.tiers[formData.tiers.length - 1];
    const newTier: RewardTier = {
      minNFTs: lastTier ? lastTier.maxNFTs + 1 : 1,
      maxNFTs: lastTier ? lastTier.maxNFTs + 10 : 10,
      weeklyRate: 200,
    };
    setFormData({ ...formData, tiers: [...formData.tiers, newTier] });
  };

  const removeTier = (index: number) => {
    if (formData.tiers.length <= 1) {
      setError("At least one tier is required");
      return;
    }
    const newTiers = formData.tiers.filter((_, i) => i !== index);
    setFormData({ ...formData, tiers: newTiers });
  };

  const updateTier = (
    index: number,
    field: keyof RewardTier,
    value: number,
  ) => {
    const newTiers = [...formData.tiers];
    newTiers[index] = { ...newTiers[index], [field]: value };
    setFormData({ ...formData, tiers: newTiers });
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] border border-[#DA9C2F]/30 rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-b from-[#1a1a1a] to-[#1a1a1a]/95 backdrop-blur-sm border-b border-[#DA9C2F]/20 p-6 z-10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-[#DA9C2F]">
                Contract Reward Manager
              </h2>
              <p className="text-white/60 text-sm mt-1">
                Configure NFT collections and tier-based rewards
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white text-3xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">
              {error}
            </div>
          )}

          {!showAddForm && (
            <div className="mb-6">
              <button
                onClick={() => {
                  resetForm();
                  setEditingContract(null);
                  setShowAddForm(true);
                }}
                className="px-6 py-3 bg-[#DA9C2F] text-black font-semibold rounded-lg hover:bg-[#ffbf00] transition-colors"
              >
                + Add New Contract
              </button>
            </div>
          )}

          {showAddForm && (
            <form
              onSubmit={handleSubmit}
              className="mb-8 p-6 bg-[#0f0f0f]/50 rounded-lg border border-[#DA9C2F]/20"
            >
              <h3 className="text-xl font-bold text-[#DA9C2F] mb-4">
                {editingContract ? "Edit Contract" : "Add New Contract"}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-white/80 text-sm mb-2">
                    Contract Address *
                  </label>
                  <input
                    type="text"
                    value={formData.contractAddress}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contractAddress: e.target.value,
                      })
                    }
                    disabled={!!editingContract}
                    className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#DA9C2F]/30 rounded-lg text-white focus:outline-none focus:border-[#DA9C2F] disabled:opacity-50"
                    placeholder="e.g., 0x1234..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-white/80 text-sm mb-2">
                    Magic Eden Symbol
                  </label>
                  <input
                    type="text"
                    value={formData.magicEdenSymbol}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        magicEdenSymbol: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#DA9C2F]/30 rounded-lg text-white focus:outline-none focus:border-[#DA9C2F]"
                    placeholder="e.g., realmkin"
                  />
                </div>

                <div>
                  <label className="block text-white/80 text-sm mb-2">
                    Collection Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#DA9C2F]/30 rounded-lg text-white focus:outline-none focus:border-[#DA9C2F]"
                    placeholder="e.g., Realmkin NFT"
                    required
                  />
                </div>

                <div>
                  <label className="block text-white/80 text-sm mb-2">
                    Blockchain
                  </label>
                  <select
                    value={formData.blockchain}
                    onChange={(e) =>
                      setFormData({ ...formData, blockchain: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#DA9C2F]/30 rounded-lg text-white focus:outline-none focus:border-[#DA9C2F]"
                  >
                    <option value="solana">Solana</option>
                    <option value="ethereum">Ethereum</option>
                    <option value="polygon">Polygon</option>
                  </select>
                </div>

                <div>
                  <label className="block text-white/80 text-sm mb-2">
                    Welcome Bonus (MKIN)
                  </label>
                  <input
                    type="number"
                    value={formData.welcomeBonus}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        welcomeBonus: Number(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#DA9C2F]/30 rounded-lg text-white focus:outline-none focus:border-[#DA9C2F]"
                    min="0"
                  />
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-white/80 text-sm font-semibold">
                    Reward Tiers
                  </label>
                  <button
                    type="button"
                    onClick={addTier}
                    className="px-3 py-1 bg-[#DA9C2F]/20 text-[#DA9C2F] rounded text-sm hover:bg-[#DA9C2F]/30 transition-colors"
                  >
                    + Add Tier
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.tiers.map((tier, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end p-3 bg-[#1a1a1a]/50 rounded-lg border border-[#DA9C2F]/10"
                    >
                      <div>
                        <label className="block text-white/60 text-xs mb-1">
                          Min NFTs
                        </label>
                        <input
                          type="number"
                          value={tier.minNFTs}
                          onChange={(e) =>
                            updateTier(index, "minNFTs", Number(e.target.value))
                          }
                          className="w-full px-3 py-2 bg-[#0f0f0f] border border-[#DA9C2F]/30 rounded text-white text-sm focus:outline-none focus:border-[#DA9C2F]"
                          min="1"
                        />
                      </div>
                      <div>
                        <label className="block text-white/60 text-xs mb-1">
                          Max NFTs
                        </label>
                        <input
                          type="number"
                          value={tier.maxNFTs}
                          onChange={(e) =>
                            updateTier(index, "maxNFTs", Number(e.target.value))
                          }
                          className="w-full px-3 py-2 bg-[#0f0f0f] border border-[#DA9C2F]/30 rounded text-white text-sm focus:outline-none focus:border-[#DA9C2F]"
                          min={tier.minNFTs}
                        />
                      </div>
                      <div>
                        <label className="block text-white/60 text-xs mb-1">
                          Weekly MKIN
                        </label>
                        <input
                          type="number"
                          value={tier.weeklyRate}
                          onChange={(e) =>
                            updateTier(
                              index,
                              "weeklyRate",
                              Number(e.target.value),
                            )
                          }
                          className="w-full px-3 py-2 bg-[#0f0f0f] border border-[#DA9C2F]/30 rounded text-white text-sm focus:outline-none focus:border-[#DA9C2F]"
                          min="0"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeTier(index)}
                        className="px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                        disabled={formData.tiers.length <= 1}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-[#DA9C2F] text-black font-semibold rounded-lg hover:bg-[#ffbf00] transition-colors disabled:opacity-50"
                >
                  {loading
                    ? "Saving..."
                    : editingContract
                      ? "Update Contract"
                      : "Add Contract"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingContract(null);
                    resetForm();
                  }}
                  className="px-6 py-2 border border-[#DA9C2F]/30 text-[#DA9C2F] rounded-lg hover:bg-[#DA9C2F]/10 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white mb-4">
              Existing Contracts
            </h3>
            {loading && !showAddForm && (
              <div className="text-center py-8 text-white/60">
                Loading contracts...
              </div>
            )}

            {!loading && contracts.length === 0 && (
              <div className="text-center py-8 text-white/60">
                <p>No contracts configured yet.</p>
                <p className="text-sm mt-2">
                  Add your first contract to start earning rewards!
                </p>
              </div>
            )}

            {contracts.map((contract) => (
              <div
                key={contract.contract_address}
                className="p-5 bg-[#0f0f0f]/50 rounded-lg border border-[#DA9C2F]/20 hover:border-[#DA9C2F]/40 transition-colors"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-lg font-semibold text-white">
                        {contract.name}
                      </h4>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          contract.is_active
                            ? "bg-green-500/20 text-green-300"
                            : "bg-red-500/20 text-red-300"
                        }`}
                      >
                        {contract.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="text-white/60 text-sm font-mono mb-1">
                      {contract.contract_address}
                    </p>
                    {contract.magic_eden_symbol && (
                      <p className="text-white/40 text-xs">
                        Magic Eden: {contract.magic_eden_symbol}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(contract)}
                      className="px-3 py-1 text-[#DA9C2F] hover:bg-[#DA9C2F]/10 rounded transition-colors text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() =>
                        handleDeactivate(contract.contract_address)
                      }
                      className="px-3 py-1 text-white/60 hover:bg-white/10 rounded transition-colors text-sm"
                    >
                      {contract.is_active ? "Disable" : "Enable"}
                    </button>
                    <button
                      onClick={() => handleDelete(contract.contract_address)}
                      className="px-3 py-1 text-red-400 hover:bg-red-500/10 rounded transition-colors text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-white/60 text-xs mb-2">Welcome Bonus</p>
                    <p className="text-[#DA9C2F] font-semibold">
                      {contract.welcome_bonus} MKIN
                    </p>
                  </div>
                  <div>
                    <p className="text-white/60 text-xs mb-2">Blockchain</p>
                    <p className="text-white capitalize">
                      {contract.blockchain}
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-white/60 text-xs mb-2">Reward Tiers</p>
                  <div className="space-y-2">
                    {contract.tiers && contract.tiers.length > 0 ? (
                      contract.tiers.map((tier, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center p-2 bg-[#1a1a1a]/50 rounded border border-[#DA9C2F]/10"
                        >
                          <span className="text-white/80 text-sm">
                            {tier.minNFTs === tier.maxNFTs
                              ? `${tier.minNFTs} NFT${tier.minNFTs > 1 ? "s" : ""}`
                              : `${tier.minNFTs}-${tier.maxNFTs} NFTs`}
                          </span>
                          <span className="text-[#DA9C2F] font-semibold text-sm">
                            {tier.weeklyRate} MKIN/week
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-white/60 text-sm">
                        No tiers configured
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
