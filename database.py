"""
database.py — dual-backend: SQLite locally, PostgreSQL (Supabase) in production.

If DATABASE_URL is set (e.g. on Vercel) → PostgreSQL.
Otherwise → SQLite file spending.db in the project folder.
"""
import os
import sqlite3
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ.get('DATABASE_URL')
USE_POSTGRES  = bool(DATABASE_URL)
SQLITE_PATH   = os.path.join(os.path.dirname(__file__), 'spending.db')

if USE_POSTGRES:
    import psycopg2
    import psycopg2.extras


# ── connection helpers ────────────────────────────────────────────────────────

def get_db():
    if USE_POSTGRES:
        return psycopg2.connect(DATABASE_URL)
    conn = sqlite3.connect(SQLITE_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _cursor(conn):
    if USE_POSTGRES:
        return conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    return conn.cursor()


# ── SQL dialect helpers ───────────────────────────────────────────────────────

PH = '%s' if USE_POSTGRES else '?'          # single placeholder


def _year_eq():
    """SQL fragment: year of date column equals placeholder."""
    return "EXTRACT(YEAR  FROM date) = %s" if USE_POSTGRES else "strftime('%Y', date) = ?"


def _month_eq():
    """SQL fragment: month of date column equals placeholder."""
    return "EXTRACT(MONTH FROM date) = %s" if USE_POSTGRES else "strftime('%m', date) = ?"


def _month_label():
    """SQL expression: 'YYYY-MM' string from date column."""
    return "TO_CHAR(date, 'YYYY-MM')" if USE_POSTGRES else "strftime('%Y-%m', date)"


def _month_arg(month: int):
    """Month value as the right type for each backend."""
    return month if USE_POSTGRES else str(month).zfill(2)


def _rows_to_dicts(cur):
    rows = cur.fetchall()
    result = []
    for row in rows:
        r = dict(row)
        # PostgreSQL returns date/datetime objects; SQLite returns strings — normalise all to strings.
        for key in ('date', 'created_at', 'synced_at'):
            if r.get(key) and hasattr(r[key], 'strftime'):
                fmt = '%Y-%m-%d' if key == 'date' else '%Y-%m-%d %H:%M:%S'
                r[key] = r[key].strftime(fmt)
        # Decimal → float
        for key in ('amount', 'available_balance', 'total'):
            if key in r and r[key] is not None:
                r[key] = float(r[key])
        result.append(r)
    return result


# ── schema ────────────────────────────────────────────────────────────────────

def init_db():
    conn = get_db()
    cur  = conn.cursor()

    if USE_POSTGRES:
        cur.execute('''
            CREATE TABLE IF NOT EXISTS transactions (
                id                  SERIAL PRIMARY KEY,
                message_id          TEXT UNIQUE,
                date                DATE NOT NULL,
                time                TEXT,
                amount              NUMERIC(12,2) NOT NULL,
                merchant            TEXT,
                raw_merchant        TEXT,
                account             TEXT,
                card                TEXT,
                available_balance   NUMERIC(14,2),
                transaction_type    TEXT DEFAULT \'purchase\',
                category            TEXT DEFAULT \'Uncategorised\',
                description         TEXT DEFAULT \'\',
                created_at          TIMESTAMPTZ DEFAULT NOW()
            )
        ''')
        cur.execute('''
            CREATE TABLE IF NOT EXISTS sync_log (
                id                   SERIAL PRIMARY KEY,
                synced_at            TIMESTAMPTZ DEFAULT NOW(),
                transactions_added   INTEGER DEFAULT 0,
                transactions_skipped INTEGER DEFAULT 0
            )
        ''')
    else:
        cur.execute('''
            CREATE TABLE IF NOT EXISTS transactions (
                id                  INTEGER PRIMARY KEY AUTOINCREMENT,
                message_id          TEXT UNIQUE,
                date                TEXT NOT NULL,
                time                TEXT,
                amount              REAL NOT NULL,
                merchant            TEXT,
                raw_merchant        TEXT,
                account             TEXT,
                card                TEXT,
                available_balance   REAL,
                transaction_type    TEXT DEFAULT 'purchase',
                category            TEXT DEFAULT 'Uncategorised',
                description         TEXT DEFAULT '',
                created_at          TEXT DEFAULT (datetime('now'))
            )
        ''')
        cur.execute('''
            CREATE TABLE IF NOT EXISTS sync_log (
                id                   INTEGER PRIMARY KEY AUTOINCREMENT,
                synced_at            TEXT DEFAULT (datetime('now')),
                transactions_added   INTEGER DEFAULT 0,
                transactions_skipped INTEGER DEFAULT 0
            )
        ''')

    conn.commit()
    cur.close()
    conn.close()


# ── queries ───────────────────────────────────────────────────────────────────

def get_all_transactions(month=None, year=None):
    conn = get_db()
    cur  = _cursor(conn)

    if month and year:
        cur.execute(
            f"""SELECT * FROM transactions
                WHERE {_year_eq()} AND {_month_eq()}
                ORDER BY date DESC, time DESC""",
            (year, _month_arg(month))
        )
    else:
        cur.execute("SELECT * FROM transactions ORDER BY date DESC, time DESC")

    rows = _rows_to_dicts(cur)
    cur.close()
    conn.close()
    return rows


def update_transaction(tx_id, category, description):
    conn = get_db()
    cur  = conn.cursor()
    cur.execute(
        f"UPDATE transactions SET category = {PH}, description = {PH} WHERE id = {PH}",
        (category, description, tx_id)
    )
    conn.commit()
    cur.close()
    conn.close()


def insert_transaction(tx: dict) -> bool:
    """Insert a transaction. Returns True if inserted, False if duplicate."""
    conn = get_db()
    cur  = conn.cursor()
    ph   = PH
    try:
        cur.execute(
            f"""INSERT INTO transactions
               (message_id, date, time, amount, merchant, raw_merchant,
                account, card, available_balance, transaction_type, category)
               VALUES ({ph},{ph},{ph},{ph},{ph},{ph},{ph},{ph},{ph},{ph},{ph})""",
            (
                tx.get('message_id'), tx['date'], tx.get('time', ''),
                tx['amount'], tx['merchant'], tx.get('raw_merchant', tx['merchant']),
                tx.get('account', ''), tx.get('card', ''),
                tx.get('available_balance'), tx.get('transaction_type', 'purchase'),
                tx.get('category', 'Uncategorised'),
            )
        )
        conn.commit()
        return True
    except (
        psycopg2.errors.UniqueViolation if USE_POSTGRES else sqlite3.IntegrityError
    ):
        if USE_POSTGRES:
            conn.rollback()
        return False
    finally:
        cur.close()
        conn.close()


def get_spending_by_category(month=None, year=None):
    conn = get_db()
    cur  = _cursor(conn)

    if month and year:
        cur.execute(
            f"""SELECT category, SUM(amount) AS total, COUNT(*) AS count
                FROM transactions
                WHERE {_year_eq()} AND {_month_eq()}
                GROUP BY category ORDER BY total DESC""",
            (year, _month_arg(month))
        )
    else:
        cur.execute(
            """SELECT category, SUM(amount) AS total, COUNT(*) AS count
               FROM transactions GROUP BY category ORDER BY total DESC"""
        )

    rows = _rows_to_dicts(cur)
    cur.close()
    conn.close()
    return rows


def get_monthly_totals():
    conn = get_db()
    cur  = _cursor(conn)
    lbl  = _month_label()
    cur.execute(
        f"""SELECT {lbl} AS month, SUM(amount) AS total, COUNT(*) AS count
            FROM transactions GROUP BY month ORDER BY month ASC"""
    )
    rows = _rows_to_dicts(cur)
    cur.close()
    conn.close()
    return rows


def get_last_sync():
    conn = get_db()
    cur  = _cursor(conn)
    cur.execute("SELECT * FROM sync_log ORDER BY synced_at DESC LIMIT 1")
    row  = cur.fetchone()
    cur.close()
    conn.close()
    if not row:
        return None
    r = dict(row)
    if r.get('synced_at') and hasattr(r['synced_at'], 'strftime'):
        r['synced_at'] = r['synced_at'].strftime('%Y-%m-%d %H:%M:%S')
    return r


def log_sync(added: int, skipped: int):
    conn = get_db()
    cur  = conn.cursor()
    cur.execute(
        f"INSERT INTO sync_log (transactions_added, transactions_skipped) VALUES ({PH},{PH})",
        (added, skipped)
    )
    conn.commit()
    cur.close()
    conn.close()
