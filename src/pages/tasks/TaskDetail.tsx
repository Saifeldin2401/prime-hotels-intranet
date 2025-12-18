import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useTask, useUpdateTask, useAddTaskComment } from '@/hooks/useTasks'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Calendar, User, Send, Loader2, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { DeleteConfirmation } from '@/components/shared/DeleteConfirmation'

const priorityColors = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800'
}

export default function TaskDetail() {
  const { taskId } = useParams<{ taskId: string }>()
  const { user, profile } = useAuth()
  const { t } = useTranslation('tasks')
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: task, isLoading } = useTask(taskId!)
  const updateTask = useUpdateTask()
  const addComment = useAddTaskComment()

  const [comment, setComment] = useState('')
  const [issubmittingComment, setIsSubmittingComment] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!taskId) return
      const { error } = await supabase
        .from('tasks')
        .update({ is_deleted: true }) // Using soft delete for safety
        .eq('id', taskId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      navigate('/tasks')
    }
  })

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
  }

  if (!task) {
    return (
      <div className="container mx-auto py-8 text-center">
        <h2 className="text-xl font-bold mb-4">{t('task_not_found')}</h2>
        <Button onClick={() => navigate('/tasks')}>{t('back_to_tasks')}</Button>
      </div>
    )
  }

  const handleStatusChange = async (newStatus: string) => {
    await updateTask.mutateAsync({ id: task.id, status: newStatus as any })
  }

  const handlePriorityChange = async (newPriority: string) => {
    await updateTask.mutateAsync({ id: task.id, priority: newPriority as any })
  }

  const handleAddComment = async () => {
    if (!comment.trim() || !user) return
    setIsSubmittingComment(true)
    try {
      await addComment.mutateAsync({
        task_id: task.id,
        content: comment,
        author_id: user.id
      })
      setComment('')
    } finally {
      setIsSubmittingComment(false)
    }
  }

  return (
    <div className="container mx-auto py-6 max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-colors" size="icon" onClick={() => navigate('/tasks')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold">{task.title}</h1>
            <Badge className={priorityColors[task.priority]}>{task.priority}</Badge>
            <Badge className="bg-gray-100 text-gray-800 border border-gray-600 rounded-md">{task.status.replace('_', ' ')}</Badge>
          </div>
          <p className="text-sm text-gray-600 flex items-center gap-4">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" /> {task.assigned_to?.full_name || 'Unassigned'}
            </span>
            {task.due_date && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Due {format(new Date(task.due_date), 'MMM d, yyyy')}
              </span>
            )}
          </p>
        </div>

        <div className="flex gap-2">
          <Select value={task.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="review">Review</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {t('delete', 'Delete')}
          </Button>
        </div>
      </div>

      <DeleteConfirmation
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={() => deleteMutation.mutate()}
        itemName={task.title}
        itemType={t('task', 'Task')}
        isLoading={deleteMutation.isPending}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {task.description || 'No description provided.'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Comments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {task.comments && task.comments.length > 0 ? (
                <div className="space-y-4">
                  {task.comments.map(comment => (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={comment.author?.avatar_url || ''} />
                        <AvatarFallback>{comment.author?.full_name?.charAt(0) || 'U'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 bg-muted/50 p-3 rounded-lg">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-semibold text-sm">{comment.author?.full_name}</span>
                          <span className="text-xs text-gray-600">{format(new Date(comment.created_at), 'MMM d, h:mm a')}</span>
                        </div>
                        <p className="text-sm">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-600">No comments yet.</p>
              )}

              <div className="flex gap-3 pt-4">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={profile?.avatar_url || ''} />
                  <AvatarFallback>{profile?.full_name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 gap-2 flex flex-col">
                  <Textarea
                    placeholder="Write a comment..."
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                  />
                  <Button
                    className="self-end"
                    size="sm"
                    onClick={handleAddComment}
                    disabled={issubmittingComment || !comment.trim()}
                  >
                    {issubmittingComment && <Loader2 className="w-3 h-3 animate-spin mr-2" />}
                    <Send className="w-3 h-3 mr-2" />
                    Post Comment
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-xs text-gray-600 block mb-1">Priority</span>
                <Select value={task.priority} onValueChange={handlePriorityChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <span className="text-xs text-gray-600 block mb-1">Assigned To</span>
                <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/20">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={task.assigned_to?.avatar_url || ''} />
                    <AvatarFallback>{task.assigned_to?.full_name?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{task.assigned_to?.full_name || 'Unassigned'}</span>
                </div>
              </div>

              <div>
                <span className="text-xs text-gray-600 block mb-1">Created By</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm">{task.created_by?.full_name}</span>
                </div>
              </div>

              <div>
                <span className="text-xs text-gray-600 block mb-1">Created At</span>
                <span className="text-sm">{format(new Date(task.created_at), 'PPP p')}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
