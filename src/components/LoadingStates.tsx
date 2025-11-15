"use client";

export function WalletConnectingSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-12 bg-[#DA9C2F]/10 rounded-lg" />
      <div className="h-4 bg-[#DA9C2F]/10 rounded w-3/4" />
      <div className="h-4 bg-[#DA9C2F]/10 rounded w-1/2" />
    </div>
  );
}

export function DiscordLinkingSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      <div className="h-10 bg-[#DA9C2F]/10 rounded-lg" />
      <div className="h-3 bg-[#DA9C2F]/10 rounded w-2/3" />
    </div>
  );
}

export function NFTCardSkeleton() {
  return (
    <div className="rounded-lg border border-[#DA9C2F]/20 p-4 animate-pulse">
      <div className="aspect-square bg-[#DA9C2F]/10 rounded-lg mb-3" />
      <div className="h-4 bg-[#DA9C2F]/10 rounded mb-2" />
      <div className="h-3 bg-[#DA9C2F]/10 rounded w-2/3" />
    </div>
  );
}

export function BalanceSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-[#DA9C2F]/10 rounded w-32" />
    </div>
  );
}

export function TransactionSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-[#DA9C2F]/5">
          <div className="flex-1">
            <div className="h-4 bg-[#DA9C2F]/10 rounded mb-2 w-1/3" />
            <div className="h-3 bg-[#DA9C2F]/10 rounded w-1/4" />
          </div>
          <div className="h-4 bg-[#DA9C2F]/10 rounded w-1/4" />
        </div>
      ))}
    </div>
  );
}

export function PageLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-12 bg-[#DA9C2F]/10 rounded-lg w-1/3" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-[#DA9C2F]/10 rounded-lg" />
        ))}
      </div>
      <div className="h-64 bg-[#DA9C2F]/10 rounded-lg" />
    </div>
  );
}
