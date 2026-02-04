---
name: Training System
description: Guidelines for building and managing the training module system
---

# Training System Skill

## Overview
Training system for employee learning, including courses, quizzes, certificates.

## Database Tables
- `training_modules` - Course content
- `training_content_blocks` - Module blocks
- `learning_assignments` - User assignments
- `training_progress` - Completion tracking
- `training_certificates` - Issued certificates

## Key Components
Located in `src/components/training/`:
- `SmartModuleWizard.tsx` - AI module creation
- `TrainingProgressVisualization.tsx` - Progress charts
- `TrainingCertificateGenerator.tsx` - Certificate PDF
- `InlineQuizBuilder.tsx` - Quiz creation
- `ModuleSkillsEditor.tsx` - Skills tagging
- `builder/` - Training builder components

## Hooks
- `useTraining` - Main training operations
- `useLearningProgress` - Progress tracking
- `useCertificates` - Certificate management
- `useTrainingRules` - Assignment rules

## Module Structure
```typescript
interface TrainingModule {
  id: string;
  title: string;
  description: string;
  category: string; // onboarding, compliance, skills, leadership
  difficulty_level: string; // beginner, intermediate, advanced
  estimated_duration_minutes: number;
  certificate_enabled: boolean;
  passing_score_percentage: number;
  validity_period_days: number;
  is_active: boolean;
}
```

## Content Block Types
- `text` - Rich text content
- `image` - Image with caption
- `video` - Video embed
- `document_link` - Link to document
- `quiz` - Inline quiz
- `sop_reference` - Knowledge base link

## Usage
```typescript
import { useTraining } from '@/hooks/useTraining';

const { 
  modules, 
  createModule, 
  assignModule,
  trackProgress 
} = useTraining();

// Create module
await createModule({
  title: 'Guest Service Excellence',
  category: 'skills',
  difficulty_level: 'intermediate'
});

// Assign to user
await assignModule({
  module_id: moduleId,
  assigned_to_user_id: userId,
  deadline: '2026-03-01'
});
```

## Translations
Namespace: `training`

## Certificate Generation
```tsx
import { TrainingCertificateGenerator } from '@/components/training';

<TrainingCertificateGenerator
  moduleId={moduleId}
  userId={userId}
  onGenerated={(url) => console.log(url)}
/>
```
