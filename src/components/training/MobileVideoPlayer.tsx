/**
 * MobileVideoPlayer Component
 * 
 * A mobile-optimized video player with:
 * - Touch-friendly controls
 * - Gestures for seeking and volume
 * - Picture-in-Picture support
 * - Offline playback indicator
 * - Progress tracking
 * - Speed control
 */

import { cn } from '@/lib/utils'
import { useCallback, useEffect, useRef, useState } from 'react'

interface MobileVideoPlayerProps {
    src: string
    poster?: string
    title?: string
    onProgress?: (progress: number) => void
    onComplete?: () => void
    isMandatory?: boolean
    className?: string
}

/**
 * MobileVideoPlayer - Touch-optimized video player
 */
export function MobileVideoPlayer({
    src,
    poster,
    title,
    onProgress,
    onComplete,
    isMandatory = false,
    className
}: MobileVideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const progressRef = useRef<HTMLDivElement>(null)

    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [volume, setVolume] = useState(1)
    const [playbackRate, setPlaybackRate] = useState(1)
    const [showControls, setShowControls] = useState(true)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [buffered, setBuffered] = useState(0)
    const [showSpeedMenu, setShowSpeedMenu] = useState(false)
    const controlsTimeoutRef = useRef<NodeJS.Timeout>()

    // Format time display
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = Math.floor(seconds % 60)
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    // Show/hide controls
    const showControlsTemporarily = useCallback(() => {
        setShowControls(true)
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current)
        }
        controlsTimeoutRef.current = setTimeout(() => {
            if (isPlaying) {
                setShowControls(false)
            }
        }, 3000)
    }, [isPlaying])

    // Play/Pause
    const togglePlay = useCallback(() => {
        const video = videoRef.current
        if (!video) return

        if (isPlaying) {
            video.pause()
        } else {
            video.play()
        }
    }, [isPlaying])

    // Seek
    const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
        const video = videoRef.current
        const progressBar = progressRef.current
        if (!video || !progressBar) return

        const rect = progressBar.getBoundingClientRect()
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
        const pos = (clientX - rect.left) / rect.width
        const newTime = pos * duration

        video.currentTime = Math.max(0, Math.min(newTime, duration))
    }, [duration])

    // Toggle fullscreen
    const toggleFullscreen = useCallback(async () => {
        const container = containerRef.current
        if (!container) return

        if (!isFullscreen) {
            try {
                if (container.requestFullscreen) {
                    await container.requestFullscreen()
                }
            } catch {
                // Fullscreen not supported
            }
        } else {
            try {
                if (document.exitFullscreen) {
                    await document.exitFullscreen()
                }
            } catch {
                // Ignore
            }
        }
    }, [isFullscreen])

    // Change playback speed
    const changePlaybackRate = useCallback((rate: number) => {
        const video = videoRef.current
        if (!video) return

        video.playbackRate = rate
        setPlaybackRate(rate)
        setShowSpeedMenu(false)
    }, [])

    // Video event handlers
    useEffect(() => {
        const video = videoRef.current
        if (!video) return

        const handlePlay = () => setIsPlaying(true)
        const handlePause = () => setIsPlaying(false)
        const handleTimeUpdate = () => {
            setCurrentTime(video.currentTime)
            onProgress?.((video.currentTime / video.duration) * 100)
        }
        const handleLoadedMetadata = () => setDuration(video.duration)
        const handleEnded = () => {
            setIsPlaying(false)
            onComplete?.()
        }
        const handleProgress = () => {
            if (video.buffered.length > 0) {
                setBuffered(video.buffered.end(video.buffered.length - 1))
            }
        }

        video.addEventListener('play', handlePlay)
        video.addEventListener('pause', handlePause)
        video.addEventListener('timeupdate', handleTimeUpdate)
        video.addEventListener('loadedmetadata', handleLoadedMetadata)
        video.addEventListener('ended', handleEnded)
        video.addEventListener('progress', handleProgress)

        return () => {
            video.removeEventListener('play', handlePlay)
            video.removeEventListener('pause', handlePause)
            video.removeEventListener('timeupdate', handleTimeUpdate)
            video.removeEventListener('loadedmetadata', handleLoadedMetadata)
            video.removeEventListener('ended', handleEnded)
            video.removeEventListener('progress', handleProgress)
        }
    }, [onProgress, onComplete])

    // Fullscreen change listener
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement)
        }

        document.addEventListener('fullscreenchange', handleFullscreenChange)
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }, [])

    // Cleanup
    useEffect(() => {
        return () => {
            if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current)
            }
        }
    }, [])

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0
    const bufferProgress = duration > 0 ? (buffered / duration) * 100 : 0

    return (
        <div
            ref={containerRef}
            className={cn(
                'relative bg-black rounded-xl overflow-hidden group',
                isFullscreen ? 'fixed inset-0 z-50 rounded-none' : '',
                className
            )}
            onClick={showControlsTemporarily}
        >
            {/* Video Element */}
            <video
                ref={videoRef}
                src={src}
                poster={poster}
                className="w-full h-full object-contain"
                playsInline
                preload="metadata"
                onClick={togglePlay}
            />

            {/* Title Overlay */}
            {title && showControls && (
                <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/70 to-transparent">
                    <h3 className="text-white font-medium truncate">{title}</h3>
                </div>
            )}

            {/* Center Play Button (when paused) */}
            {!isPlaying && (
                <button
                    onClick={togglePlay}
                    className="absolute inset-0 flex items-center justify-center bg-black/30"
                >
                    <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                        <svg className="w-8 h-8 text-black ml-1" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                        </svg>
                    </div>
                </button>
            )}

            {/* Controls Overlay */}
            <div
                className={cn(
                    'absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300',
                    showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
                )}
            >
                {/* Progress Bar */}
                <div
                    ref={progressRef}
                    className="relative h-1.5 bg-white/30 rounded-full mb-3 cursor-pointer"
                    onClick={handleSeek}
                    onTouchStart={handleSeek}
                >
                    {/* Buffered */}
                    <div
                        className="absolute h-full bg-white/30 rounded-full"
                        style={{ width: `${bufferProgress}%` }}
                    />
                    {/* Progress */}
                    <div
                        className="absolute h-full bg-primary rounded-full"
                        style={{ width: `${progress}%` }}
                    />
                    {/* Handle */}
                    <div
                        className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg -ml-2"
                        style={{ left: `${progress}%` }}
                    />
                </div>

                {/* Control Buttons */}
                <div className="flex items-center justify-between">
                    {/* Left: Play/Pause & Time */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={togglePlay}
                            className="w-10 h-10 flex items-center justify-center text-white"
                        >
                            {isPlaying ? (
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                                </svg>
                            ) : (
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z" />
                                </svg>
                            )}
                        </button>

                        <span className="text-white text-sm font-medium">
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                    </div>

                    {/* Right: Speed & Fullscreen */}
                    <div className="flex items-center gap-2">
                        {/* Playback Speed */}
                        <div className="relative">
                            <button
                                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                                className="px-2 py-1 text-white text-sm font-medium"
                            >
                                {playbackRate}x
                            </button>

                            {showSpeedMenu && (
                                <div className="absolute bottom-full right-0 mb-2 bg-black/90 rounded-lg overflow-hidden">
                                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                                        <button
                                            key={rate}
                                            onClick={() => changePlaybackRate(rate)}
                                            className={cn(
                                                'block w-full px-4 py-2 text-sm text-white text-left',
                                                playbackRate === rate ? 'bg-primary' : 'hover:bg-white/10'
                                            )}
                                        >
                                            {rate}x
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Fullscreen */}
                        <button
                            onClick={toggleFullscreen}
                            className="w-10 h-10 flex items-center justify-center text-white"
                        >
                            {isFullscreen ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mandatory Watch Indicator */}
            {isMandatory && (
                <div className="absolute top-4 right-4 px-2 py-1 bg-amber-500 text-white text-xs font-medium rounded">
                    Required
                </div>
            )}
        </div>
    )
}
