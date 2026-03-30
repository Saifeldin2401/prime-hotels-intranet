import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Bookmark, Plus, Trash2, Star, Check } from 'lucide-react'

interface FilterPreset {
  id: string
  name: string
  icon?: string
  filters: {
    propertyId: string
    platform: string
    status: string
    severity: string
    sentiment: string
    query: string
  }
  isDefault?: boolean
  createdAt: string
}

interface SavedFilterPresetsProps {
  currentFilters: FilterPreset['filters']
  onApplyPreset: (filters: FilterPreset['filters']) => void
  onSavePreset?: (preset: Omit<FilterPreset, 'id' | 'createdAt'>) => void
  className?: string
}

const DEFAULT_PRESETS: FilterPreset[] = [
  {
    id: 'default-1',
    name: 'Critical Reviews',
    icon: 'alert',
    filters: {
      propertyId: 'all',
      platform: 'all',
      status: 'all',
      severity: 'critical',
      sentiment: 'all',
      query: '',
    },
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'default-2',
    name: 'Unresponded',
    icon: 'pending',
    filters: {
      propertyId: 'all',
      platform: 'all',
      status: 'new',
      severity: 'all',
      sentiment: 'all',
      query: '',
    },
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'default-3',
    name: 'VIP Guests',
    icon: 'star',
    filters: {
      propertyId: 'all',
      platform: 'all',
      status: 'all',
      severity: 'all',
      sentiment: 'all',
      query: 'vip:true',
    },
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'default-4',
    name: 'Negative Sentiment',
    icon: 'thumbs-down',
    filters: {
      propertyId: 'all',
      platform: 'all',
      status: 'all',
      severity: 'all',
      sentiment: 'negative',
      query: '',
    },
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
]

export function SavedFilterPresets({ 
  currentFilters, 
  onApplyPreset, 
  onSavePreset,
  className 
}: SavedFilterPresetsProps) {
  const [presets, setPresets] = useState<FilterPreset[]>(DEFAULT_PRESETS)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newPresetName, setNewPresetName] = useState('')
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null)

  // Load saved presets from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('review-filter-presets')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setPresets([...DEFAULT_PRESETS, ...parsed.filter((p: FilterPreset) => !p.isDefault)])
      } catch {
        // Ignore parse errors
      }
    }
  }, [])

  // Save presets to localStorage when changed
  useEffect(() => {
    const customPresets = presets.filter((p) => !p.isDefault)
    localStorage.setItem('review-filter-presets', JSON.stringify(customPresets))
  }, [presets])

  const handleSavePreset = () => {
    if (!newPresetName.trim()) return

    const newPreset: FilterPreset = {
      id: `custom-${Date.now()}`,
      name: newPresetName.trim(),
      filters: { ...currentFilters },
      createdAt: new Date().toISOString(),
    }

    if (onSavePreset) {
      onSavePreset({
        name: newPreset.name,
        filters: newPreset.filters,
      })
    }

    setPresets((prev) => [...prev, newPreset])
    setNewPresetName('')
    setIsDialogOpen(false)
  }

  const handleDeletePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setPresets((prev) => prev.filter((p) => p.id !== id))
  }

  const handleApplyPreset = (preset: FilterPreset) => {
    setSelectedPresetId(preset.id)
    onApplyPreset(preset.filters)
  }

  const activeFiltersCount = Object.values(currentFilters).filter(
    (v) => v !== 'all' && v !== ''
  ).length

  return (
    <div className={className}>
      <div className="flex items-center gap-2 flex-wrap">
        {/* Preset buttons */}
        {presets.slice(0, 4).map((preset) => (
          <Button
            key={preset.id}
            variant={selectedPresetId === preset.id ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => handleApplyPreset(preset)}
            className="h-7 text-xs px-2"
          >
            {preset.icon === 'star' && <Star className="h-3 w-3 mr-1" />}
            {preset.name}
          </Button>
        ))}

        {/* More presets dropdown */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsDialogOpen(true)}
          className="h-7 text-xs px-2"
        >
          <Bookmark className="h-3 w-3 mr-1" />
          All Presets
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-4 text-[10px]">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Presets Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bookmark className="h-5 w-5" />
              Saved Filter Presets
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Save current as new */}
            {activeFiltersCount > 0 && (
              <div className="flex gap-2">
                <Input
                  placeholder="Name this filter set..."
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  className="h-9"
                />
                <Button 
                  size="sm" 
                  onClick={handleSavePreset}
                  disabled={!newPresetName.trim()}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Save
                </Button>
              </div>
            )}

            {/* Presets list */}
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {presets.map((preset) => {
                  const isActive = 
                    selectedPresetId === preset.id ||
                    JSON.stringify(preset.filters) === JSON.stringify(currentFilters)

                  return (
                    <div
                      key={preset.id}
                      onClick={() => handleApplyPreset(preset)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        isActive 
                          ? 'border-primary bg-primary/5' 
                          : 'hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isActive && <Check className="h-4 w-4 text-primary" />}
                          <span className="font-medium">{preset.name}</span>
                          {preset.isDefault && (
                            <Badge variant="secondary" className="text-[10px]">
                              Default
                            </Badge>
                          )}
                        </div>
                        {!preset.isDefault && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => handleDeletePreset(preset.id, e)}
                          >
                            <Trash2 className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {Object.entries(preset.filters)
                          .filter(([_, value]) => value !== 'all' && value !== '')
                          .map(([key, value]) => (
                            <Badge key={key} variant="outline" className="text-[10px]">
                              {key}: {value}
                            </Badge>
                          ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
