---
name: AI Features
description: Guidelines for implementing AI-powered features
---

# AI Features Skill

## Overview
AI features powered by Gemini API for document analysis, suggestions.

## Gemini Client
Located in `src/lib/gemini.ts`.

## AI Hooks
- `useAIDocumentSummarizer` - Document summaries
- `useAIFeedbackAnalyzer` - Feedback analysis
- `useAIOnboardingPath` - Onboarding suggestions
- `useAITicketTriage` - Maintenance priority

## AI Components
- `AIDocumentSummarizer.tsx`
- `AIOnboardingPathGenerator.tsx`
- `AITriageSuggestions.tsx`
- `AIQuestionGenerator.tsx`
- `KnowledgeAIAssistant.tsx`

## Usage
```typescript
import { useAIDocumentSummarizer } from '@/hooks/useAIDocumentSummarizer';

const { summarize, isLoading } = useAIDocumentSummarizer();

const summary = await summarize(documentContent);
```

## Environment
Requires `VITE_GEMINI_API_KEY` in environment.

## Best Practices
1. Always show loading state
2. Handle API errors gracefully
3. Allow user to edit AI output
4. Don't auto-submit AI content
5. Label AI-generated content

## Translations
Namespace: `ai_tools`
