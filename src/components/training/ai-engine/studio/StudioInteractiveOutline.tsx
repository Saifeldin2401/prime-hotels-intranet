import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowDown,
  ArrowUp,
  Award,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Copy,
  Edit,
  Eye,
  FileCode,
  FileQuestion,
  FileText,
  Image as ImageIcon,
  Layers,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CourseBlueprint, CourseVisualAsset, LessonBlueprint, ModuleBlueprint } from '@/types/aiCourseEngine'

interface StudioInteractiveOutlineProps {
  blueprint: CourseBlueprint
  onChangeBlueprint: (updated: CourseBlueprint) => void
  activeLessonId?: string
  onSelectLesson: (lessonId: string) => void
  onRegenerateLessonPromptClick: (lesson: LessonBlueprint) => void
  onInspectVisualClick?: (asset: CourseVisualAsset) => void
}

export function StudioInteractiveOutline({
  blueprint,
  onChangeBlueprint,
  activeLessonId,
  onSelectLesson,
  onRegenerateLessonPromptClick,
  onInspectVisualClick,
}: StudioInteractiveOutlineProps) {
  const { t, i18n } = useTranslation('training')
  const isRTL = i18n.dir() === 'rtl'

  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    blueprint.modules.forEach((m) => {
      init[m.id] = true
    })
    return init
  })

  const toggleModule = (id: string) => {
    setExpandedModules((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  // Move Module Up / Down
  const handleMoveModule = (index: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? index - 1 : index + 1
    if (newIdx < 0 || newIdx >= blueprint.modules.length) return

    const newMods = [...blueprint.modules]
    const temp = newMods[index]
    newMods[index] = newMods[newIdx]
    newMods[newIdx] = temp

    onChangeBlueprint({ ...blueprint, modules: newMods })
  }

  // Duplicate Module
  const handleDuplicateModule = (mod: ModuleBlueprint) => {
    const duplicated: ModuleBlueprint = {
      ...mod,
      id: `mod_${Date.now()}`,
      title: `${mod.title} (Copy)`,
      lessons: mod.lessons.map((l) => ({
        ...l,
        id: `les_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      })),
    }
    onChangeBlueprint({ ...blueprint, modules: [...blueprint.modules, duplicated] })
  }

  // Delete Module
  const handleDeleteModule = (modId: string) => {
    if (blueprint.modules.length <= 1) return
    const filtered = blueprint.modules.filter((m) => m.id !== modId)
    onChangeBlueprint({ ...blueprint, modules: filtered })
  }

  // Move Lesson Up / Down
  const handleMoveLesson = (modId: string, lIdx: number, direction: 'up' | 'down') => {
    const targetMod = blueprint.modules.find((m) => m.id === modId)
    if (!targetMod) return

    const newLIdx = direction === 'up' ? lIdx - 1 : lIdx + 1
    if (newLIdx < 0 || newLIdx >= targetMod.lessons.length) return

    const newLessons = [...targetMod.lessons]
    const temp = newLessons[lIdx]
    newLessons[lIdx] = newLessons[newLIdx]
    newLessons[newLIdx] = temp

    const updatedModules = blueprint.modules.map((m) =>
      m.id === modId ? { ...m, lessons: newLessons } : m
    )
    onChangeBlueprint({ ...blueprint, modules: updatedModules })
  }

  // Duplicate Lesson
  const handleDuplicateLesson = (modId: string, lesson: LessonBlueprint) => {
    const duplicatedLesson: LessonBlueprint = {
      ...lesson,
      id: `les_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      title: `${lesson.title} (Copy)`,
    }
    const updatedModules = blueprint.modules.map((m) =>
      m.id === modId ? { ...m, lessons: [...m.lessons, duplicatedLesson] } : m
    )
    onChangeBlueprint({ ...blueprint, modules: updatedModules })
  }

  // Delete Lesson
  const handleDeleteLesson = (modId: string, lessonId: string) => {
    const targetMod = blueprint.modules.find((m) => m.id === modId)
    if (!targetMod || targetMod.lessons.length <= 1) return

    const updatedModules = blueprint.modules.map((m) =>
      m.id === modId
        ? { ...m, lessons: m.lessons.filter((l) => l.id !== lessonId) }
        : m
    )
    onChangeBlueprint({ ...blueprint, modules: updatedModules })
  }

  return (
    <div className="w-full space-y-3 select-none">
      {/* Course Root Header */}
      <div className="p-3.5 rounded-xl border bg-card/90 backdrop-blur shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold">
            <BookOpen className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-foreground truncate" title={blueprint.title}>
              {blueprint.title}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {blueprint.modules.length} Modules • {blueprint.modules.reduce((s, m) => s + m.lessons.length, 0)} Lessons Total
            </p>
          </div>
        </div>

        <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-200">
          QA Score: {blueprint.qualityScore || 92}%
        </Badge>
      </div>

      {/* Modules List */}
      <div className="space-y-2.5">
        {blueprint.modules.map((mod, mIdx) => {
          const isExpanded = !!expandedModules[mod.id]

          return (
            <div
              key={mod.id}
              className="rounded-xl border bg-card/60 backdrop-blur overflow-hidden transition-all shadow-2xs"
            >
              {/* Module Header Bar */}
              <div className="p-2.5 bg-muted/30 flex items-center justify-between gap-2 border-b">
                <div
                  onClick={() => toggleModule(mod.id)}
                  className="flex items-center gap-2 cursor-pointer min-w-0 flex-1"
                >
                  <Button variant="ghost" size="sm" className="w-5 h-5 p-0 text-muted-foreground">
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </Button>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-mono">
                    M{mIdx + 1}
                  </span>
                  <span className="text-xs font-bold text-foreground truncate">
                    {mod.title}
                  </span>
                  <span className="text-[10px] text-muted-foreground hidden sm:inline">
                    ({mod.lessons.length} {mod.lessons.length === 1 ? 'lesson' : 'lessons'})
                  </span>
                </div>

                {/* Module Action Controls */}
                <div className="flex items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={mIdx === 0}
                    onClick={() => handleMoveModule(mIdx, 'up')}
                    className="w-6 h-6 p-0 text-muted-foreground hover:text-foreground"
                    title="Move Module Up"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={mIdx === blueprint.modules.length - 1}
                    onClick={() => handleMoveModule(mIdx, 'down')}
                    className="w-6 h-6 p-0 text-muted-foreground hover:text-foreground"
                    title="Move Module Down"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDuplicateModule(mod)}
                    className="w-6 h-6 p-0 text-muted-foreground hover:text-foreground"
                    title="Duplicate Module"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={blueprint.modules.length <= 1}
                    onClick={() => handleDeleteModule(mod.id)}
                    className="w-6 h-6 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    title="Delete Module"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {/* Module Lessons & Checkpoint Quiz */}
              {isExpanded && (
                <div className="p-2 space-y-1.5">
                  {mod.lessons.map((lesson, lIdx) => {
                    const isSelected = activeLessonId === lesson.id

                    return (
                      <div
                        key={lesson.id}
                        onClick={() => onSelectLesson(lesson.id)}
                        className={cn(
                          'flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-all duration-150 group',
                          isSelected
                            ? 'border-purple-500 bg-purple-50/70 dark:bg-purple-950/40 font-bold shadow-2xs'
                            : 'border-border/60 hover:border-purple-200 bg-card'
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {mIdx + 1}.{lIdx + 1}
                          </span>
                          <span className="text-xs text-foreground truncate">
                            {lesson.title}
                          </span>
                          {Boolean((lesson.visualAssets && lesson.visualAssets.length > 0) || (lesson as any).visualAsset) && (
                            <Badge variant="outline" className="text-[8px] h-4 px-1 bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300 border-orange-200 gap-0.5">
                              <ImageIcon className="w-2.5 h-2.5" /> Visual
                            </Badge>
                          )}
                        </div>

                        {/* Lesson Quick Actions */}
                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              onRegenerateLessonPromptClick(lesson)
                            }}
                            className="h-6 px-1.5 text-[10px] text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                            title="Regenerate Lesson with Custom AI Prompt"
                          >
                            <Wand2 className="w-3 h-3 me-1" />
                            Refine
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={lIdx === 0}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleMoveLesson(mod.id, lIdx, 'up')
                            }}
                            className="w-5 h-5 p-0 text-muted-foreground"
                          >
                            <ArrowUp className="w-2.5 h-2.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={lIdx === mod.lessons.length - 1}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleMoveLesson(mod.id, lIdx, 'down')
                            }}
                            className="w-5 h-5 p-0 text-muted-foreground"
                          >
                            <ArrowDown className="w-2.5 h-2.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDuplicateLesson(mod.id, lesson)
                            }}
                            className="w-5 h-5 p-0 text-muted-foreground"
                          >
                            <Copy className="w-2.5 h-2.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={mod.lessons.length <= 1}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteLesson(mod.id, lesson.id)
                            }}
                            className="w-5 h-5 p-0 text-rose-500"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}

                  {/* Module Quiz Checkpoint Row */}
                  {mod.moduleQuiz && (
                    <div className="flex items-center justify-between p-2 rounded-lg border border-dashed border-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/20 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileQuestion className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="font-semibold text-emerald-900 dark:text-emerald-300 truncate">
                          {mod.moduleQuiz.title || `Module ${mIdx + 1} Knowledge Check`}
                        </span>
                      </div>
                      <Badge className="bg-emerald-600 text-white text-[9px] h-4">
                        {mod.moduleQuiz.questions?.length || 0} Questions ({mod.moduleQuiz.passingScore || 80}% Pass)
                      </Badge>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {/* Final Comprehensive Exam Card (if present) */}
        {blueprint.finalAssessment && (
          <div className="p-3 rounded-xl border border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-amber-900 dark:text-amber-300">
                  {blueprint.finalAssessment.title || `${blueprint.title} Final Comprehensive Exam`}
                </p>
                <p className="text-[10px] text-amber-700 dark:text-amber-400">
                  {blueprint.finalAssessment.questions?.length || 20} Certification Questions • {blueprint.finalAssessment.passingScore || 85}% Passing Threshold
                </p>
              </div>
            </div>
            <Badge className="bg-amber-600 text-white text-[10px]">
              Final Certification
            </Badge>
          </div>
        )}
      </div>
    </div>
  )
}
