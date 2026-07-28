import { loadContentServer } from "../../lib/content-server";
import ClientLoginClient from "./ClientLoginClient";

export const dynamic = "force-dynamic";

export default async function ClientLoginPage() {
  const content = await loadContentServer();

  return (
    <ClientLoginClient
      background={content.clientLoginBackground}
      clients={content.clients.map((client) => ({ username: client.username, password: client.password }))}
    />
  );
}
