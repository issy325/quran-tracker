"""
migrate_to_cloud.py
-------------------
One-time script: reads your local spending.db (SQLite) and pushes all
transactions to the cloud database via the /api/sync endpoint.

Run AFTER you have set up Supabase + Vercel and updated your .env file:
  python migrate_to_cloud.py
"""
import json
import os
import sqlite3
import requests
from dotenv import load_dotenv

load_dotenv()

APP_URL      = os.environ.get('APP_URL', 'http://localhost:5000')
SYNC_API_KEY = os.environ.get('SYNC_API_KEY', '')
DB_PATH      = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'spending.db')


def migrate():
    if not os.path.exists(DB_PATH):
        print("spending.db not found — nothing to migrate.")
        return

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute("SELECT * FROM transactions ORDER BY date ASC").fetchall()
    conn.close()

    transactions = []
    for row in rows:
        tx = dict(row)
        # Keep category and description so your edits are preserved
        transactions.append({
            'message_id':        tx.get('message_id'),
            'date':              tx.get('date'),
            'time':              tx.get('time', ''),
            'amount':            tx.get('amount'),
            'merchant':          tx.get('merchant', ''),
            'raw_merchant':      tx.get('raw_merchant', tx.get('merchant', '')),
            'account':           tx.get('account', ''),
            'card':              tx.get('card', ''),
            'available_balance': tx.get('available_balance'),
            'transaction_type':  tx.get('transaction_type', 'purchase'),
            'category':          tx.get('category', 'Uncategorised'),
            'description':       tx.get('description', ''),
        })

    print(f"Found {len(transactions)} transactions in spending.db")
    print(f"Sending to {APP_URL}/api/sync ...")

    resp = requests.post(
        f'{APP_URL}/api/sync',
        json={'transactions': transactions},
        headers={'X-API-Key': SYNC_API_KEY},
        timeout=60,
    )

    if resp.status_code == 401:
        print("ERROR: Invalid API key. Check SYNC_API_KEY in your .env file.")
        return
    if not resp.ok:
        print(f"ERROR: {resp.status_code} — {resp.text}")
        return

    result = resp.json()
    print(f"Migration complete: {result['added']} added, {result['skipped']} already existed.")


if __name__ == '__main__':
    migrate()
