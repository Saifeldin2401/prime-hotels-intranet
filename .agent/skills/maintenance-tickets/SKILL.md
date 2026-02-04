---
name: Maintenance Tickets
description: Guidelines for maintenance ticket management
---

# Maintenance Tickets Skill

## Overview
Ticket system for facility maintenance requests.

## Database Tables
- `maintenance_tickets` - Ticket data
- `maintenance_comments` - Discussion
- `maintenance_attachments` - Photos/files

## Components
- `MaintenanceTicketForm.tsx` - Create/edit
- `AITriageSuggestions.tsx` - AI priority

## Hook
`useMaintenanceTickets` in `src/hooks/`

## Ticket Structure
```typescript
interface MaintenanceTicket {
  id: string;
  title: string;
  description: string;
  category: 'plumbing' | 'electrical' | 'hvac' | 
            'appliance' | 'structural' | 'cosmetic' | 
            'safety' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent' | 'critical';
  status: EntityStatus;
  property_id: string;
  room_number: string;
  reported_by_id: string;
  assigned_to_id: string;
  estimated_completion_date: string;
}
```

## Usage
```typescript
import { useMaintenanceTickets } from '@/hooks/useMaintenanceTickets';

const { tickets, createTicket, assignTicket } = useMaintenanceTickets();

await createTicket({
  title: 'AC not working',
  category: 'hvac',
  priority: 'high',
  room_number: '205'
});
```

## Translations
Namespace: `maintenance`

## AI Triage
Uses `useAITicketTriage` hook for priority suggestions.
