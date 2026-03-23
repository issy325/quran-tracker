import os
from flask import Flask, render_template, request, jsonify
from database import (
    init_db, get_all_transactions, update_transaction,
    get_spending_by_category, get_monthly_totals, get_last_sync,
    insert_transaction, log_sync,
    get_custom_categories, add_custom_category, delete_custom_category,
)
from categories import CATEGORIES, CATEGORY_COLORS
from datetime import datetime

app = Flask(__name__)
init_db()


# ── helpers ──────────────────────────────────────────────────────────────────

def merged_categories():
    """Hardcoded categories + any user-created custom ones."""
    cats   = list(CATEGORIES)
    colors = dict(CATEGORY_COLORS)
    for c in get_custom_categories():
        if c['name'] not in cats:
            cats.append(c['name'])
        colors[c['name']] = c['color']
    return cats, colors


def _prev_month(year, month):
    return (year - 1, 12) if month == 1 else (year, month - 1)

def _next_month(year, month):
    return (year + 1, 1) if month == 12 else (year, month + 1)


# ── routes ───────────────────────────────────────────────────────────────────

@app.route('/')
def dashboard():
    now = datetime.now()
    month = request.args.get('month', now.month, type=int)
    year  = request.args.get('year',  now.year,  type=int)

    categories, category_colors = merged_categories()

    transactions    = get_all_transactions(month=month, year=year)
    category_totals = get_spending_by_category(month=month, year=year)
    monthly_totals  = get_monthly_totals()
    last_sync       = get_last_sync()

    # Add colour to each category row for easy Jinja access
    for row in category_totals:
        row['color'] = CATEGORY_COLORS.get(row['category'], '#adb5bd')

    total_spent = sum(t['amount'] for t in transactions)

    # Latest available balance from most-recent transaction overall
    all_tx = get_all_transactions()
    latest_balance = all_tx[0]['available_balance'] if all_tx else None

    is_current = (year == now.year and month == now.month)
    prev_y, prev_m = _prev_month(year, month)
    next_y, next_m = _next_month(year, month)

    # Chart data (serialised in Python to keep templates simple)
    chart_cat = {
        'labels': [r['category'] for r in category_totals],
        'data':   [round(r['total'], 2) for r in category_totals],
        'colors': [r['color'] for r in category_totals],
    }
    chart_monthly = {
        'labels': [r['month'] for r in monthly_totals],
        'data':   [round(r['total'], 2) for r in monthly_totals],
    }

    return render_template('dashboard.html',
        transactions    = transactions[:10],
        category_totals = category_totals,
        total_spent     = total_spent,
        latest_balance  = latest_balance,
        tx_count        = len(transactions),
        month           = month,
        year            = year,
        month_name      = datetime(year, month, 1).strftime('%B %Y'),
        prev             = (prev_y, prev_m),
        nxt              = None if is_current else (next_y, next_m),
        last_sync        = last_sync,
        chart_cat        = chart_cat,
        chart_monthly    = chart_monthly,
        categories       = categories,
        category_colors  = category_colors,
    )


@app.route('/transactions')
def transactions_page():
    now = datetime.now()
    month           = request.args.get('month', type=int)
    year            = request.args.get('year',  now.year, type=int)
    category_filter = request.args.get('category', '')
    search          = request.args.get('search', '').strip()

    categories, category_colors = merged_categories()
    all_tx = get_all_transactions(month=month, year=year) if month else get_all_transactions()

    if category_filter:
        all_tx = [t for t in all_tx if t['category'] == category_filter]

    if search:
        s = search.lower()
        all_tx = [t for t in all_tx
                  if s in t['merchant'].lower()
                  or s in (t['description'] or '').lower()]

    total = sum(t['amount'] for t in all_tx)

    return render_template('transactions.html',
        transactions    = all_tx,
        categories      = categories,
        category_colors = category_colors,
        category_filter = category_filter,
        month           = month,
        year            = year,
        search          = search,
        total           = total,
    )


@app.route('/api/update/<int:tx_id>', methods=['POST'])
def api_update(tx_id):
    data = request.get_json()
    update_transaction(tx_id,
                       data.get('category', 'Uncategorised'),
                       data.get('description', ''))
    return jsonify({'ok': True})


@app.route('/api/categories', methods=['GET'])
def api_list_categories():
    return jsonify(get_custom_categories())


@app.route('/api/categories', methods=['POST'])
def api_add_category():
    data  = request.get_json() or {}
    name  = (data.get('name') or '').strip()
    color = data.get('color', '#6c757d')
    if not name:
        return jsonify({'error': 'Name is required'}), 400
    if name in CATEGORIES:
        return jsonify({'error': 'That category already exists'}), 409
    if not add_custom_category(name, color):
        return jsonify({'error': 'A category with that name already exists'}), 409
    return jsonify({'name': name, 'color': color}), 201


@app.route('/api/categories/<path:name>', methods=['DELETE'])
def api_delete_category(name):
    if name in CATEGORIES:
        return jsonify({'error': 'Built-in categories cannot be deleted'}), 400
    delete_custom_category(name)
    return jsonify({'ok': True})


@app.route('/api/sync', methods=['POST'])
def api_sync():
    """Receives parsed FNB transactions from Claude and inserts them into the database."""
    key = request.headers.get('X-API-Key', '')
    expected = os.environ.get('SYNC_API_KEY', '')
    if not expected or key != expected:
        return jsonify({'error': 'Unauthorised'}), 401

    data = request.get_json()
    if not data or 'transactions' not in data:
        return jsonify({'error': 'No transactions provided'}), 400

    added = skipped = 0
    for tx in data['transactions']:
        if insert_transaction(tx):
            added += 1
        else:
            skipped += 1

    if added > 0:
        log_sync(added, skipped)

    return jsonify({'added': added, 'skipped': skipped})


# ── entry point ───────────────────────────────────────────────────────────────

if __name__ == '__main__':
    print()
    print('=' * 50)
    print('  My Spending Tracker')
    print('=' * 50)
    print()
    print('  Open your browser and go to:')
    print('  http://localhost:5000')
    print()
    print('  Press Ctrl+C to stop.')
    print()
    app.run(debug=False, host='127.0.0.1', port=5000)
