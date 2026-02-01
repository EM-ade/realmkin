"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useWeb3 } from "@/contexts/Web3Context";
import { useWallet } from "@solana/wallet-adapter-react";
import type { Transaction } from "@solana/web3.js";
import { formatAddress } from "@/utils/formatAddress";
import NFTCard from "@/components/NFTCard";
import MobileMenuOverlay from "@/components/MobileMenuOverlay";
import { useNFT } from "@/contexts/NFTContext";
import { NFTMetadata, nftService } from "@/services/nftService";
import { getAuth } from "firebase/auth";
import {
  rewardsService,
  UserRewards,
  RewardsCalculation,
} from "@/services/rewardsService";
import { useAutoClaim } from "@/hooks/useAutoClaim";
import { useIsMobile } from "@/hooks/useIsMobile";
import SocialLinks from "@/components/SocialLinks";
import RewardsDashboard from "@/components/RewardsDashboard";
import WithdrawalConfirmationModal from "@/components/WithdrawalConfirmationModal";
import TransferConfirmationModal from "@/components/TransferConfirmationModal";
import QuickStartGuide from "@/components/QuickStartGuide";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { claimTokens, ClaimResponse } from "@/services/backendClaimService";
import { NAV_ITEMS } from "@/config/navigation";

// Lazy load background effects for better performance
const EtherealParticles = dynamic(
  () =>
    import("@/components/MagicalAnimations").then(
      (mod) => mod.EtherealParticles
    ),
  { ssr: false }
);
const ConstellationBackground = dynamic(
  () =>
    import("@/components/MagicalAnimations").then(
      (mod) => mod.ConstellationBackground
    ),
  { ssr: false }
);

export default function WalletPage() {
  const { useRouter } = require("next/navigation");
  const router = useRouter();
  
  // Redirect to account page
  useEffect(() => {
    router.replace("/account");
  }, [router]);

  // Return null during redirect
  return null;
}

// OLD WALLET PAGE CODE REMOVED - Page now redirects to /account
