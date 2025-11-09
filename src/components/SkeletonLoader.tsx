/**
 * Skeleton Loader Component
 * Lightweight alternative to spinners for better perceived performance
 * Uses CSS animations instead of JavaScript
 */

export function SkeletonLoader() {
  return (
    <div className="space-y-3">
      <div className="h-4 bg-gradient-to-r from-[#DA9C2F]/20 to-[#DA9C2F]/10 rounded animate-pulse"></div>
      <div className="h-4 bg-gradient-to-r from-[#DA9C2F]/20 to-[#DA9C2F]/10 rounded animate-pulse w-5/6"></div>
    </div>
  );
}

export function SkeletonButton() {
  return (
    <div className="h-12 bg-gradient-to-r from-[#DA9C2F]/20 to-[#DA9C2F]/10 rounded-lg animate-pulse"></div>
  );
}

export function SkeletonCard() {
  return (
    <div className="space-y-4 p-6 bg-[#1b1205]/50 rounded-2xl border border-[#DA9C2F]/20">
      <div className="h-6 bg-gradient-to-r from-[#DA9C2F]/20 to-[#DA9C2F]/10 rounded w-2/3 animate-pulse"></div>
      <div className="space-y-2">
        <div className="h-4 bg-gradient-to-r from-[#DA9C2F]/20 to-[#DA9C2F]/10 rounded animate-pulse"></div>
        <div className="h-4 bg-gradient-to-r from-[#DA9C2F]/20 to-[#DA9C2F]/10 rounded w-5/6 animate-pulse"></div>
      </div>
    </div>
  );
}
