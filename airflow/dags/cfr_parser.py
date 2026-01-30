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

# Official CFR Title Names (inline to avoid import issues)
CFR_TITLE_NAMES = {
    1: "General Provisions",
    2: "Grants and Agreements",
    3: "The President",
    4: "Accounts",
    5: "Administrative Personnel",
    6: "Domestic Security",
    7: "Agriculture",
    8: "Aliens and Nationality",
    9: "Animals and Animal Products",
    10: "Energy",
    11: "Federal Elections",
    12: "Banks and Banking",
    13: "Business Credit and Assistance",
    14: "Aeronautics and Space",
    15: "Commerce and Foreign Trade",
    16: "Commercial Practices",
    17: "Commodity and Securities Exchanges",
    18: "Conservation of Power and Water Resources",
    19: "Customs Duties",
    20: "Employees' Benefits",
    21: "Food and Drugs",
    22: "Foreign Relations",
    23: "Highways",
    24: "Housing and Urban Development",
    25: "Indians",
    26: "Internal Revenue",
    27: "Alcohol, Tobacco Products and Firearms",
    28: "Judicial Administration",
    29: "Labor",
    30: "Mineral Resources",
    31: "Money and Finance: Treasury",
    32: "National Defense",
    33: "Navigation and Navigable Waters",
    34: "Education",
    35: "Panama Canal",
    36: "Parks, Forests, and Public Property",
    37: "Patents, Trademarks, and Copyrights",
    38: "Pensions, Bonuses, and Veterans' Relief",
    39: "Postal Service",
    40: "Protection of Environment",
    41: "Public Contracts and Property Management",
    42: "Public Health",
    43: "Public Lands: Interior",
    44: "Emergency Management and Assistance",
    45: "Public Welfare",
    46: "Shipping",
    47: "Telecommunication",
    48: "Federal Acquisition Regulations System",
    49: "Transportation",
    50: "Wildlife and Fisheries",
}

def get_title_name(title_number: int) -> str:
    """Get the official CFR title name."""
    return CFR_TITLE_NAMES.get(title_number, f"Title {title_number}")


def _batch_insert_sections(cursor, sections: list[tuple]) -> None:
    """Batch insert sections for much faster performance."""
    if not sections:
        return
    # Build multi-value INSERT
    placeholders = ", ".join(["(%s, %s, %s, %s)"] * len(sections))
    flat_values = []
    for s in sections:
        flat_values.extend(s)
    cursor.execute(
        f"""
        INSERT INTO cfr_sections (part_id, section_number, subject, content)
        VALUES {placeholders}
        ON DUPLICATE KEY UPDATE subject=VALUES(subject), content=VALUES(content)
        """,
        flat_values,
    )


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
    Stream-parse one CFR XML file (GPO format). Yields dicts for title, parts, sections.
    Handles both eCFR format and GPO XML format.
    """
    if not os.path.isfile(file_path):
        return
    
    # Extract title number and year from filename
    # Format: CFR-1996-title42-vol2.xml
    filename = os.path.basename(file_path)
    title_match = re.search(r'title(\d+)', filename, re.IGNORECASE)
    year_match = re.search(r'\b(19|20)\d{2}\b', file_path)
    
    title_number = int(title_match.group(1)) if title_match else None
    year = int(year_match.group(0)) if year_match else 2024
    
    # Yield title info from filename (GPO files don't have explicit TITLE tag)
    if title_number:
        title_name = get_title_name(title_number)
        yield {
            "type": "title",
            "data": {
                "title_number": title_number,
                "name": title_name,
                "subject": title_name,  # Use title name as subject
                "year": year,
                "revised_date": None,
            }
        }
    
    # Parse with specific tags we care about
    context = etree.iterparse(file_path, events=("end",), tag=("PART", "SECTION"))
    
    for _event, elem in context:
        tag = elem.tag.upper() if hasattr(elem.tag, "upper") else str(elem.tag or "")
        
        # Parse PART tags (GPO format) - process BEFORE clearing
        if tag == "PART":
            # Get first direct child HD tag
            for child in elem:
                if child.tag == "HD":
                    hd_text = _text(child)
                    # Extract part number from HD text
                    part_match = re.search(r'PART\s+(\d+)', hd_text, re.IGNORECASE)
                    if part_match:
                        part_number = int(part_match.group(1))
                        # Get name (everything after the part number)
                        name_match = re.search(r'PART\s+\d+[—\-\s]+(.+)', hd_text, re.IGNORECASE)
                        part_name = name_match.group(1).strip() if name_match else hd_text
                        
                        # Get authority if present
                        auth_elem = None
                        for auth_child in elem:
                            if auth_child.tag == "AUTH":
                                auth_elem = auth_child
                                break
                        authority = _norm_ws(_text(auth_elem)) if auth_elem is not None else None
                        
                        yield {
                            "type": "part",
                            "data": {
                                "part_number": part_number,
                                "name": _norm_ws(part_name) or f"Part {part_number}",
                                "subject": None,
                                "authority": authority,
                                "source": None,
                            }
                        }
                    break  # Only process first HD
        
        # Parse SECTION tags (GPO format) - process BEFORE clearing
        elif tag == "SECTION":
            section_number = None
            subject = ""
            content_parts = []
            
            # Iterate through direct children
            for child in elem:
                if child.tag == "SECTNO":
                    section_number = _text(child).strip()
                elif child.tag == "SUBJECT":
                    subject = _text(child).strip()
                elif child.tag == "P":
                    p_text = _text(child).strip()
                    if p_text:
                        content_parts.append(p_text)
            
            content = " ".join(content_parts)
            
            if section_number and (subject or content):
                yield {
                    "type": "section",
                    "data": {
                        "section_number": str(section_number)[:50],
                        "subject": _norm_ws(subject, 8192) or "(no subject)",
                        "content": _norm_ws(content, 65535) or "",
                    }
                }
        
        # Clean up to save memory
        elem.clear()
        while elem.getprevious() is not None:
            try:
                del elem.getparent()[0]
            except Exception:
                break


def load_cfr_file_to_mysql(file_path: str, conn_id: str = CFR_MYSQL_CONN_ID, max_retries: int = 10) -> dict[str, int]:
    """
    Parse one CFR XML file and upsert into MySQL (cfr_titles, cfr_parts, cfr_sections).
    Uses Airflow Hook; run from a task that has access to Airflow connections.
    Returns {"titles": n, "parts": n, "sections": n}.
    Includes retry logic for deadlocks.
    """
    from airflow.hooks.base import BaseHook
    import pymysql
    import time
    import random

    conn = BaseHook.get_connection(conn_id)
    # BaseHook.get_connection returns host, port, login, password, schema
    host = conn.host or "mysql"
    port = int(conn.port or 3306)
    user = conn.login or "app"
    password = conn.password or "app"
    database = conn.schema or "cfr_platform"

    # Retry loop for deadlock handling
    for attempt in range(max_retries):
        try:
            return _load_cfr_file_to_mysql_inner(
                file_path, host, port, user, password, database
            )
        except pymysql.err.OperationalError as e:
            if e.args[0] == 1213:  # Deadlock error code
                if attempt < max_retries - 1:
                    # Exponential backoff with jitter
                    wait_time = (2 ** attempt) + random.uniform(0, 1)
                    time.sleep(wait_time)
                    continue
            raise
    return {"titles": 0, "parts": 0, "sections": 0}


def _load_cfr_file_to_mysql_inner(file_path: str, host: str, port: int, user: str, password: str, database: str) -> dict[str, int]:
    """Inner function for MySQL loading - uses batch inserts for speed."""
    import pymysql
    
    db = pymysql.connect(host=host, port=port, user=user, password=password, database=database)
    counts = {"titles": 0, "parts": 0, "sections": 0}
    current_title_id: int | None = None
    current_part_id: int | None = None
    
    # Batch storage for sections
    section_batch: list[tuple] = []
    BATCH_SIZE = 300  # Larger batches = fewer round-trips to MySQL

    try:
        cursor = db.cursor()
        
        for item in parse_cfr_xml_stream(file_path):
            kind = item["type"]
            data = item["data"]
            
            if kind == "title":
                # Flush any pending sections before changing title
                if section_batch:
                    _batch_insert_sections(cursor, section_batch)
                    db.commit()
                    section_batch = []
                
                t = data
                cursor.execute(
                    """
                    INSERT INTO cfr_titles (title_number, name, subject, year, revised_date)
                    VALUES (%s, %s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE name=VALUES(name), subject=VALUES(subject), year=VALUES(year), revised_date=VALUES(revised_date)
                    """,
                    (t["title_number"], t["name"], t["subject"], t["year"], t["revised_date"]),
                )
                db.commit()
                cursor.execute("SELECT id FROM cfr_titles WHERE title_number = %s AND year = %s", (t["title_number"], t["year"]))
                row = cursor.fetchone()
                if row:
                    current_title_id = row[0]
                current_part_id = None
                counts["titles"] += 1
                
            elif kind == "part" and current_title_id is not None:
                # Flush any pending sections before changing part
                if section_batch:
                    _batch_insert_sections(cursor, section_batch)
                    db.commit()
                    section_batch = []
                
                p = data
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
                counts["parts"] += 1
                
            elif kind == "section" and current_part_id is not None:
                s = data
                section_batch.append((current_part_id, s["section_number"], s["subject"], s["content"]))
                counts["sections"] += 1
                
                # Batch insert when we have enough
                if len(section_batch) >= BATCH_SIZE:
                    _batch_insert_sections(cursor, section_batch)
                    db.commit()
                    section_batch = []
        
        # Final flush of remaining sections
        if section_batch:
            _batch_insert_sections(cursor, section_batch)
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
