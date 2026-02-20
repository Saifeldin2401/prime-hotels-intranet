# Dashboard - Real Data Implementation

All dashboard widgets now use real data from the application's hooks and APIs.

## Components Using Real Data

### 1. WelcomeHeader
- **Data**: User profile, current property, time-based greeting
- **Hooks**: `useAuth()`, `useProperty()`

### 2. QuickInsights
- **Metrics**:
  - Attendance Rate (from `useAttendance()`)
  - Task Completion (from `useTaskStats()`)
  - Training Progress (from `useTrainingStats()`)
  - Response Time (calculated from dashboard stats)

### 3. StatsGrid
- **Data**: Tasks, Training, Documents, Notifications counts
- **Hooks**: `useDashboardStats()`, `useNotifications()`

### 4. Social Feed
- **Data**: Unified social activity feed
- **Hooks**: `useUnifiedSocialFeed()`

### 5. TeamWidget
- **Data**: Team members, online status, departments
- **Hooks**: `useDepartmentStaff()`, `useProfiles()`
- **Fallback**: Shows all profiles if no department staff found

### 6. CalendarWidget
- **Data**: Events and user shifts
- **Hooks**: `useEvents()`, `useUpcomingEvents()`, `useUserShifts()`
- **Features**: Interactive calendar with real events and shifts

### 7. PerformanceChart
- **Data**: Analytics and performance metrics
- **Hooks**: `useDashboardStats()`, `useAnalyticsStats()`, `useTrainingStats()`, `useTaskStats()`
- **Features**: Real calculated metrics with trend data

### 8. TasksWidget
- **Data**: Pending tasks
- **Hooks**: `useTasks()`

### 9. AnnouncementsWidget
- **Data**: Latest announcements
- **Hooks**: `useAnnouncements()`

### 10. TrainingProgress
- **Data**: Training modules and progress
- **Hooks**: `useTrainingModules()`, `useTrainingProgress()`

### 11. MaintenanceWidget
- **Data**: Open maintenance tickets
- **Hooks**: `useMyMaintenanceTickets()`

### 12. KnowledgeBaseWidget
- **Data**: Recent knowledge articles and SOPs
- **Hooks**: `useRecentArticles()`

### 13. EmployeeOfMonthWidget
- **Data**: Latest employee of the month
- **Hooks**: React Query + Supabase client

### 14. HospitalityNewsWidget
- **Data**: Industry news feed
- **Hooks**: `useNews()`

### 15. MotivationWidget
- **Data**: Quote of the day
- **Hooks**: `useQuotes()`

### 16. NotificationsPanel
- **Data**: User notifications
- **Hooks**: `useNotifications()`

## Real Data Flow

```
Dashboard
|-- useDashboardStats() - Main stats
|-- useNotifications() - Unread count
|-- useUnifiedSocialFeed() - Social feed
|-- useAuth() - User profile and role
`-- useProperty() - Current property

Widgets
|-- QuickInsights
|   |-- useAttendance()
|   |-- useTaskStats()
|   `-- useTrainingStats()
|-- TeamWidget
|   |-- useDepartmentStaff()
|   `-- useProfiles()
|-- CalendarWidget
|   |-- useEvents()
|   `-- useUserShifts()
|-- KnowledgeBaseWidget
|   `-- useRecentArticles()
`-- MotivationWidget
    `-- useQuotes()
```

## Error Handling

All components handle:
- Loading states with skeletons
- Empty states with informative messages
- Error states gracefully
- Fallback data sources

## Performance Optimizations

- React Query caching for all data
- Lazy loading of widgets
- Optimistic updates where applicable
- Memoized calculations
