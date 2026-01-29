"""
CFR Pipeline: 20GB XML, 30 anos, todos os títulos → MySQL para API.
Orquestração: descobrir XML → processar cada arquivo (parse + load) → dados disponíveis na API.
"""

from datetime import datetime

from airflow import DAG
from airflow.decorators import task
from airflow.operators.empty import EmptyOperator
from airflow.models.baseoperator import chain

from cfr_parser import discover_xml_files, parse_and_load_one_file, DATA_DIR, CFR_MYSQL_CONN_ID


@task
def discover_cfr_xml() -> list[dict[str, str]]:
    """Lista todos os XMLs em /opt/airflow/data (recursivo)."""
    return discover_xml_files(DATA_DIR)


@task
def parse_and_load(file_info: dict[str, str]) -> dict:
    """Parse um arquivo CFR XML e carrega em MySQL (cfr_titles, cfr_parts, cfr_sections)."""
    return parse_and_load_one_file(file_info, conn_id=CFR_MYSQL_CONN_ID)


@task
def summarize(results: list) -> dict:
    """Soma títulos/partes/seções processados."""
    total = {"titles": 0, "parts": 0, "sections": 0, "files": len(results)}
    for r in results:
        if isinstance(r, dict):
            total["titles"] += r.get("titles", 0)
            total["parts"] += r.get("parts", 0)
            total["sections"] += r.get("sections", 0)
    return total


with DAG(
    dag_id="cfr_pipeline",
    start_date=datetime(2025, 1, 1),
    schedule=None,
    catchup=False,
    tags=["cfr", "xml", "api", "ingest"],
) as dag:
    start = EmptyOperator(task_id="start")
    files = discover_cfr_xml()
    # Um task por arquivo (evita task gigante; 20GB = muitos arquivos)
    loaded = parse_and_load.expand(file_info=files)
    summary = summarize(loaded)
    end = EmptyOperator(task_id="end")
    chain(start, files, loaded, summary, end)
