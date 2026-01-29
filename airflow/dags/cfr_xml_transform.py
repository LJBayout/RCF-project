"""
CFR XML transform — XML → MySQL (same as cfr_pipeline, alternate DAG).
Raw CFR XML under /opt/airflow/data → stream-parse → cfr_titles/cfr_parts/cfr_sections.
Use this DAG when you want a dedicated "transform" entry point; result is the same as cfr_pipeline.
"""

from datetime import datetime

from airflow import DAG
from airflow.decorators import task
from airflow.models.baseoperator import chain
from airflow.operators.empty import EmptyOperator

from cfr_parser import discover_xml_files, parse_and_load_one_file, DATA_DIR, CFR_MYSQL_CONN_ID


@task
def list_xml():
    """List all CFR XML files under data dir (recursive)."""
    return discover_xml_files(DATA_DIR)


@task
def transform_xml(file_info: dict) -> dict:
    """Transform one CFR XML file: stream-parse and load to MySQL."""
    return parse_and_load_one_file(file_info, conn_id=CFR_MYSQL_CONN_ID)


with DAG(
    dag_id="cfr_xml_transform",
    start_date=datetime(2025, 1, 1),
    schedule=None,
    catchup=False,
    tags=["cfr", "xml", "transform"],
) as dag:
    start = EmptyOperator(task_id="start")
    files = list_xml()
    transformed = transform_xml.expand(file_info=files)
    end = EmptyOperator(task_id="end")
    chain(start, files, transformed, end)
