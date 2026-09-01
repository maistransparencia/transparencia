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

    if (!rawBody || typeof rawBody !== "object") {
      // Reconstitui requisição para tratamento no handler oficial
      return handlePublish(req);
    }

    const modifiedBody = {
      ...rawBody,
      channels: rawBody.channels || ["x"],
    };

    const modifiedReq = new Request(req.url, {
      method: "POST",
      headers: req.headers,
      body: JSON.stringify(modifiedBody),
    });

    return handlePublish(modifiedReq);
  } catch {
    return handlePublish(req);
  }
}
