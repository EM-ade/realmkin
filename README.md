# 🎮 Realmkin - Web3 Gaming & NFT Platform

A comprehensive Web3 gaming ecosystem featuring NFT integration, play-to-earn arcade games, staking system, and token rewards built on Solana blockchain.

## 🌟 Overview

Realmkin is a full-stack Web3 platform that combines:
- **NFT Collection**: Warden Kins NFT collection with holder benefits and 3D viewer
- **Play-to-Earn Arcade**: Multiple games with $MKIN rewards and leaderboards
- **Staking System**: Flexible and locked staking with up to 100% APY
- **Rewards System**: Automated weekly $MKIN distribution for NFT holders
- **Wallet Integration**: Solana wallet support (Phantom, Solflare, etc.)
- **Discord Integration**: Link Discord for community access and benefits

## ✨ Key Features

### 🎨 NFT Dashboard
- **3D NFT Viewer**: View your Warden Kins in stunning 3D with interactive controls
- **Multi-Contract Support**: Standard and premium NFT contracts
- **Real-time Metadata**: Fast NFT data via Helius API
- **Rarity Display**: Visual rarity indicators (Legendary, Epic, Rare, Common)
- **Gallery View**: Grid layout with thumbnail previews
- **Test Mode**: Preview sample NFTs for development

### 💰 Rewards & Wallet System
- **Automated Weekly Rewards**: $MKIN distribution based on NFT holdings (200 $MKIN per NFT/week)
- **Real-time Balance**: Live wallet balance tracking
- **Claim System**: One-click reward claiming with transaction history
- **Transfer System**: Send $MKIN to other wallet addresses
- **Withdrawal**: Convert in-game $MKIN to on-chain tokens
- **Transaction History**: Complete audit trail of all transactions
- **Auto-Claim**: Background claiming for eligible rewards

### 🎯 Arcade Games
- **Trait Crush**: Match-3 puzzle game with trait combinations (LIVE)
- **2048**: Classic tile merging game with Realmkin theme (LIVE)
- **Wordle**: Daily word puzzle (Temporarily Offline)
- **Word Blast**: Fast-paced letter game (Phase III)
- **Checkers**: Strategy board game (Phase IV)
- **Poker**: Multiplayer card game (Phase IV)

### 📊 Leaderboard System
- **Monthly Competition**: Resets every month for fair competition
- **Multiple Categories**: Total Score, Streak, and game-specific rankings
- **Real-time Updates**: Live leaderboard via Firebase subscriptions
- **User Highlighting**: See your rank and progress
- **Breakdown Stats**: Detailed score breakdown by game
- **Top 100 Display**: View the best players across all games

### 💎 Staking System
- **Flexible Staking**: 20% APY, no lock period
- **30-Day Lock**: 48% APY with 10% early unstake penalty
- **60-Day Lock**: 64% APY with 15% early unstake penalty
- **90-Day Lock**: 100% APY with 20% early unstake penalty
- **Real-time Rewards**: Live reward calculations
- **Multiple Stakes**: Manage multiple stake positions
- **Instant Unstaking**: Withdraw after lock period expires
- **Transaction Verification**: On-chain verification of deposits

### 🔐 Authentication & Security
- **Wallet-Based Auth**: Simplified login with Solana wallet
- **Firebase Authentication**: Secure user management
- **Protected Routes**: Role-based access control
- **Discord Linking**: Connect Discord for community features
- **Username System**: Unique usernames for all players
- **Admin Dashboard**: Manage users, rewards, and platform settings

## 🛠️ Technology Stack

### Frontend
- **Next.js 15**: React framework with App Router and Server Components
- **TypeScript**: Type-safe development
- **Tailwind CSS 4**: Modern utility-first styling
- **Framer Motion**: Smooth animations and transitions
- **React Three Fiber**: 3D graphics for NFT viewer
- **React Context API**: Global state management

### Blockchain & Web3
- **Solana Web3.js**: Blockchain interactions
- **Solana Wallet Adapter**: Multi-wallet support (Phantom, Solflare, Glow, Backpack)
- **SPL Token**: Token operations and transfers
- **Helius API**: Fast Solana NFT and transaction data

### Backend & Database
- **Firebase Firestore**: Real-time NoSQL database
- **Firebase Authentication**: User authentication
- **Firebase Cloud Functions**: Serverless backend logic
- **Firebase Admin SDK**: Server-side operations

### APIs & Services
- **Helius API**: Solana NFT metadata and ownership
- **Gatekeeper API**: Unified ledger and Discord integration
- **Magic Eden API**: NFT marketplace data

## 📁 Project Structure

```
my-realmkin-app/
├── src/
│   ├── app/                          # Next.js App Router pages
│   │   ├── page.tsx                  # Home/Dashboard
│   │   ├── login/                    # Authentication page
│   │   ├── wallet/                   # Wallet & rewards page
│   │   ├── my-nft/                   # NFT collection viewer
│   │   ├── staking/                  # Staking interface
│   │   ├── game/                     # Game hub & individual games
│   │   │   ├── page.tsx              # Game selection hub
│   │   │   ├── trait-crush/          # Match-3 game
│   │   │   └── 2048/                 # 2048 game
│   │   ├── admin/                    # Admin dashboard
│   │   └── api/                      # API routes
│   │       ├── stake/                # Staking endpoints
│   │       ├── unstake/              # Unstaking endpoints
│   │       ├── claim-rewards/        # Reward claiming
│   │       ├── auto-claim/           # Auto-claim endpoint
│   │       └── discord/              # Discord integration
│   ├── components/                   # React components
│   │   ├── NFTViewer3D.tsx           # 3D NFT display
│   │   ├── NFTCard.tsx               # NFT card component
│   │   ├── GameCard.tsx              # Game selection card
│   │   ├── Leaderboard/              # Leaderboard components
│   │   ├── RewardsDashboard.tsx      # Rewards display
│   │   ├── DesktopNavigation.tsx     # Desktop nav
│   │   ├── MobileMenuOverlay.tsx     # Mobile menu
│   │   └── MagicalAnimations.tsx     # Background effects
│   ├── contexts/                     # React Context providers
│   │   ├── AuthContext.tsx           # Authentication state
│   │   ├── Web3Context.tsx           # Web3 connection
│   │   ├── NFTContext.tsx            # NFT data management
│   │   ├── StakingContext.tsx        # Staking state
│   │   └── SolanaWalletProvider.tsx  # Wallet adapter
│   ├── hooks/                        # Custom React hooks
│   │   ├── useAutoClaim.ts           # Auto-claim logic
│   │   ├── useIsMobile.ts            # Responsive detection
│   │   └── useKingdom.ts             # Kingdom state (future)
│   ├── services/                     # Business logic services
│   │   ├── nftService.ts             # NFT fetching & caching
│   │   ├── rewardsService.ts         # Rewards calculations
│   │   ├── stakingService.ts         # Staking operations
│   │   ├── leaderboardService.ts     # Leaderboard management
│   │   └── transactionVerification.ts # On-chain verification
│   ├── types/                        # TypeScript definitions
│   │   ├── leaderboard.ts            # Leaderboard types
│   │   └── kingdom.ts                # Game types
│   ├── utils/                        # Utility functions
│   │   └── formatAddress.ts          # Address formatting
│   └── lib/
│       └── firebase.ts               # Firebase initialization
├── functions/                        # Firebase Cloud Functions
│   └── src/
│       └── dailyRewardCalculation.js # Scheduled reward distribution
├── public/                           # Static assets
│   ├── fonts/                        # Custom fonts
│   ├── models/                       # 3D models for NFTs
│   └── images/                       # Game assets
└── firestore.rules                   # Database security rules
```

## 🚀 Getting Started

### Prerequisites

- **Node.js 18+** and npm/yarn
- **Firebase Project** with Firestore and Cloud Functions enabled
- **Solana Wallet** (Phantom recommended)
- **Helius API Key** for NFT operations

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd my-realmkin-app
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**

Create a `.env.local` file:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Solana Configuration
NEXT_PUBLIC_REALMKIN_SOLANA_CONTRACT_ADDRESS=your_nft_contract
NEXT_PUBLIC_MKIN_TOKEN_MINT=your_token_mint
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com

# Helius API
NEXT_PUBLIC_HELIUS_API_KEY=your_helius_key

# Staking Configuration
NEXT_PUBLIC_STREAMFLOW_CLUSTER=devnet
NEXT_PUBLIC_STAKING_POOL_ADDRESS=your_pool_address

# Gatekeeper API (Discord & Ledger)
NEXT_PUBLIC_GATEKEEPER_BASE=https://gatekeeper-bot.fly.dev

# Rewards Configuration
NEXT_PUBLIC_WEEKLY_RATE_PER_NFT=200
NEXT_PUBLIC_MIN_CLAIM_AMOUNT=1
NEXT_PUBLIC_NEW_NFT_BONUS=200

# Firebase Admin (for Cloud Functions)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PRIVATE_KEY="your_private_key"

# Security
REALMKIN_BOT_KEY=your_secret_key
CRON_SECRET_TOKEN=your_cron_secret
```

4. **Initialize Firebase**
```bash
firebase init
```

Select:
- Firestore
- Functions
- Hosting (optional)

5. **Deploy Firestore rules and indexes**
```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

6. **Deploy Cloud Functions**
```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

7. **Run the development server**
```bash
npm run dev
```

8. **Open the application**
Navigate to [http://localhost:3000](http://localhost:3000)

## 🎮 Platform Features

### Home Dashboard
- Quick access cards for all platform features
- NFT count and wallet balance display
- Featured NFT carousel
- Social links and community access
- Wallet connection status

### Wallet Page
- Real-time $MKIN balance
- NFT collection display with cards
- Claim rewards button with pending amount
- Transfer $MKIN to other wallets
- Withdraw to on-chain wallet
- Transaction history (last 10 transactions)
- Auto-claim status indicator

### My NFT Page
- 3D NFT viewer with interactive controls
- NFT gallery with thumbnail grid
- Rarity badges and power stats
- Auto-rotate toggle
- Drag to rotate, scroll to zoom
- Test mode for development
- Refresh NFTs button

### Staking Page
- Four staking tiers with different APYs
- Wallet balance and staked amount display
- Quick stake presets (25%, 50%, 100%)
- Active stakes list with unlock status
- Unstake with penalty warnings
- Real-time reward calculations
- Global TVL and staker count

### Game Hub
- 6 game cards with status indicators
- Monthly leaderboard with categories
- Real-time rank updates
- User highlighting
- Score breakdown by game
- Monthly reset countdown

### Admin Dashboard
- User management
- Reward adjustments
- Manual bonus distribution
- Transaction monitoring
- Platform statistics

## 📊 Database Schema

### Collections

**users**
```typescript
{
  uid: string;              // Firebase Auth UID
  email: string;            // User email
  username: string;         // Unique username
  walletAddress: string;    // Solana wallet
  admin: boolean;           // Admin flag
  createdAt: Timestamp;
  lastLogin: Timestamp;
}
```

**rewards**
```typescript
{
  userId: string;           // Firebase Auth UID
  walletAddress: string;    // Solana wallet
  totalNFTs: number;        // Current NFT count
  weeklyRate: number;       // $MKIN per week
  bonusWeeklyRate: number;  // Admin bonus
  totalEarned: number;      // Lifetime earnings
  totalClaimed: number;     // Total claimed
  totalRealmkin: number;    // Current balance
  pendingRewards: number;   // Claimable amount
  lastCalculated: Timestamp;
  lastClaimed: Timestamp;
}
```

**stakes**
```typescript
{
  id: string;               // Stake ID
  wallet: string;           // User wallet
  amount: number;           // Staked amount
  lockPeriod: string;       // "flexible" | "30" | "60" | "90"
  apy: number;              // APY percentage
  rewards: number;          // Accumulated rewards
  stakedAt: Timestamp;
  unlocksAt: Timestamp;
  isUnlocked: boolean;
  stakeEntry: string;       // Unique identifier
}
```

**leaderboard**
```typescript
{
  userId: string;           // Firebase Auth UID
  username: string;         // Display name
  totalScore: number;       // Combined score
  streak: number;           // Days played
  gamesPlayed: number;      // Total games
  breakdown: {              // Per-game scores
    wordle: number;
    "2048": number;
    traitCrush: number;
  };
  lastPlayed: Timestamp;
  monthYear: string;        // "2025-01" for monthly reset
}
```

**transactions**
```typescript
{
  id: string;               // Transaction ID
  userId: string;           // User ID
  walletAddress: string;    // User wallet
  type: string;             // "claim" | "withdraw" | "transfer"
  amount: number;           // Amount in $MKIN
  description: string;      // Human-readable description
  recipientAddress?: string; // For transfers
  createdAt: Timestamp;
}
```

## 🔐 Security Features

### Firestore Security Rules
- User-specific data isolation
- Read/write permissions based on authentication
- Admin-only write access for critical data
- Rate limiting on sensitive operations

### Transaction Verification
- On-chain verification of Solana transactions
- Signature validation before crediting stakes
- Amount verification against claimed deposits
- Timestamp checks for transaction freshness

### API Protection
- Secret key authentication for cron jobs
- Firebase Auth token validation
- Rate limiting on claim endpoints
- Input validation and sanitization

## 🎨 UI/UX Features

### Responsive Design
- Mobile-first approach
- Adaptive layouts for all screen sizes
- Touch-optimized controls
- Mobile menu overlay

### Animations & Effects
- Ethereal particle effects (desktop only)
- Constellation background
- Smooth page transitions
- Loading states with custom spinners
- Hover effects and micro-interactions

### Theme & Styling
- Dark theme with golden accents (#DA9C2F, #F4C752)
- Custom fonts (Amnestia, Gothic CG, Hertical Sans)
- Glassmorphism effects
- Gradient overlays
- Shadow and glow effects

## 🔧 Development

### Running Tests
```bash
npm test
```

### Building for Production
```bash
npm run build
npm start
```

### Deploying to Firebase Hosting
```bash
npm run build
firebase deploy
```

### Linting
```bash
npm run lint
```

## 📝 API Endpoints

### Staking API

**POST /api/stake**
- Create new stake
- Requires: `walletAddress`, `amount`, `transactionSignature`, `lockPeriod`
- Returns: Stake confirmation with ID

**GET /api/user-stakes?wallet={address}**
- Fetch user stakes
- Returns: Array of stake records

**POST /api/unstake**
- Initiate unstaking
- Requires: `wallet`, `stakeId`, `action`
- Returns: Unstake confirmation with transaction

### Rewards API

**POST /api/claim-rewards**
- Claim accumulated rewards
- Requires: `userId`, `walletAddress`
- Returns: Claim amount and transaction details

**POST /api/auto-claim**
- Background auto-claim for eligible users
- Requires: `CRON_SECRET_TOKEN` header
- Returns: Number of users processed

### Discord API

**GET /api/discord/login**
- Initiate Discord OAuth flow
- Redirects to Discord authorization

**GET /api/link/status**
- Check Discord link status
- Requires: Firebase Auth token
- Returns: `{ linked: boolean }`

**DELETE /api/link/discord**
- Unlink Discord account
- Requires: Firebase Auth token
- Returns: Success confirmation

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software. All rights reserved.

## 🙏 Acknowledgments

- **Solana Foundation**: Blockchain infrastructure
- **Firebase**: Backend services
- **Helius**: Solana API services
- **React Three Fiber**: 3D graphics library
- **Tailwind CSS**: Styling framework

## 📞 Support

For support and questions:
- Discord: [Join our community]
- Twitter: [@Realmkin]
- Email: support@realmkin.com

## 🗺️ Roadmap

### Phase 1 (Completed) ✅
- NFT integration with 3D viewer
- Rewards system with auto-claim
- Staking with multiple lock periods
- Two arcade games (Trait Crush, 2048)
- Leaderboard system
- Discord integration
- Wallet management

### Phase 2 (In Progress) 🚧
- Additional arcade games (Word Blast, Checkers, Poker)
- Tournament mode
- Guild/Alliance system
- Enhanced leaderboard categories
- Mobile app (React Native)

### Phase 3 (Planned) 📋
- NFT marketplace
- Breeding/fusion system
- Quest system
- Achievement badges
- Cross-chain integration
- DAO governance

---

**Built with ❤️ by the Realmkin Team**
