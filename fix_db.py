import sqlite3

conn = sqlite3.connect("rajendra_gruh_vastu.db")
try:
    conn.execute("ALTER TABLE inventory ADD COLUMN unit TEXT DEFAULT 'pcs'")
    print("Success: Unit column added!")
except Exception as e:
    print(f"Note: {e}") # Likely means column already exists
finally:
    conn.close()