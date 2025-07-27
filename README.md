# Realmkin Web3 NFT Platform

A Next.js-based Web3 NFT platform with Firebase authentication for holders.

## Features

- **Holders Login**: Secure authentication system using Firebase
- **Protected Routes**: Main dashboard accessible only to authenticated users
- **NFT Display**: View and manage Warden Kins NFT collection
- **Token Rewards**: Display $MKIN token earnings
- **Responsive Design**: Mobile-friendly interface

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Firebase project (see FIREBASE_SETUP.md)

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Set up Firebase (see FIREBASE_SETUP.md for detailed instructions)

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) with your browser

## Project Structure

- `/src/app/login` - Login page for holders
- `/src/app/page.tsx` - Main dashboard (protected)
- `/src/components/ProtectedRoute.tsx` - Route protection component
- `/src/contexts/AuthContext.tsx` - Authentication context
- `/src/lib/firebase.ts` - Firebase configuration

## Authentication Flow

1. Users visit the login page at `/login`
2. Enter email and password credentials
3. Firebase authenticates the user
4. Upon success, redirect to main dashboard
5. Protected routes check authentication status
6. Logout functionality available on main page

## Technologies Used

- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Firebase Auth** - Authentication
- **React Context** - State management

## Setup Firebase

See `FIREBASE_SETUP.md` for complete Firebase configuration instructions.
