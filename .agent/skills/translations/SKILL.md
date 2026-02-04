---
name: Translations & i18n
description: Guidelines for adding and managing bilingual (English/Arabic) translations in PRIME Hotels
---

# Translations & i18n Skill

## Overview
PRIME Hotels Intranet is a bilingual application serving users in the Kingdom of Saudi Arabia. **All user-facing content MUST be available in both English and Arabic.**

## i18n Architecture

### Configuration
The i18n system is configured in `src/i18n/i18n.ts` using:
- **i18next** - Core translation library
- **react-i18next** - React bindings
- **i18next-browser-languagedetector** - Auto-detect user language

### Translation Files Location
```
src/i18n/locales/
├── en/                    # English translations
│   ├── common.json        # Shared UI elements
│   ├── auth.json          # Authentication
│   ├── dashboard.json     # Dashboard
│   ├── knowledge.json     # Knowledge base
│   ├── training.json      # Training modules
│   ├── tasks.json         # Task management
│   ├── maintenance.json   # Maintenance tickets
│   ├── hr.json            # HR functions
│   ├── admin.json         # Admin panel
│   └── ... (26 files)
└── ar/                    # Arabic translations
    ├── common.json
    ├── auth.json
    └── ... (matching files)
```

## Namespaces

| Namespace | Purpose | Example Keys |
|-----------|---------|--------------|
| `common` | Shared UI, actions, navigation | `actions.save`, `status.active` |
| `auth` | Login, registration, password | `login.title`, `errors.invalidEmail` |
| `dashboard` | Dashboard widgets, stats | `welcome`, `stats.tasks` |
| `knowledge` | Knowledge base articles | `articles.title`, `categories.sop` |
| `training` | Training modules, progress | `modules.title`, `progress.completed` |
| `tasks` | Task management | `status.todo`, `priority.high` |
| `maintenance` | Maintenance tickets | `categories.plumbing`, `status.resolved` |
| `hr` | HR functions, leave, payroll | `leave.annual`, `payroll.salary` |
| `admin` | Admin functions | `users.manage`, `settings.general` |
| `nav` | Navigation labels | `sidebar.dashboard`, `sidebar.tasks` |
| `announcements` | Announcements | `priority.urgent`, `actions.publish` |
| `approvals` | Approval workflows | `status.pending`, `actions.approve` |
| `directory` | Employee directory | `filters.department`, `card.email` |
| `documents` | Document management | `upload.title`, `versions.compare` |
| `jobs` | Job postings | `posting.title`, `application.status` |
| `messages` | Messaging system | `compose.to`, `inbox.empty` |
| `onboarding` | Employee onboarding | `steps.welcome`, `progress.percentage` |
| `profile` | User profile | `tabs.personal`, `fields.phone` |
| `public` | Public pages | `welcome.title`, `about.description` |
| `settings` | User settings | `language.select`, `theme.dark` |
| `users` | User management | `roles.admin`, `status.inactive` |
| `analytics` | Analytics dashboard | `metrics.views`, `charts.timeline` |
| `ai_tools` | AI features | `assistant.title`, `suggestions.loading` |

## Adding New Translations

### Step 1: Identify the Namespace
Choose the most appropriate namespace for your content. If none fit, add to `common` or create a new namespace.

### Step 2: Add English Translation
Edit `src/i18n/locales/en/{namespace}.json`:

```json
{
  "existingKeys": "...",
  "myFeature": {
    "title": "Feature Title",
    "description": "This is a description of the feature.",
    "actions": {
      "save": "Save Changes",
      "cancel": "Cancel"
    },
    "messages": {
      "success": "Operation completed successfully",
      "error": "An error occurred"
    }
  }
}
```

### Step 3: Add Arabic Translation
Edit `src/i18n/locales/ar/{namespace}.json`:

```json
{
  "existingKeys": "...",
  "myFeature": {
    "title": "عنوان الميزة",
    "description": "هذا وصف للميزة.",
    "actions": {
      "save": "حفظ التغييرات",
      "cancel": "إلغاء"
    },
    "messages": {
      "success": "تمت العملية بنجاح",
      "error": "حدث خطأ"
    }
  }
}
```

### Step 4: Use in Component
```tsx
import { useTranslation } from 'react-i18next';

function MyFeature() {
  const { t } = useTranslation('namespace');
  
  return (
    <div>
      <h1>{t('myFeature.title')}</h1>
      <p>{t('myFeature.description')}</p>
      <button>{t('myFeature.actions.save')}</button>
    </div>
  );
}
```

## Translation Patterns

### Interpolation (Dynamic Values)
```json
// en/common.json
{
  "welcome": "Welcome, {{name}}!",
  "itemCount": "You have {{count}} items"
}
```

```tsx
t('welcome', { name: user.full_name })
t('itemCount', { count: items.length })
```

### Pluralization
```json
// en/tasks.json
{
  "taskCount_one": "{{count}} task",
  "taskCount_other": "{{count}} tasks"
}
```

```tsx
t('taskCount', { count: taskCount })
```

### Nested Access
```tsx
// Access deeply nested keys
t('myFeature.actions.save')
t('myFeature.messages.success')
```

### Multiple Namespaces
```tsx
const { t } = useTranslation(['common', 'knowledge']);

// Use prefix for non-default namespace
t('common:actions.save')
t('knowledge:articles.title')
```

## Arabic Translation Guidelines

### Text Quality
- Use **Modern Standard Arabic (MSA)** - فصحى
- Avoid colloquial/dialect terms
- Maintain professional, formal tone
- Keep translations concise but complete

### Common Terms
| English | Arabic |
|---------|--------|
| Save | حفظ |
| Cancel | إلغاء |
| Delete | حذف |
| Edit | تعديل |
| Create | إنشاء |
| Submit | إرسال |
| Approve | موافقة |
| Reject | رفض |
| Search | بحث |
| Filter | تصفية |
| Loading | جاري التحميل |
| Error | خطأ |
| Success | نجاح |
| Settings | إعدادات |
| Profile | الملف الشخصي |
| Dashboard | لوحة التحكم |
| Notifications | الإشعارات |
| Tasks | المهام |
| Documents | المستندات |
| Training | التدريب |

### Date & Time Formatting
- Support both Gregorian and Hijri calendars
- Use locale-aware date formatting

```tsx
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

// For Arabic
format(date, 'PPP', { locale: ar })
```

## Adding a New Namespace

### Step 1: Create Files
Create both language files:
- `src/i18n/locales/en/newnamespace.json`
- `src/i18n/locales/ar/newnamespace.json`

### Step 2: Update i18n Config
Edit `src/i18n/i18n.ts`:

```typescript
// Add imports
import enNewNamespace from './locales/en/newnamespace.json';
import arNewNamespace from './locales/ar/newnamespace.json';

// Add to resources
const resources = {
  en: {
    // ... existing
    newnamespace: enNewNamespace,
  },
  ar: {
    // ... existing
    newnamespace: arNewNamespace,
  },
};
```

## RTL Direction Handling

The i18n system automatically handles RTL direction:

```typescript
// In src/i18n/i18n.ts
i18n.on('languageChanged', (lng) => {
  const direction = lng === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.dir = direction;
  document.documentElement.lang = lng;
});
```

## Validation Checklist

Before committing translation changes:

- [ ] Key exists in BOTH `en` and `ar` files
- [ ] JSON syntax is valid (no trailing commas)
- [ ] Arabic text is properly formatted
- [ ] Interpolation variables match in both languages
- [ ] No hardcoded English text in components
- [ ] Test in both English and Arabic modes
- [ ] RTL layout displays correctly

## Common Mistakes to Avoid

### ❌ Hardcoding Text
```tsx
// Wrong
<button>Save</button>

// Correct
<button>{t('actions.save')}</button>
```

### ❌ Missing Arabic Translation
```json
// en/common.json
{ "newKey": "New Feature" }

// ar/common.json - MISSING! Must add:
{ "newKey": "ميزة جديدة" }
```

### ❌ Inconsistent Key Structure
```json
// en - nested
{ "user": { "name": "Name" } }

// ar - flat (WRONG!)
{ "userName": "الاسم" }

// ar - should match structure
{ "user": { "name": "الاسم" } }
```

### ❌ Using Wrong Namespace
```tsx
// Feature is in knowledge, but using common
const { t } = useTranslation('common');
t('articles.viewAll') // Won't work!

// Correct
const { t } = useTranslation('knowledge');
t('articles.viewAll')
```
