"use client";

interface StatsCardProps {
  label: string;
  value: string | number;
  unit?: string;
  subtext?: string;
  variant: "orange" | "green" | "yellow";
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
    loading?: boolean;
  };
}

export default function StatsCard({
  label,
  value,
  unit,
  subtext,
  variant,
  icon,
  action,
}: StatsCardProps) {
  const variantStyles = {
    orange: {
      border: "border-orange-500/20",
      shadow: "shadow-orange-900/5",
      textColor: "text-white",
      buttonGradient: "bg-gradient-to-r from-orange-500 to-yellow-500",
    },
    green: {
      border: "border-green-500/20",
      shadow: "shadow-green-900/5",
      textColor: "text-[#22c55e]",
      iconBg: "bg-green-900/20",
      iconBorder: "border-green-500/20",
    },
    yellow: {
      border: "border-yellow-500/20",
      shadow: "shadow-yellow-900/5",
      textColor: "text-[#eab308]",
      iconBg: "bg-yellow-900/20",
      iconBorder: "border-yellow-500/20",
    },
  };

  const styles = variantStyles[variant];

  return (
    <div
      className={`bg-[#111111] rounded-2xl p-5 border ${styles.border} flex justify-between items-center shadow-lg ${styles.shadow}`}
    >
      <div>
        <p className="text-sm text-gray-400 font-medium mb-1">{label}</p>
        <p className={`text-3xl font-bold ${styles.textColor} tracking-tight flex items-baseline gap-1`}>
          {value}
          {unit && <span className="text-base font-medium text-gray-500">{unit}</span>}
        </p>
        {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
      </div>

      {action && (
        <button
          onClick={action.onClick}
          disabled={action.loading}
          className={`${styles.buttonGradient} text-black text-sm font-bold px-6 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {action.loading ? "..." : action.label}
        </button>
      )}

      {icon && !action && (
        <div
          className={`w-12 h-12 rounded-full ${styles.iconBg} flex items-center justify-center border ${styles.iconBorder}`}
        >
          {icon}
        </div>
      )}
    </div>
  );
}
