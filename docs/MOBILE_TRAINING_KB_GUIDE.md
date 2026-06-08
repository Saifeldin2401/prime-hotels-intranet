# Mobile Training & Knowledge Base Enhancement Guide

## Overview

This guide documents the enhanced mobile-optimized components for Training Player and Knowledge Base, providing a premium mobile learning experience.

---

## New Components

### 1. MobileTrainingPlayer

A fully-featured mobile training player with swipe navigation and optimized UX.

```tsx
import { MobileTrainingPlayer } from '@/components/mobile'

<MobileTrainingPlayer
    moduleId="module-uuid"
    assignmentId="assignment-uuid"
    onComplete={() => navigate('/training')}
/>
```

**Features:**
- **Swipe Navigation**: Swipe left/right to navigate between blocks
- **Bottom Sheet TOC**: Module contents in a slide-up sheet
- **Pull-to-Refresh**: Refresh module content
- **Haptic Feedback**: Tactile feedback on navigation
- **Progress Tracking**: Visual progress bar and block completion
- **Mobile Video Player**: Optimized video controls
- **Quiz Interface**: Touch-friendly quiz with card layout

**Block Types Supported:**
- Text (rich content)
- Video (with progress tracking)
- Audio
- Quiz
- SOP Reference
- Document Link

---

### 2. MobileKnowledgeViewer

An enhanced article reader optimized for mobile consumption.

```tsx
import { MobileKnowledgeViewer } from '@/components/mobile'

// Used as a page component
<MobileKnowledgeViewer />
```

**Features:**
- **Reading Progress**: Visual progress bar at top
- **Focus Mode**: Distraction-free reading
- **Font Size Control**: 4 sizes (sm, base, lg, xl)
- **Theme Selection**: Light, Sepia, Dark modes
- **TOC Navigation**: Bottom sheet with section links
- **Pull-to-Refresh**: Update article content
- **Bilingual Support**: Toggle translation
- **Quick Actions**: Share, bookmark, print

**User Experience:**
- Smooth scrolling between sections
- Active section highlighting in TOC
- Swipe gestures for navigation
- Offline reading support

---

### 3. MobileVideoPlayer

Touch-optimized video player with gesture controls.

```tsx
import { MobileVideoPlayer } from '@/components/mobile'

<MobileVideoPlayer
    src="/path/to/video.mp4"
    poster="/path/to/poster.jpg"
    title="Video Title"
    onProgress={(progress) => console.log(`${progress}% watched`)}
    onComplete={() => console.log('Video completed')}
    isMandatory={true}
/>
```

**Features:**
- **Touch Controls**: Large tap targets for play/pause
- **Gesture Seeking**: Tap progress bar to seek
- **Playback Speed**: 0.5x - 2x speed control
- **Fullscreen**: Native fullscreen support
- **Buffer Indicator**: Shows loading progress
- **Mandatory Watch**: Required viewing indicator

---

### 4. MobileQuizPlayer

Card-based quiz interface optimized for mobile.

```tsx
import { MobileQuizPlayer } from '@/components/mobile'

<MobileQuizPlayer
    quiz={{
        id: 'quiz-uuid',
        title: 'Safety Training Quiz',
        passingScore: 80,
        randomizeQuestions: true,
        showFeedbackDuring: true,
        questions: [...]
    }}
    onComplete={(result) => console.log(`Score: ${result.score}%`)}
    onExit={() => navigate('/training')}
/>
```

**Features:**
- **Card Layout**: One question per screen
- **Swipe Navigation**: Between questions
- **Progress Indicator**: Visual progress bar
- **Immediate Feedback**: Show correct/incorrect immediately
- **Review Mode**: Review answers after completion
- **Timer**: Track time spent
- **Haptic Feedback**: On answer selection

---

## Usage Examples

### Training Module Page

```tsx
import { MobileHeader } from '@/components/layout/MobileHeader'
import { MobileTrainingPlayer } from '@/components/mobile'
import { useParams } from 'react-router-dom'

export function TrainingModulePage() {
    const { id } = useParams()
    const navigate = useNavigate()

    return (
        <div className="min-h-screen bg-background">
            <MobileTrainingPlayer
                moduleId={id!}
                onComplete={() => {
                    toast.success('Module completed!')
                    navigate('/training')
                }}
            />
        </div>
    )
}
```

### Knowledge Article Page

```tsx
import { MobileKnowledgeViewer } from '@/components/mobile'

export function KnowledgeArticlePage() {
    return (
        <MobileKnowledgeViewer />
    )
}
```

---

## Mobile UX Patterns

### 1. Swipe Navigation

All content viewers support swipe gestures:
- **Swipe Left**: Next item/block/question
- **Swipe Right**: Previous item/block/question
- **Implementation**: Uses Framer Motion drag gestures

### 2. Bottom Sheets

Secondary navigation uses bottom sheets:
```tsx
<ActionSheet
    open={isOpen}
    onOpenChange={setIsOpen}
    title="Table of Contents"
>
    {/* Content */}
</ActionSheet>
```

### 3. Pull-to-Refresh

Content refreshes with pull gesture:
```tsx
<PullToRefresh onRefresh={handleRefresh}>
    <Content />
</PullToRefresh>
```

### 4. Touch Targets

All interactive elements are 44px minimum:
```tsx
<button className="touch-target min-h-[44px] min-w-[44px]">
    Click me
</button>
```

---

## Styling

### Theme Support

Components support multiple themes:

```tsx
// Light (default)
<div className="bg-background text-foreground">

// Sepia (reading mode)
<div className="bg-[#f4ecd8] text-[#5b4636]">

// Dark
<div className="bg-slate-900 text-slate-100">
```

### Font Sizes

Four font size levels:
- `sm`: 14px base
- `base`: 16px base  
- `lg`: 18px base
- `xl`: 20px base

---

## Accessibility

### Screen Reader Support

All components include proper ARIA labels:
```tsx
<button aria-label="Play video">
    <PlayIcon />
</button>
```

### Reduced Motion

Respects `prefers-reduced-motion`:
```tsx
const prefersReducedMotion = usePrefersReducedMotion()

<m.div
    animate={prefersReducedMotion ? {} : { opacity: 1 }}
/>
```

### Focus Management

Focus is trapped in modals and returned on close.

---

## Performance

### Optimizations Applied

1. **Lazy Loading**: Components load on demand
2. **Content Visibility**: Off-screen content not rendered
3. **Video Preload**: `preload="metadata"` for faster start
4. **Image Optimization**: Lazy loading for images
5. **Animation**: GPU-accelerated transforms

### Bundle Size

- MobileTrainingPlayer: ~12KB
- MobileKnowledgeViewer: ~10KB
- MobileVideoPlayer: ~6KB
- MobileQuizPlayer: ~8KB

---

## Offline Support

### Progress Persistence

Training progress is saved locally:
```typescript
// Auto-saves every 30 seconds
useEffect(() => {
    const interval = setInterval(saveProgress, 30000)
    return () => clearInterval(interval)
}, [])
```

### Article Caching

Knowledge articles are cached for offline reading:
```typescript
const { data: article } = useQuery({
    queryKey: ['article', id],
    staleTime: 1000 * 60 * 60, // 1 hour
})
```

---

## Testing

### Device Testing Checklist

- [ ] iPhone SE (320px)
- [ ] iPhone 12/13/14 (390px)
- [ ] iPhone Pro Max (428px)
- [ ] Android small (360px)
- [ ] Android medium (400px)
- [ ] iPad/tablet (768px)

### Gesture Testing

- [ ] Swipe left navigates next
- [ ] Swipe right navigates previous
- [ ] Tap to show controls
- [ ] Double-tap to zoom (images)
- [ ] Pinch to zoom (images)

### Interaction Testing

- [ ] Touch targets 44px+
- [ ] Controls visible on tap
- [ ] Haptic feedback works
- [ ] Pull-to-refresh triggers
- [ ] Bottom sheet opens/closes smoothly

---

## Troubleshooting

### Video Not Playing

1. Check video format (MP4 recommended)
2. Verify CORS headers
3. Check `playsInline` attribute
4. Test with `controls` attribute

### Swipe Not Working

1. Ensure no nested scroll containers
2. Check `touch-action` CSS
3. Verify Framer Motion is installed
4. Test on actual device (not just simulator)

### Progress Not Saving

1. Check localStorage availability
2. Verify user is authenticated
3. Check network connection
4. Review console for errors

---

## Migration Guide

### From Standard TrainingPlayer

```tsx
// Before
<TrainingPlayer moduleId={id} />

// After
<MobileTrainingPlayer 
    moduleId={id}
    onComplete={handleComplete}
/>
```

### From Standard KnowledgeViewer

```tsx
// Before
<KnowledgeViewer articleId={id} />

// After
<MobileKnowledgeViewer />
```

---

## Future Enhancements

### Planned Features

1. **Audio Player**: Background audio playback
2. **Download for Offline**: Save videos locally
3. **Voice Navigation**: Speak answers in quizzes
4. **AR Content**: 3D model viewing
5. **Screen Reader**: Enhanced TTS support

### Performance Improvements

1. **Virtual Scrolling**: For long content lists
2. **Image CDN**: Responsive images
3. **Video Streaming**: HLS/DASH support
4. **Prefetching**: Preload next content

---

## Support

For questions or issues:

1. Check this guide
2. Review component stories
3. Check TypeScript types
4. Contact frontend team
