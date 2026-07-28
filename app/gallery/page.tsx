import { loadContentServer } from "../lib/content-server";
import CategoryCarousel from "./components/CategoryCarousel";

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  const content = await loadContentServer();

  return (
    <div className="container w-screen space-y-5">
      <header className="max-w-3xl space-y-2">
        <h1 className="text-3xl md:text-4xl font-extrabold">Gallery</h1>
        <p className="text-sm text-[#797979] mt-2">Check out our latest work across different projects.</p>
      </header>

      <div className="flex flex-col mt-8">
        {content.gallery.map((cat) => (
          <section key={cat.key} aria-labelledby={`gallery-${cat.key}`} className="cv-auto">
            <div className="flex items-center justify-between">
              <h2 id={`gallery-${cat.key}`} className="text-2xl font-semibold">{cat.title}</h2>
            </div>

            <div className=" container justify-center w-full">
              <CategoryCarousel slides={cat.images} interval={5000} />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
