import { POST as handlePublish } from "../publish/route";

/**
 * Rota de retrocompatibilidade para despacho exclusivo no X.com.
 * Força a inclusão de channels: ["x"] caso não seja especificado e repassa
 * a requisição autenticada para o handler unificado.
 */
export async function POST(req: Request) {
  try {
    const rawBody = (await req.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;

    const modifiedBody =
      rawBody && typeof rawBody === "object"
        ? {
            ...rawBody,
            channels: rawBody.channels || ["x"],
          }
        : null;

    const headers = new Headers(req.headers);
    headers.delete("content-length");
    if (modifiedBody) {
      headers.set("content-type", "application/json");
    }

    const modifiedReq = new Request(req.url, {
      method: "POST",
      headers,
      body: modifiedBody ? JSON.stringify(modifiedBody) : null,
    });

    return handlePublish(modifiedReq);
  } catch {
    const headers = new Headers(req.headers);
    headers.delete("content-length");
    return handlePublish(
      new Request(req.url, {
        method: "POST",
        headers,
        body: null,
      }),
    );
  }
}
