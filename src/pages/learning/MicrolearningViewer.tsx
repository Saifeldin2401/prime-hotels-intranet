import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { learningService } from '@/services/learningService'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import {
    Play,
    ArrowLeft,
    CheckCircle2,
    Clock,
    FileText
} from 'lucide-react'
import type { MicrolearningContent } from '@/types/learning'
import { useAuth } from '@/hooks/useAuth'

export default function MicrolearningViewer() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { toast } = useToast()
    const { user } = useAuth()
    const videoRef = useRef<HTMLVideoElement>(null)
    const [progress, setProgress] = useState(0)
    const [completed, setCompleted] = useState(false)
    const [markingComplete, setMarkingComplete] = useState(false)

    // Fetch content details
    const { data: content, isLoading } = useQuery({
        queryKey: ['microlearning', id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('microlearning_content')
                .select('*')
                .eq('id', id)
                .single()
            if (error) throw error
            return data as MicrolearningContent
        },
        enabled: !!id
    })

    // Fetch existing progress if any
    const { data: existingProgress } = useQuery({
        queryKey: ['learning-progress', id],
        queryFn: async () => {
            const { data } = await supabase
                .from('learning_progress')
                .select('*')
                .eq('user_id', user?.id)
                .eq('content_id', id)
                .eq('content_type', 'microlearning')
                .single()
            return data
        },
        enabled: !!id && !!user
    })

    useEffect(() => {
        if (existingProgress?.status === 'completed') {
            setCompleted(true)
            setProgress(100)
        }
    }, [existingProgress])

    const handleTimeUpdate = () => {
        if (videoRef.current && !completed) {
            const current = videoRef.current.currentTime
            const total = videoRef.current.duration
            if (total > 0) {
                const percent = Math.min(100, Math.round((current / total) * 100))
                // Only update state if significantly changed to avoid re-renders
                if (Math.abs(percent - progress) > 5) {
                    setProgress(percent)
                }
            }
        }
    }

    const handleEnded = () => {
        if (!completed) {
            setCompleted(true)
            setProgress(100)
            handleMarkComplete()
        }
    }

    const handleMarkComplete = async () => {
        if (!user || markingComplete) return
        try {
            setMarkingComplete(true)
            await learningService.submitQuizProgress({
                user_id: user.id,
                content_id: id!,
                content_type: 'video', // 'video' maps to 'microlearning' in backend/types logic generally or we use specifically 'video'
                status: 'completed',
                progress_percentage: 100,
                passed: true,
                completed_at: new Date().toISOString(),
                last_accessed_at: new Date().toISOString()
            })

            toast({
                title: "Completed!",
                description: "You've successfully completed this microlearning module.",
            })
            setCompleted(true)
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to save progress. Please try again.",
                variant: 'destructive'
            })
        } finally {
            setMarkingComplete(false)
        }
    }

    if (isLoading) {
        return <div className="flex items-center justify-center h-screen">Loading content...</div>
    }

    if (!content) {
        return <div className="flex items-center justify-center h-screen">Content not found</div>
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                <Button variant="ghost" className="mb-4" onClick={() => navigate(-1)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>

                <div className="relative aspect-video bg-black rounded-xl overflow-hidden shadow-lg group">
                    {content.video_url.includes('youtube') || content.video_url.includes('vimeo') ? (
                        // Naive embed for demo - in prod would use a proper player library
                        <iframe
                            src={content.video_url.replace('watch?v=', 'embed/')}
                            className="w-full h-full"
                            allowFullScreen
                            title={content.title}
                        />
                    ) : (
                        <video
                            ref={videoRef}
                            src={content.video_url}
                            className="w-full h-full"
                            controls
                            onTimeUpdate={handleTimeUpdate}
                            onEnded={handleEnded}
                            poster={content.thumbnail_url}
                        />
                    )}
                </div>

                <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1 space-y-4">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Badge>{content.category || 'General'}</Badge>
                                {completed && (
                                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                        Completed
                                    </Badge>
                                )}
                            </div>
                            <h1 className="text-2xl font-bold">{content.title}</h1>
                        </div>

                        <Card className="p-6">
                            <h3 className="font-semibold mb-2 flex items-center">
                                <FileText className="w-4 h-4 mr-2" />
                                Description
                            </h3>
                            <p className="text-muted-foreground whitespace-pre-wrap">
                                {content.description || 'No description provided.'}
                            </p>
                        </Card>
                    </div>

                    <div className="md:w-80 space-y-4">
                        <Card className="p-4 bg-white/50 backdrop-blur">
                            <h3 className="font-semibold mb-4">Progress</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Completion</span>
                                    <span className="font-medium">{progress}%</span>
                                </div>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary transition-all duration-500"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>

                                {!completed ? (
                                    <Button
                                        className="w-full"
                                        onClick={handleMarkComplete}
                                        disabled={markingComplete}
                                    >
                                        <CheckCircle2 className="mr-2 h-4 w-4" />
                                        Mark as Complete
                                    </Button>
                                ) : (
                                    <Button className="w-full" variant="outline" disabled>
                                        Completed
                                    </Button>
                                )}
                            </div>
                        </Card>

                        <Card className="p-4">
                            <div className="flex items-center text-sm text-muted-foreground">
                                <Clock className="w-4 h-4 mr-2" />
                                Duration: {Math.round((content.duration_seconds || 0) / 60)} mins
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}
