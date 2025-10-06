import Image from "next/image";

export type GameCardProps = {
  title: string;
  description: string;
  imageSrc?: string | null;
  eta?: string;
};

export default function GameCard({ title, description, imageSrc, eta }: GameCardProps) {
  return (
    <article
      className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-[#DA9C2F]/25 bg-[#0B0B09]/90 shadow-[0_18px_38px_rgba(0,0,0,0.45)] transition duration-300 ease-out hover:-translate-y-[3px] hover:border-[#DA9C2F]/60 hover:shadow-[0_25px_60px_rgba(218,156,47,0.25)] cursor-not-allowed"
      aria-disabled="true"
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
        <span className="pointer-events-none absolute -right-14 top-6 rotate-45 bg-[#DA9C2F] px-10 py-1 text-[10px] font-semibold uppercase tracking-[0.4em] text-[#050302] shadow-[0_8px_20px_rgba(218,156,47,0.35)]">
          Coming Soon
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
          <span className="rounded-full bg-[#DA9C2F] px-4 py-1 text-[10px] font-semibold uppercase tracking-[0.38em] text-[#050302]">
            Coming Soon
          </span>
          {/* {eta && (
            <span className="text-[10px] uppercase tracking-[0.38em] text-white/45">
              {eta}
            </span>
          )} */}
        </div>
      </div>
    </article>
  );
}
