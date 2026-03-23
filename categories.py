CATEGORIES = [
    'Uncategorised',
    'Groceries',
    'Dining & Restaurants',
    'Fuel & Transport',
    'Health & Pharmacy',
    'Shopping & Clothing',
    'Entertainment',
    'Utilities & Bills',
    'Medical',
    'Cash Withdrawal',
    'Transfers & Payments',
    'Kids & Education',
    'Travel & Accommodation',
    'Other',
]

CATEGORY_COLORS = {
    'Uncategorised': '#adb5bd',
    'Groceries':               '#2d9c3e',
    'Dining & Restaurants':    '#fd7e14',
    'Fuel & Transport':        '#17a2b8',
    'Health & Pharmacy':       '#e83e8c',
    'Shopping & Clothing':     '#6f42c1',
    'Entertainment':           '#20c997',
    'Utilities & Bills':       '#ffc107',
    'Medical':                 '#dc3545',
    'Cash Withdrawal':         '#343a40',
    'Transfers & Payments':    '#007bff',
    'Kids & Education':        '#87ceeb',
    'Travel & Accommodation':  '#ff6b6b',
    'Other':                   '#6c757d',
}

# (keyword_in_merchant_name, category) — first match wins, case-insensitive
MERCHANT_CATEGORY_MAP = [
    # Health & Pharmacy
    ('clicks',         'Health & Pharmacy'),
    ('dischem',        'Health & Pharmacy'),
    ('dis-chem',       'Health & Pharmacy'),
    ('medirite',       'Health & Pharmacy'),
    ('pharmacy',       'Health & Pharmacy'),

    # Groceries
    ('checkers',       'Groceries'),
    ('woolworths',     'Groceries'),
    ('pick n pay',     'Groceries'),
    ('pnp',            'Groceries'),
    ('spar',           'Groceries'),
    ('food lovers',    'Groceries'),
    ('freshstop',      'Groceries'),
    ('usave',          'Groceries'),
    ('shoprite',       'Groceries'),
    ('superspar',      'Groceries'),
    ('ok foods',       'Groceries'),

    # Dining & Restaurants
    ('nandos',         'Dining & Restaurants'),
    ('nando',          'Dining & Restaurants'),
    ('kfc',            'Dining & Restaurants'),
    ('mcdonalds',      'Dining & Restaurants'),
    ('mc donald',      'Dining & Restaurants'),
    ('steers',         'Dining & Restaurants'),
    ('wimpy',          'Dining & Restaurants'),
    ('ocean basket',   'Dining & Restaurants'),
    ('spur',           'Dining & Restaurants'),
    ("roman's",        'Dining & Restaurants'),
    ('romans pizza',   'Dining & Restaurants'),
    ('debonairs',      'Dining & Restaurants'),
    ('pizza hut',      'Dining & Restaurants'),
    ('fishaways',      'Dining & Restaurants'),
    ('chicken licken', 'Dining & Restaurants'),
    ('galito',         'Dining & Restaurants'),
    ('subway',         'Dining & Restaurants'),
    ('mugg',           'Dining & Restaurants'),
    ('seattle',        'Dining & Restaurants'),
    ('starbucks',      'Dining & Restaurants'),
    ('vida e',         'Dining & Restaurants'),
    ('cappuccino',     'Dining & Restaurants'),
    ('coffee',         'Dining & Restaurants'),
    ('restaurant',     'Dining & Restaurants'),
    ('grill',          'Dining & Restaurants'),
    ('bistro',         'Dining & Restaurants'),
    ('eatery',         'Dining & Restaurants'),

    # Fuel & Transport
    ('engen',          'Fuel & Transport'),
    ('shell',          'Fuel & Transport'),
    (' bp ',           'Fuel & Transport'),
    ('sasol',          'Fuel & Transport'),
    ('caltex',         'Fuel & Transport'),
    ('astron',         'Fuel & Transport'),
    ('puma energy',    'Fuel & Transport'),
    ('uber',           'Fuel & Transport'),
    ('bolt',           'Fuel & Transport'),
    ('parking',        'Fuel & Transport'),
    ('e-toll',         'Fuel & Transport'),
    ('e toll',         'Fuel & Transport'),
    ('gautrain',       'Fuel & Transport'),
    ('metrorail',      'Fuel & Transport'),

    # Shopping & Clothing
    ('mr price',       'Shopping & Clothing'),
    ('mrp',            'Shopping & Clothing'),
    ('truworths',      'Shopping & Clothing'),
    ('foschini',       'Shopping & Clothing'),
    ('edgars',         'Shopping & Clothing'),
    ('ackermans',      'Shopping & Clothing'),
    ('jet ',           'Shopping & Clothing'),
    ('sportsmans',     'Shopping & Clothing'),
    ('sport scene',    'Shopping & Clothing'),
    ('game ',          'Shopping & Clothing'),
    ('makro',          'Shopping & Clothing'),
    ('builders',       'Shopping & Clothing'),
    ('incredible',     'Shopping & Clothing'),
    ('apple store',    'Shopping & Clothing'),
    ('amazon',         'Shopping & Clothing'),
    ('takealot',       'Shopping & Clothing'),
    ('cotton on',      'Shopping & Clothing'),
    ('zara',           'Shopping & Clothing'),
    ('h&m',            'Shopping & Clothing'),
    ('factorie',       'Shopping & Clothing'),
    ('typo',           'Shopping & Clothing'),
    ('exact',          'Shopping & Clothing'),

    # Entertainment
    ('netflix',        'Entertainment'),
    ('showmax',        'Entertainment'),
    ('dstv',           'Entertainment'),
    ('spotify',        'Entertainment'),
    ('steam',          'Entertainment'),
    ('ster-kinekor',   'Entertainment'),
    ('sterki',         'Entertainment'),
    ('numetro',        'Entertainment'),
    ('nu metro',       'Entertainment'),
    ('playstation',    'Entertainment'),
    ('xbox',           'Entertainment'),
    ('apple music',    'Entertainment'),
    ('apple tv',       'Entertainment'),
    ('youtube',        'Entertainment'),
    ('cinema',         'Entertainment'),

    # Utilities & Bills
    ('vodacom',        'Utilities & Bills'),
    ('mtn ',           'Utilities & Bills'),
    ('telkom',         'Utilities & Bills'),
    ('cell c',         'Utilities & Bills'),
    ('rain ',          'Utilities & Bills'),
    ('municipality',   'Utilities & Bills'),
    ('eskom',          'Utilities & Bills'),
    ('city power',     'Utilities & Bills'),
    ('nedbank',        'Utilities & Bills'),
    ('fnb insurance',  'Utilities & Bills'),

    # Medical
    ('hospital',       'Medical'),
    ('clinic',         'Medical'),
    (' dr ',           'Medical'),
    ('dentist',        'Medical'),
    ('optom',          'Medical'),
    ('physiother',     'Medical'),
    ('specialist',     'Medical'),
    ('medicross',      'Medical'),
    ('netcare',        'Medical'),
    ('life health',    'Medical'),

    # Kids & Education
    ('school',         'Kids & Education'),
    ('nursery',        'Kids & Education'),
    ('creche',         'Kids & Education'),
    ('crèche',         'Kids & Education'),
    ('stationery',     'Kids & Education'),
    ('exclusive books','Kids & Education'),

    # Travel & Accommodation
    ('hotel',          'Travel & Accommodation'),
    ('airbnb',         'Travel & Accommodation'),
    ('kulula',         'Travel & Accommodation'),
    ('flysafair',      'Travel & Accommodation'),
    ('comair',         'Travel & Accommodation'),
    ('airlink',        'Travel & Accommodation'),
    ('safair',         'Travel & Accommodation'),

    # Cash Withdrawal
    ('atm',            'Cash Withdrawal'),
    ('cash withdrawal','Cash Withdrawal'),
    ('withdrawal',     'Cash Withdrawal'),
]


def auto_categorise(merchant: str) -> str:
    """Return best-guess category for a merchant name."""
    m = merchant.lower()
    for keyword, category in MERCHANT_CATEGORY_MAP:
        if keyword.lower() in m:
            return category
    return 'Uncategorised'
