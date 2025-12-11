import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Search, 
  FileText, 
  Star, 
  Download, 
  Eye, 
  Filter,
  Grid,
  List,
  Clock,
  Users,
  Tag,
  Copy
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SOPTemplate {
  id: string
  title: string
  description: string
  category: string
  tags: string[]
  preview_content?: string
  usage_count: number
  rating: number
  is_premium: boolean
  created_by: string
  created_at: string
  updated_at: string
  thumbnail_url?: string
  sections: Array<{
    title: string
    content: string
    is_required: boolean
  }>
}

interface SOPTemplateGalleryProps {
  onSelectTemplate: (template: SOPTemplate) => void
  className?: string
}

export function SOPTemplateGallery({ onSelectTemplate, className }: SOPTemplateGalleryProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState('popular')

  const { data: templates, isLoading } = useQuery({
    queryKey: ['sop-templates', searchTerm, selectedCategory, sortBy],
    queryFn: async () => {
      let query = supabase
        .from('sop_templates')
        .select(`
          *,
          creator:created_by(id, full_name, avatar_url)
        `)
        .eq('is_active', true)

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory)
      }

      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,tags.cs.{${searchTerm}}`)
      }

      // Apply sorting
      switch (sortBy) {
        case 'popular':
          query = query.order('usage_count', { ascending: false })
          break
        case 'rating':
          query = query.order('rating', { ascending: false })
          break
        case 'newest':
          query = query.order('created_at', { ascending: false })
          break
        case 'updated':
          query = query.order('updated_at', { ascending: false })
          break
      }

      const { data, error } = await query.limit(20)
      if (error) throw error
      return data as SOPTemplate[]
    }
  })

  const { data: categories } = useQuery({
    queryKey: ['sop-template-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sop_templates')
        .select('category')
        .eq('is_active', true)
        .not('category', 'is', null)

      if (error) throw error
      
      const uniqueCategories = [...new Set(data?.map(t => t.category) || [])]
      return uniqueCategories
    }
  })

  const TemplateCard = ({ template }: { template: SOPTemplate }) => (
    <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="text-xs">
                {template.category}
              </Badge>
              {template.is_premium && (
                <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600">
                  <Star className="h-3 w-3 mr-1" />
                  Premium
                </Badge>
              )}
            </div>
            <CardTitle className="text-lg line-clamp-2">{template.title}</CardTitle>
          </div>
          <div className="flex items-center gap-1 ml-2">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-medium">{template.rating.toFixed(1)}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {template.description}
        </p>
        
        {template.preview_content && (
          <div className="p-3 bg-muted rounded-md">
            <p className="text-xs text-muted-foreground line-clamp-3 font-mono">
              {template.preview_content}
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-1">
          {template.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {template.tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{template.tags.length - 3}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Download className="h-3 w-3" />
              {template.usage_count}
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {template.creator?.full_name || 'System'}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {new Date(template.updated_at).toLocaleDateString()}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            className="flex-1"
            onClick={() => onSelectTemplate(template)}
          >
            <Copy className="h-4 w-4 mr-2" />
            Use Template
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {/* Preview logic */}}
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  const TemplateListItem = ({ template }: { template: SOPTemplate }) => (
    <Card className="group hover:bg-accent/50 transition-colors cursor-pointer">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold">{template.title}</h3>
              <Badge variant="secondary" className="text-xs">
                {template.category}
              </Badge>
              {template.is_premium && (
                <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600">
                  <Star className="h-3 w-3 mr-1" />
                  Premium
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
              {template.description}
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                {template.rating.toFixed(1)}
              </div>
              <div className="flex items-center gap-1">
                <Download className="h-3 w-3" />
                {template.usage_count} uses
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {template.creator?.full_name || 'System'}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(template.updated_at).toLocaleDateString()}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => onSelectTemplate(template)}
            >
              <Copy className="h-4 w-4 mr-2" />
              Use
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {/* Preview logic */}}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header and Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">SOP Templates</h2>
          <div className="flex items-center gap-2">
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-l-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories?.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">Most Popular</SelectItem>
              <SelectItem value="rating">Highest Rated</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="updated">Recently Updated</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Templates Grid/List */}
      {isLoading ? (
        <div className="grid gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded" />
                  <div className="h-3 bg-muted rounded w-5/6" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : templates && templates.length > 0 ? (
        <div className={cn(
          viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-2"
        )}>
          {templates.map((template) => 
            viewMode === 'grid' ? (
              <TemplateCard key={template.id} template={template} />
            ) : (
              <TemplateListItem key={template.id} template={template} />
            )
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No templates found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search or filters to find what you're looking for.
          </p>
        </div>
      )}
    </div>
  )
}
