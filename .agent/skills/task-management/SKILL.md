---
name: Task Management
description: Guidelines for task creation, assignment, and workflow management
---

# Task Management Skill

## Overview
Task management system for assigning and tracking work items.

## Database Tables
- `tasks` - Main task data
- `task_comments` - Task discussions
- `task_attachments` - File attachments
- `task_watchers` - Task observers

## Components
Located in `src/components/tasks/`:
- `TaskCard.tsx` - Task display card
- `TaskForm.tsx` - Create/edit form
- `TaskFilters.tsx` - Filter controls
- `TaskKanban.tsx` - Kanban board view

## Hooks
- `useTasks` - Task CRUD operations
- `useTaskTemplates` - Template management

## Task Structure
```typescript
interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'review' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to_id: string; // NOT assignee_id!
  created_by_id: string;
  property_id: string;
  department_id: string;
  due_date: string;
  tags: string[];
}
```

## IMPORTANT: Column Names
- Use `assigned_to_id` NOT `assignee_id`
- Use `created_by_id` NOT `creator_id`

## Usage
```typescript
import { useTasks } from '@/hooks/useTasks';

const { tasks, createTask, updateStatus } = useTasks();

// Create task
await createTask({
  title: 'Complete room inspection',
  priority: 'high',
  assigned_to_id: userId, // Correct!
  due_date: '2026-02-10'
});

// Update status
await updateStatus(taskId, 'completed');
```

## Translations
Namespace: `tasks`
