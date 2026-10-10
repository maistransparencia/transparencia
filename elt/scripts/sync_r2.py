"""Utility script to synchronize raw extraction runs with Cloudflare R2 (Bronze Data Lake)."""

import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path

from dotenv import find_dotenv, load_dotenv

load_dotenv(find_dotenv(usecwd=True))


def get_r2_config() -> dict[str, str]:
    account_id = os.environ.get("R2_ACCOUNT_ID", "").strip()
    access_key = os.environ.get("R2_ACCESS_KEY_ID", "").strip()
    secret_key = os.environ.get("R2_SECRET_ACCESS_KEY", "").strip()
    bucket_name = os.environ.get("R2_BUCKET_NAME", "").strip()

    missing = []
    if not account_id:
        missing.append("R2_ACCOUNT_ID")
    if not access_key:
        missing.append("R2_ACCESS_KEY_ID")
    if not secret_key:
        missing.append("R2_SECRET_ACCESS_KEY")
    if not bucket_name:
        missing.append("R2_BUCKET_NAME")

    if missing:
        sys.stderr.write(
            f"Erro: As seguintes variáveis de ambiente do Cloudflare R2 não foram encontradas:\n"
            f"  - {', '.join(missing)}\n\n"
            f"Por favor, defina-as no arquivo .env ou exporte-as no terminal.\n"
        )
        sys.exit(1)

    return {
        "account_id": account_id,
        "access_key": access_key,
        "secret_key": secret_key,
        "bucket_name": bucket_name,
        "endpoint_url": f"https://{account_id}.r2.cloudflarestorage.com",
    }


def sync_with_aws_cli(
    action: str,
    config: dict[str, str],
    local_path: Path,
    remote_path: str,
    dry_run: bool = False,
) -> None:
    aws_cmd = shutil.which("aws")
    if not aws_cmd:
        sys.stderr.write(
            "Erro: 'aws' CLI não foi encontrada no PATH do sistema.\n"
            "Instale a AWS CLI (ex: brew install awscli) para utilizar este utilitário.\n"
        )
        sys.exit(1)

    env = os.environ.copy()
    env["AWS_ACCESS_KEY_ID"] = config["access_key"]
    env["AWS_SECRET_ACCESS_KEY"] = config["secret_key"]
    env["AWS_DEFAULT_REGION"] = "auto"

    if action == "pull":
        source = remote_path
        target = str(local_path)
        local_path.mkdir(parents=True, exist_ok=True)
        print(f"📥 Baixando dados brutos do R2 ({source}) -> Local ({target})...")
    else:  # push
        source = str(local_path)
        target = remote_path
        if not local_path.exists():
            print(f"⚠️ Diretório local {local_path} não existe. Nada a enviar.")
            return
        print(f"📤 Enviando dados brutos do Local ({source}) -> R2 ({target})...")

    cmd = [
        aws_cmd,
        "s3",
        "sync",
        source,
        target,
        "--endpoint-url",
        config["endpoint_url"],
    ]

    if dry_run:
        cmd.append("--dryrun")
        print("🔍 Modo Dry-Run ativado:")

    result = subprocess.run(cmd, env=env)
    if result.returncode != 0:
        sys.stderr.write(f"Falha na sincronização com Cloudflare R2 (código de saída: {result.returncode})\n")
        sys.exit(result.returncode)

    print("✅ Sincronização concluída com sucesso!")


def main() -> None:
    parser = argparse.ArgumentParser(description="Sincronizador de dados brutos com Cloudflare R2")
    parser.add_argument("action", choices=["pull", "push"], help="Ação a executar: 'pull' (baixar) ou 'push' (enviar)")
    parser.add_argument("--portal", help="Slug do portal específico (opcional, padrão: todos)")
    parser.add_argument("--dry-run", action="store_true", help="Simular a sincronização sem alterar arquivos")
    args = parser.parse_args()

    config = get_r2_config()
    project_root = Path(__file__).resolve().parents[2]
    raw_base = project_root / "data" / "raw_runs"

    if args.portal:
        local_dir = raw_base / args.portal
        remote_uri = f"s3://{config['bucket_name']}/raw_runs/{args.portal}"
    else:
        local_dir = raw_base
        remote_uri = f"s3://{config['bucket_name']}/raw_runs"

    sync_with_aws_cli(
        action=args.action,
        config=config,
        local_path=local_dir,
        remote_path=remote_uri,
        dry_run=args.dry_run,
    )


if __name__ == "__main__":
    main()
