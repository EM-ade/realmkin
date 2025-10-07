import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";

type StatusVariant = "coming-soon" | "new" | "available";

export type GameCardProps = {
  title: string;
  description: string;
  imageSrc?: string | null;
  eta?: string;
  href?: string;
  status?: StatusVariant;
};

function resolveStatus(status: StatusVariant | undefined, href?: string): StatusVariant {
  if (status) return status;
  if (href) return "available";
  return "coming-soon";
}

const STATUS_RIBBON: Record<StatusVariant, { label: string; className: string; style?: string }> = {
  "coming-soon": {
    label: "Coming Soon",
    className: "bg-[#DA9C2F] text-[#050302]",
    style: "-right-12 top-6 px-10 py-1 text-[10px] tracking-[0.4em] shadow-[0_8px_20px_rgba(218,156,47,0.35)]",
  },
  new: {
    label: "New",
    className: "bg-[#46c68e] text-white",
    style: "-right-[18px] top-6 px-10 py-1.5 text-[11px] tracking-[0.22em] shadow-[0_8px_20px_rgba(70,198,142,0.35)]",
  },
  available: {
    label: "Featured",
    className: "bg-[#F4C752] text-[#050302]",
    style: "-right-12 top-6 px-10 py-1 text-[10px] tracking-[0.4em] shadow-[0_8px_20px_rgba(218,156,47,0.35)]",
  },
};

const STATUS_BADGE: Record<StatusVariant, { label: string; className: string }> = {
  "coming-soon": {
    label: "Coming Soon",
    className: "bg-[#DA9C2F] text-[#050302]",
  },
  new: {
    label: "Play Now",
    className: "bg-[#46c68e] text-white",
  },
  available: {
    label: "Play Now",
    className: "bg-[#F4C752] text-[#050302]",
  },
};

export default function GameCard({ title, description, imageSrc, eta, href, status }: GameCardProps) {
  const variant = resolveStatus(status, href);
  const ribbon = STATUS_RIBBON[variant];
  const badge = STATUS_BADGE[variant];
  const isInteractive = Boolean(href);

  const card = (
    <article
      className={clsx(
        "relative flex h-full flex-col overflow-hidden rounded-3xl border border-[#DA9C2F]/25 bg-[#0B0B09]/90 shadow-[0_18px_38px_rgba(0,0,0,0.45)] transition duration-300 ease-out",
        isInteractive
          ? "cursor-pointer hover:-translate-y-[3px] hover:border-[#DA9C2F]/60 hover:shadow-[0_25px_60px_rgba(218,156,47,0.25)]"
          : "cursor-not-allowed"
      )}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-[26px] border border-[#DA9C2F]/20 bg-[radial-gradient(circle_at_top,_rgba(218,156,47,0.2),rgba(5,3,2,0.9))] md:aspect-[4/3]">
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={`${title} artwork`}
            fill
            sizes="(min-width: 1024px) 320px, (min-width: 768px) 280px, 40vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-[#DA9C2F]/40 bg-[#050302]/70 md:h-28 md:w-28">
              <Image
                src="/realmkin.png"
                alt="Realmkin crest placeholder"
                width={112}
                height={112}
                className="opacity-30 drop-shadow-[0_0_18px_rgba(218,156,47,0.5)]"
                priority
              />
            </div>
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#050302]/80 via-transparent to-transparent" />
        <span
          className={clsx(
            "pointer-events-none absolute rotate-45 font-semibold uppercase",
            ribbon.style,
            ribbon.className
          )}
        >
          {ribbon.label}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 px-5 pb-5 pt-4 md:px-6 md:pb-6 md:pt-5">
        <div>
          <h3 className="text-base font-semibold uppercase tracking-wider text-[#F4C752] md:text-lg">
            {title}
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-white/70 md:text-sm">
            {description}
          </p>
        </div>

        <div className="mt-auto flex items-center justify-between pt-2">
          <span
            className={clsx(
              "rounded-full px-4 py-1 text-[10px] font-semibold uppercase tracking-[0.38em]",
              badge.className
            )}
          >
            {badge.label}
          </span>
          {variant === "coming-soon" && eta ? (
            <span className="text-[10px] uppercase tracking-[0.38em] text-white/45">{eta}</span>
          ) : null}
        </div>
      </div>
    </article>
  );

  if (!isInteractive || !href) {
    return card;
  }

  return (
    <Link
      href={href}
      className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DA9C2F]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050302]"
    >
      {card}
    </Link>
  );
}
