import type { PackageItem } from "./data";

export default function PackageCard({ pkg }: { pkg: PackageItem }) {
  return (
    <article className="group rounded-xl border border-white/5 bg-linear-to-b from-white to-[#edebe7] p-6 shadow-lg" >
      <header className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold">{pkg.title}</h3>
          {pkg.duration && <div className="mt-1 text-sm text-[#5f6770]">{pkg.duration}</div>}
        </div>
        <div className="text-right">
          <div className="text-2xl font-extrabold">{pkg.price}</div>
        </div>
      </header>

      <ul className="mt-4 space-y-2 text-sm">
        {pkg.bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-3">
            <svg className="mt-1 h-4 w-4 shrink-0 text-accent" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M5 12l4 4L19 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>{b}</span>
          </li>
        ))}
      </ul>

      {pkg.note && <p className="mt-4 text-xs italic text-[#25292d]">{pkg.note}</p>}

      <div className="mt-6 flex gap-3">
        <a
          href={pkg.primaryButtonHref || "https://54thelementphotography.pixieset.com/booking/"}
          className="btn-accent inline-flex items-center rounded-md px-4 py-2 text-sm font-semibold"
          aria-label={`Select ${pkg.title}`}
        >
          {pkg.primaryButtonText || "Book"}
        </a>
        <a
          href={pkg.secondaryButtonHref || "/#contact"}
          className="btn-accent inline-flex items-center rounded-md px-4 py-2 text-sm font-semibold"
          aria-label={`Inquire about ${pkg.title}`}
        >
          {pkg.secondaryButtonText || "Inquire"}
        </a>
      </div>
    </article>
  );
}
