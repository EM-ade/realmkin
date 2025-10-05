import Link from "next/link";

interface QuickAccessCardProps {
  icon: string;
  label: string;
  stat: string;
  href: string;
  disabled?: boolean;
}

export default function QuickAccessCard({
  icon,
  label,
  stat,
  href,
  disabled = false,
}: QuickAccessCardProps) {
  const CardContent = (
    <div
      className={`
        relative h-full rounded-xl border border-[#DA9C2F]/30 
        bg-[#1b1205]/95 backdrop-blur-sm p-3 
        flex flex-col items-center justify-center gap-2
        transition-all duration-300
        ${
          disabled
            ? "opacity-50 cursor-not-allowed"
            : "hover:border-[#DA9C2F]/60 hover:bg-[#1b1205] hover:scale-105 cursor-pointer"
        }
      `}
    >
      {/* Icon */}
      <div className="text-3xl">{icon}</div>

      {/* Label */}
      <div className="text-[#DA9C2F] text-xs font-bold uppercase tracking-wider text-center">
        {label}
      </div>

      {/* Stat */}
      <div className="text-white/70 text-xs font-medium">
        {stat}
      </div>

      {/* Coming Soon Badge */}
      {disabled && (
        <div className="absolute top-1 right-1 bg-[#DA9C2F]/20 text-[#DA9C2F] text-[10px] px-2 py-0.5 rounded-full font-bold">
          SOON
        </div>
      )}
    </div>
  );

  if (disabled) {
    return <div className="h-[100px]">{CardContent}</div>;
  }

  return (
    <Link href={href} className="h-[100px] block">
      {CardContent}
    </Link>
  );
}
