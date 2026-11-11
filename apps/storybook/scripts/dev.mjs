import { spawn } from "node:child_process";
import { createServer } from "node:net";

const PORTA_PREFERIDA = Number(process.env.STORYBOOK_PORT ?? 6006);
const TENTATIVAS = 50;

const ENDERECOS = ["127.0.0.1", undefined];

const enderecoLivre = (porta, endereco) =>
  new Promise((resolve) => {
    const servidor = createServer();
    servidor.once("error", () => resolve(false));
    servidor.once("listening", () => servidor.close(() => resolve(true)));
    servidor.listen(porta, endereco);
  });

// O Storybook liga em 127.0.0.1; testar só o endereço padrão não enxerga
// um processo preso nele (no macOS o bind genérico ainda funciona).
const portaLivre = async (porta) =>
  (await Promise.all(ENDERECOS.map((e) => enderecoLivre(porta, e)))).every(
    Boolean,
  );

const encontrarPorta = async (porta, restantes = TENTATIVAS) => {
  if (restantes === 0) throw new Error("Nenhuma porta livre encontrada.");
  return (await portaLivre(porta))
    ? porta
    : encontrarPorta(porta + 1, restantes - 1);
};

const porta = await encontrarPorta(PORTA_PREFERIDA);
if (porta !== PORTA_PREFERIDA) {
  process.stdout.write(`Porta ${PORTA_PREFERIDA} em uso; usando ${porta}.\n`);
}

spawn(
  "storybook",
  ["dev", "-p", String(porta), "--exact-port", ...process.argv.slice(2)],
  { stdio: "inherit", shell: process.platform === "win32" },
).on("exit", (codigo) => process.exit(codigo ?? 0));
