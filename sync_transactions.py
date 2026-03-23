"""
sync_transactions.py
--------------------
Sends transactions from 'transactions_to_import.json' to the live app's /api/sync endpoint.

Claude writes that JSON file when you ask it to sync your FNB Gmail notifications,
then runs this script automatically. You do not need to edit or run this yourself.

Required environment variables (in .env):
  APP_URL       — e.g. https://your-app.vercel.app
  SYNC_API_KEY  — secret key matching what's set in Vercel environment variables
"""
import json
import os
import sys
import requests
from dotenv import load_dotenv

load_dotenv()

IMPORT_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'transactions_to_import.json')
APP_URL      = os.environ.get('APP_URL', 'http://localhost:5000')
SYNC_API_KEY = os.environ.get('SYNC_API_KEY', '')


def sync():
    if not os.path.exists(IMPORT_FILE):
        print("Nothing to import (transactions_to_import.json not found).")
        return 0, 0

    with open(IMPORT_FILE, 'r', encoding='utf-8') as f:
        transactions = json.load(f)

    print(f"Sending {len(transactions)} transaction(s) to {APP_URL}/api/sync ...")

    resp = requests.post(
        f'{APP_URL}/api/sync',
        json={'transactions': transactions},
        headers={'X-API-Key': SYNC_API_KEY},
        timeout=30,
    )

    if resp.status_code == 401:
        print("ERROR: Invalid API key. Check SYNC_API_KEY in your .env file.")
        return 0, 0
    if not resp.ok:
        print(f"ERROR: Server returned {resp.status_code}: {resp.text}")
        return 0, 0

    result = resp.json()
    added   = result.get('added', 0)
    skipped = result.get('skipped', 0)

    os.remove(IMPORT_FILE)
    print(f"Done — {added} new transaction(s) added, {skipped} already in database.")
    return added, skipped


if __name__ == '__main__':
    sync()
