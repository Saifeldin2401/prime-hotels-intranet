import json
import os

files_to_update = {
    r"c:\Users\mahro\Desktop\prime-hotels-intranet-master\src\i18n\locales\en\users.json": {
        "manager_auto_selected": "Manager Auto-Selected",
        "manager_auto_selected_desc": "{{name}} ({{jobTitle}}) has been automatically selected as the reporting manager based on department."
    },
    r"c:\Users\mahro\Desktop\prime-hotels-intranet-master\src\i18n\locales\ar\users.json": {
        "manager_auto_selected": "تم اختيار المدير تلقائياً",
        "manager_auto_selected_desc": "تم اختيار {{name}} ({{jobTitle}}) كمدير مباشر تلقائياً بناءً على القسم."
    }
}

for file_path, new_keys in files_to_update.items():
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if 'form' in data:
            data['form'].update(new_keys)
            
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=4, ensure_ascii=False)
            print(f"Updated {file_path}")
        else:
            print(f"Error: 'form' key not found in {file_path}")
    else:
        print(f"Error: {file_path} not found")
