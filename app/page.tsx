import { loadContentServer } from "./lib/content-server";
import HomePageClient from "./HomePageClient";

export const dynamic = "force-dynamic";

export default async function Home() {
  const content = await loadContentServer();
  return <HomePageClient content={content} />;
}
