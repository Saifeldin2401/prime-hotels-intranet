/**
 * Action Registry Panel
 * 
 * Manage the universal action registry - enable/disable actions,
 * configure per-scope settings, and view execution history.
 */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Zap, Search, Filter, Play, Pause, History, Settings, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'

// Types
interface ActionDefinition {
  id: string
  action_type: string
  action_category: string
  name: string
  description: string
  icon: string
  color: string
  is_system: boolean
  requires_approval: boolean
  supported_channels: string[]
  config_schema: Record<string, unknown>
}

interface ActionEnablement {
  id: string
  action_type: string
  scope_type: string
  scope_id: string | null
  is_enabled: boolean
  reason: string | null
  expires_at: string | null
}

const CATEGORY_COLORS: Record<string, string> = {
  notification: 'bg-blue-100 text-blue-800',
  task: 'bg-purple-100 text-purple-800',
  escalation: 'bg-orange-100 text-orange-800',
  ai: 'bg-violet-100 text-violet-800',
  external: 'bg-gray-100 text-gray-800',
  approval: 'bg-green-100 text-green-800',
  system: 'bg-slate-100 text-slate-800'
}

export function ActionRegistryPanel() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedAction, setSelectedAction] = useState<ActionDefinition | null>(null)
  const [isEnablementDialogOpen, setIsEnablementDialogOpen] = useState(false)

  const queryClient = useQueryClient()

  // Fetch actions
  const { data: actions, isLoading: actionsLoading } = useQuery({
    queryKey: ['action-definitions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('action_definitions')
        .select('*')
        .order('action_category', { ascending: true })
        .order('name', { ascending: true })
      
      if (error) throw error
      return data as ActionDefinition[]
    }
  })

  // Fetch enablements
  const { data: enablements, isLoading: enablementsLoading } = useQuery({
    queryKey: ['action-enablements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('action_enablements')
        .select('*')
      
      if (error) throw error
      return data as ActionEnablement[]
    }
  })

  // Toggle action mutation
  const toggleActionMutation = useMutation({
    mutationFn: async ({ actionType, scopeType, scopeId, enabled }: { 
      actionType: string
      scopeType: string
      scopeId?: string | null
      enabled: boolean 
    }) => {
      if (enabled) {
        const { error } = await supabase
          .from('action_enablements')
          .upsert({
            action_type: actionType,
            scope_type: scopeType,
            scope_id: scopeId || null,
            is_enabled: true,
            enabled_at: new Date().toISOString()
          }, { onConflict: 'action_type,scope_type,scope_id' })
        
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('action_enablements')
          .upsert({
            action_type: actionType,
            scope_type: scopeType,
            scope_id: scopeId || null,
            is_enabled: false,
            disabled_at: new Date().toISOString()
          }, { onConflict: 'action_type,scope_type,scope_id' })
        
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['action-enablements'] })
      toast.success('Action status updated')
    },
    onError: (error) => {
      toast.error('Failed to update action: ' + error.message)
    }
  })

  // Filter actions
  const filteredActions = actions?.filter(action => {
    const matchesSearch = !searchTerm || 
      action.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      action.description?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = selectedCategory === 'all' || action.action_category === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  // Get effective enablement status
  const getActionStatus = (actionType: string) => {
    // Check for global enablement override
    const globalEnablement = enablements?.find(e => 
      e.action_type === actionType && e.scope_type === 'global'
    )
    
    if (globalEnablement) {
      return globalEnablement.is_enabled
    }
    
    // Default to enabled if no explicit disablement
    return true
  }

  // Get unique categories
  const categories = [...new Set(actions?.map(a => a.action_category) || [])]

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search actions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Actions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredActions?.map(action => (
          <ActionCard
            key={action.id}
            action={action}
            isEnabled={getActionStatus(action.action_type)}
            onToggle={(enabled) => toggleActionMutation.mutate({
              actionType: action.action_type,
              scopeType: 'global',
              enabled
            })}
            onConfigure={() => {
              setSelectedAction(action)
              setIsEnablementDialogOpen(true)
            }}
          />
        ))}
      </div>

      {filteredActions?.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No actions found matching your criteria</p>
          </CardContent>
        </Card>
      )}

      {/* Enablement Configuration Dialog */}
      <Dialog open={isEnablementDialogOpen} onOpenChange={setIsEnablementDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Configure Action: {selectedAction?.name}
            </DialogTitle>
            <DialogDescription>
              Set enablement rules for different scopes (global, property, role, user)
            </DialogDescription>
          </DialogHeader>
          
          <ActionEnablementConfig 
            action={selectedAction}
            enablements={enablements?.filter(e => e.action_type === selectedAction?.action_type)}
          />
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEnablementDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={() => setIsEnablementDialogOpen(false)}>
              Save Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Action Card Component
function ActionCard({ 
  action, 
  isEnabled, 
  onToggle, 
  onConfigure 
}: { 
  action: ActionDefinition
  isEnabled: boolean
  onToggle: (enabled: boolean) => void
  onConfigure: () => void
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <Card className={!isEnabled ? 'opacity-60' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div 
              className="p-2 rounded-lg"
              style={{ backgroundColor: action.color + '20', color: action.color }}
            >
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base">{action.name}</CardTitle>
              <CardDescription className="text-xs">
                {action.action_type}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={isEnabled}
              onCheckedChange={onToggle}
            />
            <Button variant="ghost" size="sm" onClick={onConfigure}>
              <Settings className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground mb-3">
          {action.description}
        </p>
        
        <div className="flex flex-wrap gap-2 mb-3">
          <Badge className={CATEGORY_COLORS[action.action_category]}>
            {action.action_category}
          </Badge>
          {action.is_system && (
            <Badge variant="outline">System</Badge>
          )}
          {action.requires_approval && (
            <Badge variant="outline" className="text-orange-600">
              Requires Approval
            </Badge>
          )}
        </div>

        {action.supported_channels?.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Channels:</span>
            {action.supported_channels.map(channel => (
              <Badge key={channel} variant="secondary" className="text-xs">
                {channel}
              </Badge>
            ))}
          </div>
        )}

        {isExpanded && (
          <div className="mt-4 pt-4 border-t space-y-2">
            <div className="text-sm">
              <span className="font-medium">Config Schema:</span>
              <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto">
                {JSON.stringify(action.config_schema, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Action Enablement Configuration
function ActionEnablementConfig({ 
  action, 
  enablements 
}: { 
  action: ActionDefinition | null
  enablements: ActionEnablement[] | undefined 
}) {
  if (!action) return null

  return (
    <div className="space-y-4 py-4">
      <Tabs defaultValue="global">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="global">Global</TabsTrigger>
          <TabsTrigger value="property">Property</TabsTrigger>
          <TabsTrigger value="role">Role</TabsTrigger>
          <TabsTrigger value="user">User</TabsTrigger>
        </TabsList>
        
        <TabsContent value="global" className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label className="font-medium">Global Enablement</Label>
              <p className="text-sm text-muted-foreground">
                Applies to all users system-wide
              </p>
            </div>
            <Switch 
              checked={enablements?.find(e => e.scope_type === 'global')?.is_enabled ?? true}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="property" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Configure per-property enablement (coming soon)
          </p>
        </TabsContent>
        
        <TabsContent value="role" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Configure per-role enablement (coming soon)
          </p>
        </TabsContent>
        
        <TabsContent value="user" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Configure per-user enablement (coming soon)
          </p>
        </TabsContent>
      </Tabs>
    </div>
  )
}
