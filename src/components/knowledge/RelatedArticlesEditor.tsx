/**
 * Related Articles Editor
 * 
 * Component for managing article-to-article relationships.
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import {
    Link2,
    Plus,
    X,
    Search,
    FileText,
    ArrowRight,
    Loader2
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { RelatedArticle } from '@/types/knowledge'

const RELATION_TYPES = [
    { value: 'see_also', label: 'Related / See Also', color: 'blue' },
    { value: 'prerequisite', label: 'Prerequisite (Read First)', color: 'orange' },
    { value: 'supersedes', label: 'Supersedes (Replaces)', color: 'yellow' },
    { value: 'updated_by', label: 'Updated By (Newer Version)', color: 'green' }
] as const

interface RelatedArticlesEditorProps {
    documentId: string
    relatedArticles: RelatedArticle[]
    onUpdate: () => void
}

export function RelatedArticlesEditor({
    documentId,
    relatedArticles,
    onUpdate
}: RelatedArticlesEditorProps) {
    const queryClient = useQueryClient()
    const [searchOpen, setSearchOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedRelationType, setSelectedRelationType] = useState<string>('see_also')

    // Search for articles to link
    const { data: searchResults, isLoading: searchLoading } = useQuery({
        queryKey: ['knowledge-articles-search', searchQuery],
        queryFn: async () => {
            if (!searchQuery.trim()) return []
            const { data, error } = await supabase
                .from('sop_documents')
                .select('id, title, content_type')
                .neq('id', documentId)
                .ilike('title', `%${searchQuery}%`)
                .limit(10)
            if (error) throw error
            return data
        },
        enabled: searchQuery.length > 2
    })

    // Add related article
    const addRelation = useMutation({
        mutationFn: async (relatedDocumentId: string) => {
            const { error } = await supabase
                .from('knowledge_related_articles')
                .insert({
                    document_id: documentId,
                    related_document_id: relatedDocumentId,
                    relation_type: selectedRelationType
                })
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['knowledge-related-articles', documentId] })
            setSearchOpen(false)
            setSearchQuery('')
            onUpdate()
        }
    })

    // Remove related article
    const removeRelation = useMutation({
        mutationFn: async (relatedDocumentId: string) => {
            const { error } = await supabase
                .from('knowledge_related_articles')
                .delete()
                .eq('document_id', documentId)
                .eq('related_document_id', relatedDocumentId)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['knowledge-related-articles', documentId] })
            onUpdate()
        }
    })

    const getRelationConfig = (type: string) =>
        RELATION_TYPES.find(r => r.value === type) || RELATION_TYPES[0]

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Link2 className="h-5 w-5 text-indigo-500" />
                        Related Articles
                        <Badge variant="secondary" className="ml-2">{relatedArticles.length}</Badge>
                    </CardTitle>
                    <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                        <PopoverTrigger asChild>
                            <Button type="button" size="sm">
                                <Plus className="h-4 w-4 mr-1" />
                                Link Article
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-96 p-0" align="end">
                            <div className="p-3 border-b space-y-2">
                                <p className="font-medium text-sm">Add Related Article</p>
                                <Select
                                    value={selectedRelationType}
                                    onValueChange={setSelectedRelationType}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Relation type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {RELATION_TYPES.map(type => (
                                            <SelectItem key={type.value} value={type.value}>
                                                {type.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Command>
                                <CommandInput
                                    placeholder="Search articles..."
                                    value={searchQuery}
                                    onValueChange={setSearchQuery}
                                />
                                <CommandList>
                                    {searchLoading && (
                                        <div className="flex items-center justify-center p-4">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        </div>
                                    )}
                                    <CommandEmpty>
                                        {searchQuery.length < 3
                                            ? 'Type at least 3 characters to search'
                                            : 'No articles found'
                                        }
                                    </CommandEmpty>
                                    <CommandGroup>
                                        {searchResults?.map(article => (
                                            <CommandItem
                                                key={article.id}
                                                onSelect={() => addRelation.mutate(article.id)}
                                                className="cursor-pointer"
                                            >
                                                <FileText className="h-4 w-4 mr-2 text-gray-400" />
                                                <div className="flex-1">
                                                    <p className="text-sm">{article.title}</p>
                                                    <p className="text-xs text-gray-500 capitalize">
                                                        {article.content_type}
                                                    </p>
                                                </div>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>
            </CardHeader>
            <CardContent className="space-y-2">
                {relatedArticles.length === 0 ? (
                    <div className="text-center py-6 text-gray-500">
                        <Link2 className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">No related articles linked</p>
                        <p className="text-xs">Click "Link Article" to connect related content</p>
                    </div>
                ) : (
                    relatedArticles.map(article => {
                        const relationConfig = getRelationConfig(article.relation_type)
                        return (
                            <div
                                key={article.id}
                                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border"
                            >
                                <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{article.title}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Badge variant="outline" className="text-xs capitalize">
                                            {article.content_type}
                                        </Badge>
                                        <ArrowRight className="h-3 w-3 text-gray-400" />
                                        <Badge
                                            variant="secondary"
                                            className={`text-xs bg-${relationConfig.color}-100 text-${relationConfig.color}-700`}
                                        >
                                            {relationConfig.label}
                                        </Badge>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => removeRelation.mutate(article.id)}
                                    disabled={removeRelation.isPending}
                                >
                                    {removeRelation.isPending ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <X className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        )
                    })
                )}
            </CardContent>
        </Card>
    )
}
