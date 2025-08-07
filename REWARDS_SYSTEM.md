# Realmkin Rewards System

## Overview

The Realmkin rewards system allows users to earn $0.37 USD per NFT per week. Users can claim their accumulated rewards through the app interface.

## ✅ Implementation Features

### **💰 Reward Calculation**
- **Rate**: $0.37 per NFT per week
- **Automatic calculation** based on user's NFT count
- **Time-based accumulation** from last claim or account creation
- **Minimum claim amount**: $0.01

### **🏦 Database Structure**

#### **User Rewards Collection** (`userRewards`)
```typescript
interface UserRewards {
  userId: string;           // Firebase Auth UID
  walletAddress: string;    // Solana wallet address
  totalNFTs: number;        // Current NFT count
  weeklyRate: number;       // $0.37 * NFT count
  totalEarned: number;      // Lifetime earnings
  totalClaimed: number;     // Total claimed amount
  pendingRewards: number;   // Available to claim
  lastCalculated: Date;     // Last calculation time
  lastClaimed: Date | null; // Last claim time
  createdAt: Date;          // Account creation
  updatedAt: Date;          // Last update
}
```

#### **Claim Records Collection** (`claimRecords`)
```typescript
interface ClaimRecord {
  id: string;               // Unique claim ID
  userId: string;           // Firebase Auth UID
  walletAddress: string;    // Wallet at time of claim
  amount: number;           // Claimed amount
  nftCount: number;         // NFT count at claim time
  claimedAt: Date;          // Claim timestamp
  weeksClaimed: number;     // Weeks worth of rewards
  transactionHash?: string; // Future blockchain integration
}
```

### **🎯 Core Functionality**

#### **Automatic Initialization**
- Creates user rewards record when NFTs are first detected
- Updates NFT count and recalculates rewards on wallet connection
- Handles wallet address changes

#### **Real-time Calculation**
- Calculates pending rewards based on time elapsed
- Accounts for changing NFT counts over time
- Validates claim eligibility (minimum amount, time restrictions)

#### **Claim Processing**
- Validates user eligibility and pending amount
- Creates permanent claim record
- Updates user rewards data
- Resets pending rewards counter

### **🖥️ User Interface**

#### **Mining/Claim Section**
- **Real-time balance display** in USD format
- **Weekly rate calculation** showing "X NFTs × $0.37/week"
- **Next claim countdown** when not ready
- **Claim button** with loading states and validation
- **Error handling** with user-friendly messages

#### **Rewards Dashboard**
- **Claim history** with dates and amounts
- **NFT count tracking** for each claim
- **Wallet address** for transparency
- **Statistics** and earning summaries

### **🔒 Security Features**

#### **Validation**
- User must be authenticated (Firebase Auth)
- Wallet must be connected and verified
- NFT count verified through blockchain
- Minimum claim amounts enforced

#### **Data Integrity**
- Immutable claim records
- Timestamp-based calculations
- Prevents double-claiming
- Audit trail for all transactions

### **⚙️ Configuration**

#### **Environment Variables**
```bash
# Rewards System Configuration
NEXT_PUBLIC_WEEKLY_RATE_PER_NFT=0.37
NEXT_PUBLIC_MIN_CLAIM_AMOUNT=0.01
```

#### **Customizable Parameters**
- Weekly rate per NFT
- Minimum claim amount
- Claim frequency restrictions
- Currency formatting

## 🚀 Usage Examples

### **For Users**
1. **Connect wallet** with Realmkin NFTs
2. **View pending rewards** in the mining section
3. **Wait for minimum claim amount** ($0.01)
4. **Click CLAIM** when button is enabled
5. **View claim history** via HISTORY button

### **Reward Calculation Example**
```
User has 3 NFTs:
- Weekly rate: 3 × $0.37 = $1.11/week
- After 2 weeks: $2.22 pending
- After 1 month: $4.44 pending
```

### **For Developers**

#### **Initialize Rewards**
```typescript
const rewards = await rewardsService.initializeUserRewards(
  userId,
  walletAddress,
  nftCount
);
```

#### **Calculate Pending**
```typescript
const calculation = rewardsService.calculatePendingRewards(
  userRewards,
  currentNFTCount
);
```

#### **Process Claim**
```typescript
const claimRecord = await rewardsService.claimRewards(
  userId,
  walletAddress
);
```

## 📊 Analytics & Monitoring

### **Key Metrics**
- Total rewards distributed
- Average claim frequency
- User engagement rates
- NFT holder retention

### **Admin Queries**
```typescript
// Get top earners
// Get claim frequency statistics
// Monitor system health
// Track reward distribution
```

## 🔮 Future Enhancements

### **Planned Features**
- **Blockchain integration** for on-chain reward distribution
- **Bonus multipliers** for long-term holders
- **Referral rewards** system
- **Staking mechanisms** for additional rewards
- **Token conversion** to $MKIN cryptocurrency

### **Scalability**
- **Batch processing** for large user bases
- **Caching strategies** for performance
- **Rate limiting** for API protection
- **Background jobs** for reward calculations

---

## 🎉 Benefits

### **For Users**
- **Passive income** from NFT ownership
- **Regular rewards** every week
- **Transparent tracking** of earnings
- **Easy claiming** process

### **For Project**
- **Increased NFT utility** and value
- **User retention** and engagement
- **Community building** through rewards
- **Data insights** on user behavior

The rewards system creates a sustainable economy around Realmkin NFTs, providing real value to holders while encouraging long-term engagement with the platform! 💎
