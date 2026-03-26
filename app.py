from flask import Flask, render_template, request, jsonify
from datetime import datetime
import pandas as pd
import os
from supabase import create_client, Client

app = Flask(__name__)

# --- SUPABASE CONFIGURATION ---
# Get these from: Supabase Dashboard > Project Settings > API
SUPABASE_URL = "https://eseyswkjamgbnoetzeah.supabase.co"
SUPABASE_KEY = "sb_publishable_j0t5UqUziRZfBTUKVC3jZA_VLoYJFK6"
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

@app.route('/')
def home():
    return render_template('index.html')

# --- SMART SEARCH API (Maintains your original priority logic) ---
@app.route('/api/search_items', methods=['GET'])
def search_items():
    name = request.args.get('name', '').lower().strip()
    if not name: return jsonify([])
    
    # Fetch items containing the name
    response = supabase.table("inventory").select("*").ilike("name", f"%{name}%").execute()
    items = response.data
    
    # Maintains your original ORDER BY logic: exact matches first, then starts with, then length
    items.sort(key=lambda x: (
        x['name'].lower() != name, 
        not x['name'].lower().startswith(name), 
        len(x['name'])
    ))
    
    return jsonify(items[:10])

@app.route('/api/get_item', methods=['GET'])
def get_item():
    name = request.args.get('name', '').lower().strip()
    response = supabase.table("inventory").select("*").eq("name", name).maybe_single().execute()
    item = response.data
    
    if item:
        return jsonify({"success": True, "name": item['name'], "unit": item['unit'], "s_rate": item['s_rate'], "p_rate": item['p_rate']})
    return jsonify({"success": False})

@app.route('/api/upload_inventory', methods=['POST'])
def upload_inventory():
    file = request.files['file']
    try:
        df = pd.read_csv(file) if file.filename.endswith('.csv') else pd.read_excel(file)
        df.columns = [c.lower().strip() for c in df.columns]
        
        items_to_upsert = []
        for _, row in df.iterrows():
            u = str(row['unit']).strip().lower() if 'unit' in df.columns and pd.notna(row['unit']) else 'pcs'
            items_to_upsert.append({
                "name": str(row['name']).lower().strip(),
                "unit": u,
                "p_rate": row['p_rate'],
                "s_rate": row['s_rate'],
                "stock": row['stock']
            })
        
        # Bulk insert/replace in Supabase
        supabase.table("inventory").upsert(items_to_upsert, on_conflict="name").execute()
        return jsonify({"success": True})
    except Exception as e: 
        return jsonify({"success": False, "message": str(e)})

@app.route('/api/inventory', methods=['GET'])
def inventory_list():
    response = supabase.table("inventory").select("*").execute()
    return jsonify(response.data)

@app.route('/api/checkout', methods=['POST'])
def checkout():
    data = request.json
    dt_now = datetime.now()
    dt_str = dt_now.strftime("%Y-%m-%d %H:%M")
    
    # Maintains your original Receipt Number logic (RGVB-X format)
    last_sale = supabase.table("sales").select("id").order("id", desc=True).limit(1).execute()
    next_id = (last_sale.data[0]['id'] + 1) if last_sale.data else 1
    receipt_no = f"RGVB-{next_id}"
    
    rows_to_insert = []
    for i in data.get('cart', []):
        rows_to_insert.append({
            "customer": "Walk-in",
            "item": i['name'],
            "qty": i['qty'],
            "total": i['total'],
            "profit": i.get('profit', 0),
            "date": dt_str,
            "receipt_no": receipt_no
        })
    
    try:
        supabase.table("sales").insert(rows_to_insert).execute()
        return jsonify({
            "success": True, 
            "receipt_no": receipt_no, 
            "date": dt_now.strftime("%d %b %Y - %I:%M %p")
        })
    except Exception as e: 
        return jsonify({"success": False, "error": str(e)})

@app.route('/api/reports')
def get_reports():
    # Summing profit from all sales rows in the cloud
    response = supabase.table("sales").select("profit").execute()
    p = sum(row['profit'] for row in response.data) if response.data else 0
    return jsonify({"total_profit": round(p, 2)})

# Required for Vercel to recognize the app
app = app