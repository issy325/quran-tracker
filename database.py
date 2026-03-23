import os
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is not set. "
                       "Copy .env.example to .env and fill in your Supabase connection string.")


def get_db():
    return psycopg2.connect(DATABASE_URL)


def init_db():
    conn = get_db()
    cur = conn.cursor()
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
            transaction_type    TEXT DEFAULT 'purchase',
            category            TEXT DEFAULT 'Uncategorised',
            description         TEXT DEFAULT '',
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
    conn.commit()
    cur.close()
    conn.close()


def _rows_to_dicts(cur):
    rows = cur.fetchall()
    result = []
    for row in rows:
        r = dict(row)
        if r.get('date'):
            r['date'] = r['date'].strftime('%Y-%m-%d')
        if r.get('created_at'):
            r['created_at'] = r['created_at'].strftime('%Y-%m-%d %H:%M:%S')
        # Convert Decimal to float for JSON serialisation
        for k in ('amount', 'available_balance', 'total'):
            if k in r and r[k] is not None:
                r[k] = float(r[k])
        result.append(r)
    return result


def get_all_transactions(month=None, year=None):
    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    if month and year:
        cur.execute(
            """SELECT * FROM transactions
               WHERE EXTRACT(YEAR  FROM date) = %s
                 AND EXTRACT(MONTH FROM date) = %s
               ORDER BY date DESC, time DESC""",
            (year, month)
        )
    else:
        cur.execute("SELECT * FROM transactions ORDER BY date DESC, time DESC")
    rows = _rows_to_dicts(cur)
    cur.close()
    conn.close()
    return rows


def update_transaction(tx_id, category, description):
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "UPDATE transactions SET category = %s, description = %s WHERE id = %s",
        (category, description, tx_id)
    )
    conn.commit()
    cur.close()
    conn.close()


def insert_transaction(tx: dict) -> bool:
    """Insert a transaction. Returns True if inserted, False if duplicate."""
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(
            """INSERT INTO transactions
               (message_id, date, time, amount, merchant, raw_merchant,
                account, card, available_balance, transaction_type, category)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
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
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        return False
    finally:
        cur.close()
        conn.close()


def get_spending_by_category(month=None, year=None):
    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    if month and year:
        cur.execute(
            """SELECT category, SUM(amount) AS total, COUNT(*) AS count
               FROM transactions
               WHERE EXTRACT(YEAR  FROM date) = %s
                 AND EXTRACT(MONTH FROM date) = %s
               GROUP BY category ORDER BY total DESC""",
            (year, month)
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
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(
        """SELECT TO_CHAR(date, 'YYYY-MM') AS month,
                  SUM(amount) AS total, COUNT(*) AS count
           FROM transactions GROUP BY month ORDER BY month ASC"""
    )
    rows = _rows_to_dicts(cur)
    cur.close()
    conn.close()
    return rows


def get_last_sync():
    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("SELECT * FROM sync_log ORDER BY synced_at DESC LIMIT 1")
    row = cur.fetchone()
    cur.close()
    conn.close()
    if row:
        r = dict(row)
        if r.get('synced_at'):
            r['synced_at'] = r['synced_at'].strftime('%Y-%m-%d %H:%M:%S')
        return r
    return None


def log_sync(added: int, skipped: int):
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO sync_log (transactions_added, transactions_skipped) VALUES (%s, %s)",
        (added, skipped)
    )
    conn.commit()
    cur.close()
    conn.close()
