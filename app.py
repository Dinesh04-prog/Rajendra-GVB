from flask import Flask, render_template, request, jsonify
from datetime import datetime
import pandas as pd
import os
from supabase import create_client, Client
import google.generativeai as genai

app = Flask(__name__)

# --- SECURE CLOUD CONFIGURATION ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
GEMINI_KEY = os.environ.get("GEMINI_API_KEY")

# Safety checks for Environment Variables
if not SUPABASE_URL or not SUPABASE_KEY:
    print("CRITICAL ERROR: Supabase Environment Variables are missing!")
else:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

if not GEMINI_KEY:
    print("CRITICAL ERROR: GEMINI_API_KEY is missing!")
else:
    genai.configure(api_key=GEMINI_KEY)
    # UPDATED: Using 'gemini-1.5-flash-latest' to resolve the 404 version error
    ai_model = genai.GenerativeModel('gemini-1.5-flash-latest')

@app.route('/')
def home():
    return render_template('index.html')

# --- SMART AI ASSISTANT ROUTE ---
@app.route('/api/assistant', methods=['POST'])
def assistant():
    user_text = request.json.get('text', '').lower().strip()
    
    # System Instructions for Gemini
    prompt = f"""
    You are the manager's assistant for 'Rajendra GVB' Grocery.
    Analyze this request: "{user_text}"
    
    Goal: Extract intent and details into JSON.
    Actions available: 
    - SEARCH: Find item to bill.
    - ADD_NEW: Create product in inventory.
    - NAVIGATE: Switch to 'billing', 'inventory', or 'reports'.
    - DELETE: Remove an item from the current bill.
    - CHECKOUT: Print and finish sale.

    Unit Conversions:
    - 'Pota' (पोटा/पोटं) = 50 qty
    - 'Chatak' (चटाक) = 0.05 qty
    - 'Pav' (पाव) = 0.25 qty
    - 'Adheli' (अधेली) = 0.5 qty

    Price Logic:
    - If user says "Santoor 142 wala", name is "santoor" and price is 142.
    
    Return ONLY RAW JSON. No markdown, no backticks, no extra text.
    {{
        "action": "ACTION_NAME",
        "name": "extracted product name",
        "price": number_or_null,
        "qty": number_or_1,
        "target": "tab_name"
    }}
    """
    try:
        response = ai_model.generate_content(prompt)
        # Ensure the response is clean JSON
        clean_json = response.text.strip().replace('```json', '').replace('```', '').replace('\n', '')
        return clean_json
    except Exception as e:
        print(f"Gemini API Error: {str(e)}")
        return jsonify({"action": "ERROR", "message": "Model connection failed. Try again."})

# --- SMART SEARCH API (With Price Filtering) ---
@app.route('/api/search_items', methods=['GET'])
def search_items():
    name = request.args.get('name', '').lower().strip()
    price_filter = request.args.get('price', None)
    
    if not name: return jsonify([])
    
    # Build query
    query = supabase.table("inventory").select("*").ilike("name", f"%{name}%")
    
    # Apply "142 wala" filter if AI detected a price
    if price_filter and price_filter != 'null':
        try:
            query = query.eq("s_rate", float(price_filter))
        except: 
            pass
        
    response = query.execute()
    items = response.data
    
    # Maintains your original ORDER BY priority ranking
    items.sort(key=lambda x: (
        x['name'].lower() != name, 
        not x['name'].lower().startswith(name), 
        len(x['name'])
    ))
    
    return jsonify(items[:10])

# --- ORIGINAL GET ITEM ---
@app.route('/api/get_item', methods=['GET'])
def get_item():
    name = request.args.get('name', '').lower().strip()
    response = supabase.table("inventory").select("*").eq("name", name).maybe_single().execute()
    item = response.data
    if item:
        return jsonify({"success": True, "name": item['name'], "unit": item['unit'], "s_rate": item['s_rate'], "p_rate": item['p_rate']})
    return jsonify({"success": False})

# --- ORIGINAL BULK UPLOAD ---
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
                "unit": u, "p_rate": row['p_rate'], "s_rate": row['s_rate'], "stock": row['stock']
            })
        supabase.table("inventory").upsert(items_to_upsert, on_conflict="name").execute()
        return jsonify({"success": True})
    except Exception as e: 
        return jsonify({"success": False, "message": str(e)})

# --- ORIGINAL INVENTORY LIST ---
@app.route('/api/inventory', methods=['GET'])
def inventory_list():
    response = supabase.table("inventory").select("*").execute()
    return jsonify(response.data)

# --- ORIGINAL CHECKOUT WITH RGVB-X LOGIC ---
@app.route('/api/checkout', methods=['POST'])
def checkout():
    data = request.json
    dt_now = datetime.now()
    dt_str = dt_now.strftime("%Y-%m-%d %H:%M")
    
    last_sale = supabase.table("sales").select("id").order("id", desc=True).limit(1).execute()
    next_id = (last_sale.data[0]['id'] + 1) if last_sale.data else 1
    receipt_no = f"RGVB-{next_id}"
    
    rows_to_insert = []
    for i in data.get('cart', []):
        rows_to_insert.append({
            "customer": "Walk-in", "item": i['name'], "qty": i['qty'],
            "total": i['total'], "profit": i.get('profit', 0),
            "date": dt_str, "receipt_no": receipt_no
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

# --- ORIGINAL REPORTS ---
@app.route('/api/reports')
def get_reports():
    response = supabase.table("sales").select("profit").execute()
    p = sum(row['profit'] for row in response.data) if response.data else 0
    return jsonify({"total_profit": round(p, 2)})

# Required for Vercel
app = app