"""
CFR Export Bulk — Exporta dados do MySQL para JSON (por título ou catálogo).
Roda após o ingest ou manual. Opção ao cliente: download bulk por título.
"""

import json
import os
from datetime import datetime

import pymysql
from airflow import DAG
from airflow.decorators import task
from airflow.hooks.base import BaseHook
from airflow.models.baseoperator import chain
from airflow.operators.empty import EmptyOperator

CFR_MYSQL_CONN_ID = "cfr_mysql"
EXPORT_DIR = "/opt/airflow/data/exports"


def _get_conn():
    c = BaseHook.get_connection(CFR_MYSQL_CONN_ID)
    return pymysql.connect(
        host=c.host or "mysql",
        port=int(c.port or 3306),
        user=c.login or "app",
        password=c.password or "app",
        database=c.schema or "cfr_platform",
        cursorclass=pymysql.cursors.DictCursor,
    )


@task
def export_all_titles():
    """Exporta lista de títulos + contagem para JSON (catálogo para bulk)."""
    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT t.id, t.title_number, t.name, t.subject, t.year,
                       (SELECT COUNT(*) FROM cfr_parts p WHERE p.title_id = t.id) AS part_count,
                       (SELECT COUNT(*) FROM cfr_sections s
                        INNER JOIN cfr_parts p ON s.part_id = p.id WHERE p.title_id = t.id) AS section_count
                FROM cfr_titles t ORDER BY t.title_number
                """
            )
            rows = cur.fetchall()
        os.makedirs(EXPORT_DIR, exist_ok=True)
        path = os.path.join(EXPORT_DIR, "titles_catalog.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(rows, f, indent=2, ensure_ascii=False)
        return {"path": path, "count": len(rows)}
    finally:
        conn.close()


@task
def export_title_bulk(title_number: int):
    """Exporta um título completo (partes + seções) para JSON. Chamado via expand."""
    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM cfr_titles WHERE title_number = %s", (title_number,))
            row = cur.fetchone()
        if not row:
            return {"title_number": title_number, "path": None, "error": "not_found"}
        title_id = row["id"]
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, part_number, name, subject FROM cfr_parts WHERE title_id = %s ORDER BY part_number",
                (title_id,),
            )
            parts = cur.fetchall()
        for p in parts:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT section_number, subject, content FROM cfr_sections WHERE part_id = %s ORDER BY section_number",
                    (p["id"],),
                )
                p["sections"] = cur.fetchall()
        os.makedirs(EXPORT_DIR, exist_ok=True)
        path = os.path.join(EXPORT_DIR, f"title_{title_number}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump({"title_number": title_number, "parts": parts}, f, indent=2, ensure_ascii=False)
        return {"title_number": title_number, "path": path}
    finally:
        conn.close()


@task
def list_title_numbers():
    """Retorna lista de title_number para expand (export por título)."""
    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT title_number FROM cfr_titles ORDER BY title_number")
            return [r["title_number"] for r in cur.fetchall()]
    finally:
        conn.close()


with DAG(
    dag_id="cfr_export_bulk",
    start_date=datetime(2025, 1, 1),
    schedule=None,
    catchup=False,
    tags=["cfr", "export", "bulk", "client"],
) as dag:
    start = EmptyOperator(task_id="start")
    catalog = export_all_titles()
    title_numbers = list_title_numbers()
    exports = export_title_bulk.expand(title_number=title_numbers)
    end = EmptyOperator(task_id="end")
    start >> catalog >> title_numbers >> exports >> end
