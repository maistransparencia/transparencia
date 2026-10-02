"""Módulo compartilhado de automação para baixar CSVs de Receitas

dos Portais da Transparência Fiorilli (Natividade, Porciúncula, Bom Jesus, São Fidélis, etc.).
"""

import argparse
import json
import subprocess
import sys
import time
import urllib.error
import urllib.request
from csv import writer
from datetime import date
from pathlib import Path
from typing import Any

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
from playwright.sync_api import sync_playwright

from elt.core.config import PortalConfig

PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

CHROME_EXECUTABLE = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
CHROME_REMOTE_DEBUGGING_PORT = 9222

REPORTS = [
    ("Arrecadação Orçamentária - Geral", "ReceitaOrcamentaria"),
    ("Arrecadação Orçamentária - Transferências da União", "ReceitaUniao"),
    ("Arrecadação Orçamentária - Transferências do Estado", "ReceitaEstado"),
    ("Arrecadação Extra-Orçamentária", "ReceitaExtraOrcamentaria"),
]

REPORT_ACTION_MAP = {
    "Arrecadação Orçamentária - Geral": "lnkReceitaOrcamentaria",
    "Arrecadação Orçamentária - Transferências da União": "lnkReceitaUniao",
    "Arrecadação Orçamentária - Transferências do Estado": "lnkReceitaEstado",
    "Arrecadação Extra-Orçamentária": "lnkReceitaExtraOrcamentaria",
}

MAX_REPORT_RETRIES = 1


def report_key(year: int, entity_slug: str, report_slug: str) -> str:
    """Chave única de progresso por combinação ano-entidade-relatório."""
    return f"{year}|{entity_slug}|{report_slug}"


def load_progress(progress_path: Path, legacy_path: Path | None = None) -> set[str]:
    """Carrega o progresso já concluído para retomar execuções interrompidas."""
    target_path = (
        progress_path if progress_path.exists() else (legacy_path if legacy_path and legacy_path.exists() else None)
    )
    if not target_path or not target_path.exists():
        return set()

    try:
        data = json.loads(target_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return set()

    completed = data.get("completed", [])
    if not isinstance(completed, list):
        return set()

    return {str(item) for item in completed}


def save_progress(progress_path: Path, completed: set[str]) -> None:
    """Persiste o progresso de forma incremental para retomada posterior."""
    progress_path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "updated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "completed": sorted(completed),
    }
    tmp_path = progress_path.with_suffix(".tmp")
    tmp_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp_path.replace(progress_path)


def select_devexpress_combo(page: Any, combo_id: str, option_text: str, timeout_ms: int = 30000) -> None:
    """Abre um ASPxComboBox da DevExpress e seleciona o item pelo texto exato."""
    input_selector = f"#{combo_id}_I"
    dropdown_selector = f"#{combo_id}_DDD_L"
    option_locator = page.locator(
        f"{dropdown_selector} td.dxeListBoxItem_DevEx:visible",
        has_text=option_text,
    ).first

    try:
        if page.locator(input_selector).input_value(timeout=1000).strip() == option_text:
            return
    except PlaywrightTimeoutError:
        pass

    last_error: Exception | None = None
    for _ in range(4):
        try:
            wait_for_loader_idle(page, timeout_ms=timeout_ms)

            if page.locator(dropdown_selector).is_visible():
                page.keyboard.press("Escape")
                page.locator(dropdown_selector).wait_for(state="hidden", timeout=3000)

            page.click(f"#{combo_id}_B-1", timeout=timeout_ms)
            page.locator(dropdown_selector).wait_for(state="visible", timeout=timeout_ms)
            option_locator.wait_for(state="visible", timeout=timeout_ms)
            page.wait_for_timeout(300)
            option_locator.click(timeout=timeout_ms)

            try:
                page.locator(dropdown_selector).wait_for(state="hidden", timeout=5000)
            except PlaywrightTimeoutError:
                pass

            page.wait_for_function(
                """([inputSelector, expected]) => {
                    const el = document.querySelector(inputSelector);
                    if (!el) return false;
                    const value = el.value.trim();
                    return value === expected || value.includes(expected);
                }""",
                arg=[input_selector, option_text],
                timeout=15000,
            )
            wait_for_loader_idle(page, timeout_ms=timeout_ms)
            page.wait_for_timeout(350)
            return
        except PlaywrightTimeoutError as exc:
            last_error = exc

    current_value = ""
    try:
        current_value = page.locator(input_selector).input_value(timeout=1000).strip()
    except PlaywrightTimeoutError:
        current_value = "<indisponível>"

    raise RuntimeError(
        f"Falha ao selecionar '{option_text}' no combo '{combo_id}'. Valor atual: '{current_value}'."
    ) from last_error


def try_select_devexpress_combo(page: Any, combo_id: str, option_text: str) -> bool:
    """Seleciona item do combo; retorna False apenas quando o item não existe."""
    if not combo_has_option(page, combo_id, option_text):
        return False

    try:
        select_devexpress_combo(page, combo_id, option_text, timeout_ms=4000)
        return True
    except (PlaywrightTimeoutError, RuntimeError) as exc:
        if combo_has_option(page, combo_id, option_text):
            raise RuntimeError(f"Item '{option_text}' existe no combo '{combo_id}', mas a seleção falhou.") from exc
        return False


def combo_has_option(page: Any, combo_id: str, option_text: str) -> bool:
    """Verifica se um item existe no combo DevExpress sem depender de click visível."""
    try:
        return bool(
            page.evaluate(
                """([id, expected]) => {
                    const norm = (s) => (s || '').toString().trim().toLowerCase();
                    const target = norm(expected);
                    const getByName = globalThis.ASPxClientControl?.GetControlCollection?.().GetByName;
                    const combo = globalThis[id] || (getByName ? getByName(id) : null);
                    if (!combo || typeof combo.GetItemCount !== 'function' || typeof combo.GetItem !== 'function') {
                        return false;
                    }
                    const count = combo.GetItemCount();
                    for (let i = 0; i < count; i += 1) {
                        const item = combo.GetItem(i);
                        const text = norm(item?.text ?? item?.GetText?.() ?? '');
                        if (text === target) return true;
                    }
                    return false;
                }""",
                [combo_id, option_text],
            )
        )
    except PlaywrightError:
        return False


def get_report_action_id(page: Any, link_text: str) -> str | None:
    """Extrai o identificador usado por ProcessaDados a partir do texto do link."""
    try:
        action_id = page.evaluate(
            """(targetText) => {
                const normalize = (s) => (s || '').replace(/\\s+/g, ' ').trim();
                const target = normalize(targetText);
                const links = Array.from(document.querySelectorAll('a[onclick*="ProcessaDados"]'));
                const match = links.find((el) => normalize(el.textContent) === target);
                if (!match) return null;

                const onclick = match.getAttribute('onclick') || '';
                const m = onclick.match(/ProcessaDados\\('([^']+)'\\)/);
                return m ? m[1] : null;
            }""",
            link_text,
        )
    except PlaywrightError:
        return None

    if action_id is None:
        return None
    return str(action_id)


def open_receitas_report(page: Any, link_text: str) -> None:
    """Abre relatório de Receitas por ação JS (mais estável que hover/click no menu)."""
    wait_for_loader_idle(page, timeout_ms=20000)

    action_id = get_report_action_id(page, link_text) or REPORT_ACTION_MAP.get(link_text)
    if action_id:
        triggered = bool(
            page.evaluate(
                """(id) => {
                    if (typeof ProcessaDados !== 'function') return false;
                    ProcessaDados(id);
                    return true;
                }""",
                action_id,
            )
        )
        if not triggered:
            raise RuntimeError(f"Não foi possível disparar ProcessaDados para '{link_text}'.")
    else:
        menu_item = page.locator("#LnkMenuReceitas")
        try:
            menu_item.hover(timeout=3000)
        except PlaywrightTimeoutError:
            pass
        menu_item.click(timeout=5000, force=True)
        wait_for_loader_idle(page, timeout_ms=10000)
        try:
            page.get_by_text(link_text, exact=True).click(timeout=8000)
        except PlaywrightError:
            page.get_by_text(link_text, exact=True).click(timeout=8000, force=True)

    try:
        page.wait_for_load_state("networkidle", timeout=5000)
    except PlaywrightTimeoutError:
        pass

    wait_for_loader_idle(page, timeout_ms=20000)
    page.frame_locator("#frmPaginaAspx").locator("#btnExportarCSV").wait_for(timeout=30000)
    page.wait_for_timeout(600)


def is_transparencia_server_error(page: Any) -> bool:
    """Detecta a página de erro do aplicativo ASP.NET do portal."""
    return bool(page.get_by_text("Erro de Servidor no Aplicativo '/Transparencia'.").count() > 0)


def restore_state_for_report(page: Any, base_url: str, year: int, entity_text: str) -> None:
    """Retorna ao estado base (ano + entidade) para tentar abrir o relatório novamente."""
    last_error: Exception | None = None
    for _ in range(2):
        try:
            page.goto(base_url, wait_until="domcontentloaded", timeout=120_000)
            wait_for_transparencia_app(page)
            wait_for_loader_idle(page, timeout_ms=20000)
            select_devexpress_combo(page, "cmbExercicio", str(year))
            if not try_select_devexpress_combo(page, "cmbEntidadeContabil", entity_text):
                raise RuntimeError(f"Entidade '{entity_text}' não disponível ao restaurar estado para o ano {year}.")
            return
        except (PlaywrightTimeoutError, RuntimeError, PlaywrightError) as exc:
            last_error = exc

    raise RuntimeError(f"Falha ao restaurar estado para ano={year}, entidade='{entity_text}'.") from last_error


def normalize_csv_to_utf8(file_path: Path) -> None:
    """Converte o CSV para UTF-8, preservando o conteúdo textual."""
    raw = file_path.read_bytes()
    last_error: Exception | None = None

    for encoding in ("utf-8-sig", "utf-8", "cp1252", "latin1"):
        try:
            text = raw.decode(encoding)
            break
        except UnicodeDecodeError as exc:
            last_error = exc
    else:
        raise UnicodeDecodeError(
            "utf-8",
            raw,
            0,
            1,
            f"Falha ao decodificar CSV em encodings conhecidos: {last_error}",
        )

    with file_path.open("w", encoding="utf-8", newline="") as f:
        f.write(text)


def download_csv(page: Any, save_path: Path) -> None:
    """Clica no botão CSV dentro do iframe do relatório e salva o download."""
    frame = page.frame_locator("#frmPaginaAspx")
    wait_for_loader_idle(page, timeout_ms=20000)
    with page.expect_download() as download_info:
        frame.locator("#btnExportarCSV").click(timeout=8000, force=True)
    download = download_info.value
    save_path.parent.mkdir(parents=True, exist_ok=True)
    download.save_as(save_path)
    normalize_csv_to_utf8(save_path)
    print(f"  -> salvo em {save_path} (UTF-8)")


def process_report_with_recovery(
    page: Any, link_text: str, save_path: Path, max_retries: int = MAX_REPORT_RETRIES
) -> tuple[bool, str | None]:
    """Processa um relatório com tentativas simples."""
    for attempt in range(1, max_retries + 1):
        try:
            open_receitas_report(page, link_text)

            if is_transparencia_server_error(page):
                raise RuntimeError("Portal retornou página de erro do aplicativo.")

            download_csv(page, save_path)
            return True, None
        except (PlaywrightTimeoutError, RuntimeError, PlaywrightError) as exc:
            if page.is_closed():
                return False, "Página foi fechada durante o processamento do relatório"

            if attempt == max_retries:
                print(f"      -> falha após {max_retries} tentativas: {exc}")
                return False, str(exc)

            print(f"      -> erro na tentativa {attempt}: {exc}; tentando novamente")

    return False, "Falha desconhecida no processamento do relatório"


def append_failed_request_log(
    failed_log_path: Path,
    year: int,
    entity_slug: str,
    entity_text: str,
    report_slug: str,
    report_text: str,
    save_path: Path,
    error_text: str,
) -> None:
    """Registra falhas para retentativa posterior."""
    failed_log_path.parent.mkdir(parents=True, exist_ok=True)
    write_header = not failed_log_path.exists() or failed_log_path.stat().st_size == 0

    with failed_log_path.open("a", encoding="utf-8", newline="") as f:
        csv_writer = writer(f)
        if write_header:
            csv_writer.writerow(
                [
                    "timestamp",
                    "year",
                    "entity_slug",
                    "entity_text",
                    "report_slug",
                    "report_text",
                    "save_path",
                    "error",
                ]
            )

        csv_writer.writerow(
            [
                time.strftime("%Y-%m-%d %H:%M:%S"),
                year,
                entity_slug,
                entity_text,
                report_slug,
                report_text,
                str(save_path),
                error_text,
            ]
        )


def wait_for_transparencia_app(page: Any, timeout_ms: int = 120_000) -> None:
    """Espera a interface autenticada carregar após a verificação manual ou desafio Cloudflare."""
    page.wait_for_load_state("domcontentloaded")
    page.locator("#LnkMenuReceitas").wait_for(state="visible", timeout=timeout_ms)
    page.locator("#cmbExercicio_I").wait_for(state="visible", timeout=timeout_ms)
    page.locator("#cmbEntidadeContabil_I").wait_for(state="visible", timeout=timeout_ms)
    neutralize_modal_loader(page)
    page.wait_for_timeout(800)


def neutralize_modal_loader(page: Any) -> None:
    """Garante que o overlay de loading nunca bloqueie cliques/inputs."""
    try:
        page.evaluate(
            """() => {
                if (document.getElementById('_noModalLoaderBlock')) return;
                const style = document.createElement('style');
                style.id = '_noModalLoaderBlock';
                style.textContent = '#_divModalLoader { pointer-events: none !important; }';
                document.head.appendChild(style);
            }"""
        )
    except PlaywrightError:
        pass


def wait_for_loader_idle(page: Any, timeout_ms: int = 20000) -> bool:
    """Aguarda o overlay de loading não bloquear interações."""
    try:
        page.wait_for_function(
            """() => {
                const el = document.querySelector('#_divModalLoader');
                if (!el) return true;
                const style = window.getComputedStyle(el);
                const isHidden =
                    style.display === 'none' ||
                    style.visibility === 'hidden' ||
                    Number(style.opacity) === 0 ||
                    el.clientHeight === 0 ||
                    el.clientWidth === 0;
                return isHidden;
            }""",
            timeout=timeout_ms,
        )
        return True
    except PlaywrightTimeoutError:
        try:
            page_is_interactive = bool(
                page.evaluate(
                    """() => {
                        const yearInput = document.querySelector('#cmbExercicio_I');
                        const entityInput = document.querySelector('#cmbEntidadeContabil_I');
                        const exportBtn = document.querySelector('#frmPaginaAspx');

                        const yearReady = !!yearInput && !yearInput.disabled;
                        const entityReady = !!entityInput && !entityInput.disabled;
                        const reportReady = !!exportBtn;

                        return (yearReady && entityReady) || reportReady;
                    }"""
                )
            )
        except PlaywrightError:
            page_is_interactive = False

        if page_is_interactive:
            try:
                page.evaluate(
                    """() => {
                        const el = document.querySelector('#_divModalLoader');
                        if (!el) return;
                        el.style.display = 'none';
                        el.style.visibility = 'hidden';
                        el.style.opacity = '0';
                        el.style.pointerEvents = 'none';
                    }"""
                )
                return True
            except PlaywrightError:
                return False

        return False


def launch_chrome_with_remote_debugging(chrome_executable: str, port: int, user_data_dir: Path) -> None:
    """Inicia o Chrome como app normal e expõe CDP em uma porta local."""
    subprocess.Popen(
        [
            chrome_executable,
            f"--remote-debugging-port={port}",
            f"--user-data-dir={user_data_dir}",
            "--no-first-run",
            "--new-window",
            "about:blank",
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        start_new_session=True,
    )


def wait_for_cdp_endpoint(port: int = CHROME_REMOTE_DEBUGGING_PORT, timeout_ms: int = 30_000) -> None:
    """Aguarda o endpoint CDP do Chrome ficar disponível."""
    endpoint = f"http://127.0.0.1:{port}/json/version"
    deadline = time.time() + timeout_ms / 1000
    last_error: Exception | None = None

    while time.time() < deadline:
        try:
            with urllib.request.urlopen(endpoint, timeout=2) as response:
                if response.status == 200:
                    return
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            last_error = exc
            time.sleep(0.5)

    raise RuntimeError(f"Chrome não expôs CDP na porta {port} dentro do tempo limite.") from last_error


def run_receitas_csv_extraction(portal_slug: str) -> None:
    """Executa o ciclo completo de extração de CSVs de receitas para o município."""
    if not Path(CHROME_EXECUTABLE).exists():
        raise FileNotFoundError(f"Chrome não encontrado em {CHROME_EXECUTABLE}.")

    portal_cfg = PortalConfig.load(portal_slug)
    base_url = portal_cfg.portal_url
    years = list(range(portal_cfg.ano_inicial, date.today().year))
    entities_map = portal_cfg.load_orgaos()
    entities = [(nome.upper(), eid) for eid, nome in entities_map.items()]

    base_download_dir = PROJECT_ROOT / "data" / "raw" / portal_slug / "receitas_csv"
    user_data_dir = PROJECT_ROOT / ".local_browsers" / f"chrome_profile_{portal_slug}"
    failed_log_path = base_download_dir / "failed_requests.csv"
    progress_log_path = base_download_dir / "receitas_progress.json"

    legacy_progress_path = (
        PROJECT_ROOT / "data" / "csv" / "receitas_progress.json" if portal_slug == "porciuncula_prefeitura" else None
    )

    user_data_dir.mkdir(parents=True, exist_ok=True)
    base_download_dir.mkdir(parents=True, exist_ok=True)

    launch_chrome_with_remote_debugging(CHROME_EXECUTABLE, CHROME_REMOTE_DEBUGGING_PORT, user_data_dir)
    wait_for_cdp_endpoint(CHROME_REMOTE_DEBUGGING_PORT)

    completed_reports = load_progress(progress_log_path, legacy_progress_path)
    if completed_reports:
        print(
            f"Retomando progresso ({portal_cfg.display_name}): {len(completed_reports)} relatório(s) já concluído(s)."
        )

    with sync_playwright() as p:
        browser = p.chromium.connect_over_cdp(f"http://127.0.0.1:{CHROME_REMOTE_DEBUGGING_PORT}")
        if not browser.contexts:
            raise RuntimeError("Chrome conectou, mas nenhum contexto foi encontrado via CDP.")

        context = browser.contexts[0]
        page = context.pages[0] if context.pages else context.new_page()
        page.bring_to_front()
        print(f"Abrindo {base_url}...")
        response = page.goto(base_url, wait_until="domcontentloaded", timeout=120_000)
        print(f"Página atual: {page.url}")
        if response is not None:
            print(f"HTTP: {response.status}")

        print("Se aparecer o desafio do Cloudflare, resolva-o manualmente na janela do navegador.")
        print("Aguardando a interface autenticada carregar...")
        try:
            wait_for_transparencia_app(page)
        except PlaywrightTimeoutError as exc:
            raise RuntimeError(
                "A interface autenticada não carregou após a verificação manual. "
                "Confira se o desafio foi concluído na janela do Chrome e tente novamente."
            ) from exc

        for year in years:
            print(f"\n=== Ano {year} ===")
            for entity_text, entity_slug in entities:
                pending_reports = [
                    (link_text, report_slug)
                    for link_text, report_slug in REPORTS
                    if report_key(year, entity_slug, report_slug) not in completed_reports
                ]
                if not pending_reports:
                    print(f"  -- Entidade: {entity_text} -> já concluída; pulando")
                    continue

                print(f"  -- Entidade: {entity_text}")
                try:
                    restore_state_for_report(page, base_url, year, entity_text)
                except RuntimeError as exc:
                    print(f"     -> não foi possível preparar estado para essa entidade: {exc}")
                    continue

                for link_text, report_slug in pending_reports:
                    print(f"    Relatório: {link_text}")
                    save_path = base_download_dir / f"{entity_slug}_{year}_{report_slug}.csv"
                    current_key = report_key(year, entity_slug, report_slug)

                    try:
                        restore_state_for_report(page, base_url, year, entity_text)
                    except RuntimeError as prep_exc:
                        print(f"      -> falha ao preparar estado antes do relatório: {prep_exc}")
                        append_failed_request_log(
                            failed_log_path,
                            year,
                            entity_slug,
                            entity_text,
                            report_slug,
                            link_text,
                            save_path,
                            str(prep_exc),
                        )
                        continue

                    ok, error_text = process_report_with_recovery(page, link_text, save_path)
                    if not ok:
                        print("      -> pulando relatório e seguindo")
                        append_failed_request_log(
                            failed_log_path,
                            year,
                            entity_slug,
                            entity_text,
                            report_slug,
                            link_text,
                            save_path,
                            error_text or "Falha sem detalhe",
                        )
                        continue

                    completed_reports.add(current_key)
                    save_progress(progress_log_path, completed_reports)

        print(f"\nConcluído! Todos os arquivos de {portal_cfg.display_name} foram baixados.")
        browser.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Baixar CSVs de receitas do portal Fiorilli.")
    parser.add_argument("--portal", required=True, help="Slug do portal (ex: natividade_prefeitura)")
    args = parser.parse_args()
    run_receitas_csv_extraction(args.portal)


if __name__ == "__main__":
    main()
