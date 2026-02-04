---
name: Knowledge Base
description: Guidelines for managing Knowledge Base articles, SOPs, and quizzes
---

# Knowledge Base Skill

## Overview
Central repository for hotel operations documentation including SOPs, policies, and FAQs.

## Database Tables
- `knowledge_articles` - Main content
- `knowledge_categories` - Categories
- `knowledge_questions` - Quiz questions
- `knowledge_acknowledgments` - User acknowledgments

## Components
Located in `src/components/knowledge/`:
- `KnowledgeAIAssistant.tsx` - AI help
- `ContentRenderers.tsx` - Render content types
- `ContentTypeBuilders.tsx` - Create content
- `RelatedArticlesEditor.tsx` - Related content

## Content Types
1. `sop` - Standard Operating Procedure
2. `policy` - Policy Document
3. `how_to` - How-to Guide
4. `checklist` - Interactive Checklist
5. `quick_ref` - Quick Reference
6. `faq` - FAQ

## Visibility Levels
- `all_properties` - All employees
- `single_property` - Specific property
- `department` - Specific department

## Bilingual Requirements
Every article needs:
- `title` + `title_ar`
- `content` + `content_ar`
- `summary` + `summary_ar`

## Usage
```typescript
import { useKnowledge } from '@/hooks/useKnowledge';

const { articles, createArticle } = useKnowledge();

await createArticle({
  title: 'Check-in SOP',
  title_ar: 'إجراء تسجيل الوصول',
  content_type: 'sop',
  visibility: 'all_properties'
});
```

## Translations
Use namespace: `knowledge`
