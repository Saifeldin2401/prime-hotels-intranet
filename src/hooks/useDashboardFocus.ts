import { useEffect, useState } from 'react'

export type DashboardFocusMode = 'my_work' | 'my_team'

const FOCUS_MODE_KEY = 'prime_dashboard_focus_mode'

export function useDashboardFocus() {
    const [focusMode, setFocusModeState] = useState<DashboardFocusMode>(() => {
        const stored = localStorage.getItem(FOCUS_MODE_KEY)
        return (stored === 'my_team' || stored === 'my_work') ? stored : 'my_work'
    })

    useEffect(() => {
        localStorage.setItem(FOCUS_MODE_KEY, focusMode)
    }, [focusMode])

    const toggleFocusMode = () => {
        setFocusModeState(prev => prev === 'my_work' ? 'my_team' : 'my_work')
    }

    return {
        focusMode,
        setFocusMode: setFocusModeState,
        toggleFocusMode,
        isTeamFocus: focusMode === 'my_team',
        isPersonalFocus: focusMode === 'my_work',
    }
}
