"""
CFR XML parser (streaming) + load to MySQL.
20GB / 30 years / 50 titles — parse by file, never load full XML in memory.
Adapt tag names to your actual CFR XML (eCFR vs GPO).
"""

import os
import re
from typing import Any, Generator

# Called from Airflow tasks; lxml installed via _PIP_ADDITIONAL_REQUIREMENTS
import lxml.etree as etree


DATA_DIR = "/opt/airflow/data"
CFR_MYSQL_CONN_ID = "cfr_mysql"


def discover_xml_files(base_path: str = DATA_DIR) -> list[dict[str, str]]:
    """
    List all CFR XML files under base_path (recursive).
    Returns list of {"rel": "year/title-21.xml", "path": "/opt/airflow/data/..."}.
    """
    out: list[dict[str, str]] = []
    base = os.path.abspath(base_path)
    if not os.path.isdir(base):
        return out
    for root, _dirs, files in os.walk(base):
        for f in files:
            if f.lower().endswith(".xml"):
                full = os.path.join(root, f)
                rel = os.path.relpath(full, base)
                out.append({"rel": rel, "path": full})
    return out


def _text(elem: Any) -> str:
    if elem is None:
        return ""
    t = elem.text or ""
    for c in elem:
        t += _text(c)
        if c.tail:
            t += c.tail
    return (t or "").strip()


def _norm_ws(s: str, max_len: int = 65535) -> str:
    if not s:
        return ""
    s = " ".join(s.split())
    return s[:max_len] if len(s) > max_len else s


def parse_cfr_xml_stream(file_path: str) -> Generator[dict[str, Any], None, None]:
    """
    Stream-parse one CFR XML file. Yields dicts for title, parts, sections.
    Tag names are generic; adjust to your XML (e.g. DIV5 @TYPE=title, PART, SECTION).
    """
    # Common patterns: <TITLE N="21">, <PART>, <SECTION>, or eCFR <DIV5 TYPE="title">, etc.
    # We look for elements that might be title/part/section by tag or attribute.
    if not os.path.isfile(file_path):
        return
    context = etree.iterparse(file_path, events=("end",), tag=etree.Element)
    current_title: dict[str, Any] | None = None
    current_part: dict[str, Any] | None = None
    # Try to infer year from path (e.g. .../2024/... or .../title-21-2024.xml)
    year_match = re.search(r"\b(19|20)\d{2}\b", file_path)
    default_year = int(year_match.group(0)) if year_match else 2024

    for _event, elem in context:
        tag = elem.tag.upper() if hasattr(elem.tag, "upper") else str(elem.tag or "")
        # Strip namespace
        if "}" in tag:
            tag = tag.split("}")[-1]
        attrs = elem.attrib or {}
        n = attrs.get("N") or attrs.get("num") or attrs.get("number") or ""
        type_ = (attrs.get("TYPE") or attrs.get("type") or "").upper()

        # Title level: e.g. TITLE, DIV5 type=title, or element with N="1"-"50"
        if tag == "TITLE" or type_ == "TITLE" or (tag == "DIV5" and "TITLE" in type_):
            num = n or _text(elem.find(".//{*}NUM")) or ""
            if num.isdigit():
                current_title = {
                    "title_number": int(num),
                    "name": _norm_ws(_text(elem.find(".//{*}HEAD")) or _text(elem)) or f"Title {num}",
                    "subject": _norm_ws(_text(elem.find(".//{*}SUBJECT")), 8192),
                    "year": default_year,
                    "revised_date": None,
                }
                yield {"type": "title", "data": current_title}
        # Part level
        elif tag == "PART" or type_ == "PART" or (tag == "DIV6" and "PART" in type_):
            num = n or _text(elem.find(".//{*}NUM")) or ""
            if num.isdigit() and current_title:
                current_part = {
                    "part_number": int(num),
                    "name": _norm_ws(_text(elem.find(".//{*}HEAD")) or _text(elem)) or f"Part {num}",
                    "subject": _norm_ws(_text(elem.find(".//{*}SUBJECT")), 8192),
                    "authority": None,
                    "source": None,
                }
                yield {"type": "part", "data": current_part}
        # Section level
        elif tag == "SECTION" or type_ == "SECTION" or (tag == "DIV8" and "SECTION" in type_):
            num = n or _text(elem.find(".//{*}SECTNO")) or _text(elem.find(".//{*}NUM")) or ""
            if num and current_part:
                subject = _norm_ws(_text(elem.find(".//{*}SUBJECT")) or _text(elem.find(".//{*}HEAD")), 8192)
                content = _norm_ws(_text(elem.find(".//{*}CONTENT")) or _text(elem), 65535)
                if not subject and content:
                    subject = content[:500] + ("..." if len(content) > 500 else "")
                yield {
                    "type": "section",
                    "data": {
                        "section_number": str(num)[:50],
                        "subject": subject or "(no subject)",
                        "content": content or "",
                    },
                }
        elem.clear()
        if elem.getprevious() is not None:
            try:
                del elem.getparent()[0]
            except Exception:
                pass


def load_cfr_file_to_mysql(file_path: str, conn_id: str = CFR_MYSQL_CONN_ID) -> dict[str, int]:
    """
    Parse one CFR XML file and upsert into MySQL (cfr_titles, cfr_parts, cfr_sections).
    Uses Airflow Hook; run from a task that has access to Airflow connections.
    Returns {"titles": n, "parts": n, "sections": n}.
    """
    from airflow.hooks.base import BaseHook
    import pymysql

    conn = BaseHook.get_connection(conn_id)
    # BaseHook.get_connection returns host, port, login, password, schema
    host = conn.host or "mysql"
    port = int(conn.port or 3306)
    user = conn.login or "app"
    password = conn.password or "app"
    database = conn.schema or "cfr_platform"

    db = pymysql.connect(host=host, port=port, user=user, password=password, database=database)
    counts = {"titles": 0, "parts": 0, "sections": 0}
    title_id_by_key: dict[tuple[int, int], int] = {}  # (title_number, year) -> id
    part_id_by_key: dict[tuple[int, int], int] = {}   # (title_id, part_number) -> id
    current_title_id: int | None = None
    current_title_number: int | None = None
    current_year: int = 2024
    current_part_id: int | None = None
    current_part_number: int | None = None

    try:
        cursor = db.cursor()
        for item in parse_cfr_xml_stream(file_path):
            kind = item["type"]
            data = item["data"]
            if kind == "title":
                t = data
                current_year = t["year"]
                current_title_number = t["title_number"]
                cursor.execute(
                    """
                    INSERT INTO cfr_titles (title_number, name, subject, year, revised_date)
                    VALUES (%s, %s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE name=VALUES(name), subject=VALUES(subject), year=VALUES(year), revised_date=VALUES(revised_date)
                    """,
                    (t["title_number"], t["name"], t["subject"], t["year"], t["revised_date"]),
                )
                db.commit()
                cursor.execute("SELECT id FROM cfr_titles WHERE title_number = %s", (t["title_number"],))
                row = cursor.fetchone()
                if row:
                    current_title_id = row[0]
                    title_id_by_key[(t["title_number"], t["year"])] = current_title_id
                current_part_id = None
                counts["titles"] += 1
            elif kind == "part" and current_title_id is not None:
                p = data
                current_part_number = p["part_number"]
                cursor.execute(
                    """
                    INSERT INTO cfr_parts (title_id, part_number, name, subject, authority, source)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE name=VALUES(name), subject=VALUES(subject), authority=VALUES(authority), source=VALUES(source)
                    """,
                    (current_title_id, p["part_number"], p["name"], p["subject"], p["authority"], p["source"]),
                )
                db.commit()
                cursor.execute("SELECT id FROM cfr_parts WHERE title_id = %s AND part_number = %s", (current_title_id, p["part_number"]))
                row = cursor.fetchone()
                if row:
                    current_part_id = row[0]
                    part_id_by_key[(current_title_id, p["part_number"])] = current_part_id
                counts["parts"] += 1
            elif kind == "section" and current_part_id is not None:
                s = data
                cursor.execute(
                    """
                    INSERT INTO cfr_sections (part_id, section_number, subject, content)
                    VALUES (%s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE subject=VALUES(subject), content=VALUES(content)
                    """,
                    (current_part_id, s["section_number"], s["subject"], s["content"]),
                )
                counts["sections"] += 1
                if counts["sections"] % 500 == 0:
                    db.commit()
        db.commit()
    finally:
        db.close()

    return counts


def parse_and_load_one_file(file_info: dict[str, str], conn_id: str = CFR_MYSQL_CONN_ID) -> dict[str, Any]:
    """Wrapper for a single file: path in file_info['path'], returns counts + path."""
    path = file_info.get("path") or file_info.get("rel") or ""
    if not os.path.isabs(path):
        path = os.path.join(DATA_DIR, path)
    counts = load_cfr_file_to_mysql(path, conn_id=conn_id)
    return {"path": path, "rel": file_info.get("rel", path), **counts}
