# Enhanced Dashboard

A fully-featured, premium dashboard experience for Altus Connect with modern design, animations, and comprehensive widgets.

## Features

### Header
- **Welcome Header**: Dynamic greeting based on time of day
- **Animated gradient background** with role-specific themes
- **Quick actions**: Notifications, refresh, settings
- **Property badges**: Current property, job title, location

### Stats Grid
- Premium stat cards with gradient icons
- Trend indicators with up/down arrows
- Hover animations and transitions
- Role-based stats configuration

### Quick Insights
- Snapshot metrics for attendance, tasks, training, and response time
- Real data with loading fallbacks

### Quick Actions
- Quick action buttons (Documents, Training, Tasks, Directory, Maintenance, Schedule, Messages, Analytics)
- Role-based visibility
- Hover effects with scale and shadow

### Widgets

#### 1. Calendar Widget
- Interactive month view
- Event dots on calendar days
- Event list for selected date
- Month navigation

#### 2. Team Widget
- Team member list with avatars
- Online status indicators
- Department badges
- Contact buttons (email, message)
- Team stats (online count, total, departments)

#### 3. Performance Chart
- Animated bar charts
- Time range selector (Week/Month/Quarter)
- Performance metrics with trends

#### 4. Notifications Panel
- Slide-in panel from right
- Unread counter
- Mark all read / clear all
- Timestamp formatting

#### 5. Announcements Widget
- Scrollable announcement list
- Priority badges
- Relative timestamps

#### 6. Tasks Widget
- Pending tasks list
- Priority color coding
- Due date indicators
- Task status badges

#### 7. Training Progress Widget
- Training module cards
- Progress bars
- Continue/Start buttons
- Status badges

#### 8. Maintenance Widget
- Open tickets list
- Priority and status indicators
- Overdue warnings

#### 9. Knowledge Base Widget
- Quick access to SOPs and guides
- Recent or featured content

#### 10. Employee of the Month Widget
- Featured recognition card
- Winner details and reason

#### 11. Hospitality News Widget
- Industry news highlights
- Curated headlines

#### 12. Motivation Widget
- Daily motivational quote
- Quick refresh action

### Layout
- **Overview Tab**: Full dashboard with all widgets
- **Tasks Tab**: Task-focused view
- **Team Tab**: Team and activity focus
- **Analytics Tab**: Charts and metrics focus

### Design Features
- Gradient backgrounds
- Glass morphism effects
- Smooth animations (Framer Motion)
- Hover effects and micro-interactions
- Responsive design
- Dark mode ready

## File Structure
```
src/pages/dashboard/
|-- Dashboard.tsx          # Main dashboard component
|-- index.ts               # Exports
|-- README.md              # This file
`-- components/
    |-- AnnouncementsWidget.tsx
    |-- CalendarWidget.tsx
    |-- DashboardCustomizeModal.tsx
    |-- EmployeeOfMonthWidget.tsx
    |-- HospitalityNewsWidget.tsx
    |-- KnowledgeBaseWidget.tsx
    |-- MaintenanceWidget.tsx
    |-- MotivationWidget.tsx
    |-- NotificationsPanel.tsx
    |-- PerformanceChart.tsx
    |-- QuickActions.tsx
    |-- QuickInsights.tsx
    |-- StatsGrid.tsx
    |-- TasksWidget.tsx
    |-- TeamWidget.tsx
    |-- TrainingProgress.tsx
    `-- WelcomeHeader.tsx
```

## Usage
```tsx
import { Dashboard } from '@/pages/dashboard'

// In your route
<Route path="/dashboard" element={<Dashboard />} />
```

## Dependencies
- framer-motion (animations)
- date-fns (date formatting)
- lucide-react (icons)
- @tanstack/react-query (data fetching)
