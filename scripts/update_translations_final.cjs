const fs = require('fs');
const path = require('path');

const filesToUpdate = {
    'c:\\Users\\mahro\\Desktop\\prime-hotels-intranet-master\\src\\i18n\\locales\\en\\users.json': {
        'manager_auto_selected': 'Manager Auto-Selected',
        'manager_auto_selected_desc': '{{name}} ({{jobTitle}}) has been automatically selected as the reporting manager based on department.'
    },
    'c:\\Users\\mahro\\Desktop\\prime-hotels-intranet-master\\src\\i18n\\locales\\ar\\users.json': {
        'manager_auto_selected': 'تم اختيار المدير تلقائياً',
        'manager_auto_selected_desc': 'تم اختيار {{name}} ({{jobTitle}}) كمدير مباشر تلقائياً بناءً على القسم.'
    }
};

for (const [filePath, newKeys] of Object.entries(filesToUpdate)) {
    if (fs.existsSync(filePath)) {
        try {
            let content = fs.readFileSync(filePath, 'utf8');
            if (content.charCodeAt(0) === 0xFEFF) {
                content = content.slice(1);
            }
            const data = JSON.parse(content);
            if (data.form) {
                Object.assign(data.form, newKeys);
                fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf8');
                console.log(`Updated ${filePath}`);
            } else {
                console.error(`Error: 'form' key not found in ${filePath}`);
            }
        } catch (err) {
            console.error(`Error processing ${filePath}: ${err.message}`);
        }
    } else {
        console.error(`Error: ${filePath} not found`);
    }
}
