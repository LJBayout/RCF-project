"""
CFR Fulltext Index — Cria/atualiza índice FULLTEXT no MySQL para busca rápida.
Roda após o ingest (cfr_pipeline) ou manual. Opção ao cliente: busca fulltext otimizada.
"""

from datetime import datetime

import pymysql
from airflow import DAG
from airflow.decorators import task
from airflow.hooks.base import BaseHook
from airflow.models.baseoperator import chain
from airflow.operators.empty import EmptyOperator

CFR_MYSQL_CONN_ID = "cfr_mysql"


def _get_conn():
    c = BaseHook.get_connection(CFR_MYSQL_CONN_ID)
    return pymysql.connect(
        host=c.host or "mysql",
        port=int(c.port or 3306),
        user=c.login or "app",
        password=c.password or "app",
        database=c.schema or "cfr_platform",
    )


@task
def ensure_fulltext_index():
    """Cria índice FULLTEXT em cfr_sections (content, subject) se não existir."""
    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "ALTER TABLE cfr_sections ADD FULLTEXT INDEX ft_content_subject (subject, content)"
            )
        conn.commit()
    except pymysql.err.OperationalError as e:
        if "1061" in str(e):  # Duplicate key name
            pass
        else:
            raise
    finally:
        conn.close()


with DAG(
    dag_id="cfr_fulltext_index",
    start_date=datetime(2025, 1, 1),
    schedule=None,
    catchup=False,
    tags=["cfr", "api", "fulltext", "search"],
) as dag:
    start = EmptyOperator(task_id="start")
    build = ensure_fulltext_index()
    end = EmptyOperator(task_id="end")
    chain(start, build, end)
