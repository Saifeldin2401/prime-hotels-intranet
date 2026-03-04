
import json

def find_duplicates(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Simple regex based duplicate key finder for JSON (rudimentary)
    import re
    keys = re.findall(r'"([^"]+)"\s*:', content)
    
    seen = {}
    dupes = []
    for k in keys:
        if k in seen:
            dupes.append(k)
        seen[k] = seen.get(k, 0) + 1
    
    print(f"Duplicates in {file_path}:")
    for d in sorted(set(dupes)):
        if seen[d] > 1:
            print(f"  {d}: {seen[d]} times")

find_duplicates('c:/Users/mahro/Desktop/prime-hotels-intranet-master/src/i18n/locales/en/common.json')
find_duplicates('c:/Users/mahro/Desktop/prime-hotels-intranet-master/src/i18n/locales/ar/common.json')
