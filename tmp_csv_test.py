import pandas as pd
from pathlib import Path
from io import BytesIO
path = Path(r'c:\Users\dines\Downloads\python project\products.csv')
content = path.read_bytes()
print('content starts', content[:4])
try:
    if content[:2] == b'PK':
        df = pd.read_excel(BytesIO(content))
    else:
        raise ValueError('not zip')
    print('OK', df.shape, list(df.columns)[:10])
    print(df.head(3).to_dict(orient='records'))
except Exception as e:
    print('failed', type(e).__name__, e)
