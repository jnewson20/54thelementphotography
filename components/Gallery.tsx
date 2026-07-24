import Image from "next/image";
import Link from "next/link";
import { toMediaSrc } from "../app/lib/media";

export default function Gallery({ items = [] }: { items: { id: string; title: string; thumb: string }[] }) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 auto-rows-[200px]">
      {items.map((it) => (
        <Link className="relative overflow-hidden rounded-3xl group block" key={it.id} href={`/clients/login`}>
          <div className="relative h-full w-full transition-transform group-hover:scale-105">
            <Image src={toMediaSrc(it.thumb)} alt={it.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
          </div>
          <div className="p-3">
            <div className="text-sm text-[#9aa6b2]">{it.title}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}
