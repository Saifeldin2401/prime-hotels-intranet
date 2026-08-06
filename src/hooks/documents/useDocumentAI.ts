import { supabase } from '@/lib/supabase'
import { useCallback, useState } from 'react'
import type { AISuggestion } from './types'
import { calculateSimilarity, extractTagKeywords } from './utils'

export function useAISuggestTags() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([])

  const suggestTags = useCallback(async (documentId: string): Promise<AISuggestion[]> => {
    setIsGenerating(true)
    try {
      const { data: doc, error } = await supabase
        .from('documents')
        .select('title, content, description, file_type')
        .eq('id', documentId)
        .single()

      if (error) throw error

      const { data: aiData, error: aiError } = await supabase.functions.invoke('process-ai-request', {
        body: {
          task: 'chat',
          prompt: `Analyze this document and suggest relevant tags.

Title: ${doc.title}
Description: ${doc.description || 'N/A'}
File Type: ${doc.file_type || 'N/A'}
Content Preview: ${doc.content?.slice(0, 2000) || 'N/A'}

Suggest 5-8 relevant tags for categorizing this document. Consider:
- Department (HR, Finance, Operations, etc.)
- Document type (Policy, SOP, Report, etc.)
- Topic (Safety, Training, Compliance, etc.)
- Hotel operations area (Front Desk, Housekeeping, F&B, etc.)

Return as JSON array: [{"value": "tag-name", "confidence": "high|medium|low", "reason": "brief explanation"}]`,
        }
      })

      if (aiError) throw aiError

      let parsedSuggestions: AISuggestion[] = []

      if (typeof aiData?.response === 'string') {
        try {
          const jsonMatch = aiData.response.match(/\[[\s\S]*\]/)
          if (jsonMatch) {
            parsedSuggestions = JSON.parse(jsonMatch[0])
          }
        } catch (e) {
          console.warn('AI tag suggestions parsing failed:', e)
          parsedSuggestions = extractTagKeywords(doc.title, doc.content, doc.description)
        }
      }

      setSuggestions(parsedSuggestions)
      return parsedSuggestions
    } catch (error) {
      console.error('Failed to suggest tags:', error)
      const fallback = extractTagKeywords('', '', '')
      setSuggestions(fallback)
      return fallback
    } finally {
      setIsGenerating(false)
    }
  }, [])

  return { suggestTags, suggestions, isGenerating }
}

export function useAIClassifyFolder() {
  const [isClassifying, setIsClassifying] = useState(false)
  const [suggestion, setSuggestion] = useState<AISuggestion | null>(null)

  const classifyFolder = useCallback(async (documentId: string): Promise<AISuggestion | null> => {
    setIsClassifying(true)
    try {
      const { data: doc, error } = await supabase
        .from('documents')
        .select('title, content, description, file_type')
        .eq('id', documentId)
        .single()

      if (error) throw error

      const { data: folders, error: foldersError } = await supabase
        .from('document_folders')
        .select('id, name, description')

      if (foldersError) throw foldersError

      const { data: aiData, error: aiError } = await supabase.functions.invoke('process-ai-request', {
        body: {
          task: 'chat',
          prompt: `Classify this document into the most appropriate folder.

Document:
Title: ${doc.title}
Description: ${doc.description || 'N/A'}
File Type: ${doc.file_type || 'N/A'}
Content Preview: ${doc.content?.slice(0, 1500) || 'N/A'}

Available Folders:
${folders?.map(f => `- ${f.name} (ID: ${f.id}): ${f.description || 'No description'}`).join('\n')}

Suggest the best folder ID and explain why. Return as JSON:
{"value": "folder-id", "confidence": "high|medium|low", "reason": "explanation"}`,
        }
      })

      if (aiError) throw aiError

      let result: AISuggestion | null = null

      if (typeof aiData?.response === 'string') {
        try {
          const jsonMatch = aiData.response.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            result = JSON.parse(jsonMatch[0])
          }
        } catch (e) {
          console.warn('AI folder classification parsing failed:', e)
        }
      }

      setSuggestion(result)
      return result
    } catch (error) {
      console.error('Failed to classify folder:', error)
      return null
    } finally {
      setIsClassifying(false)
    }
  }, [])

  return { classifyFolder, suggestion, isClassifying }
}

export function useAIDetectDuplicates() {
  const [isDetecting, setIsDetecting] = useState(false)
  const [duplicates, setDuplicates] = useState<Array<{ id: string; title: string; similarity: number }>>([])

  const detectDuplicates = useCallback(async (file: File): Promise<Array<{ id: string; title: string; similarity: number }>> => {
    setIsDetecting(true)
    try {
      const fileContent = await file.text().catch(() => '')

      const { data: existingDocs, error } = await supabase
        .from('documents')
        .select('id, title, content, file_type, file_hash')
        .eq('is_deleted', false)
        .limit(100)

      if (error) throw error

      const potentialDuplicates = existingDocs?.filter(doc =>
        doc.file_type === file.type ||
        calculateSimilarity(file.name, doc.title) > 70
      ) || []

      if (potentialDuplicates.length > 0 && fileContent.length > 0) {
        const { data: aiData } = await supabase.functions.invoke('process-ai-request', {
          body: {
            task: 'chat',
            prompt: `Compare this new document with existing documents to find duplicates.

New Document:
Name: ${file.name}
Type: ${file.type}
Content Preview: ${fileContent.slice(0, 2000)}

Existing Documents:
${potentialDuplicates.map(d => `ID: ${d.id}, Title: ${d.title}, Type: ${d.file_type}`).join('\n')}

Return IDs of likely duplicates with confidence scores as JSON array:
[{"id": "doc-id", "title": "doc title", "similarity": 85}]`,
          }
        })

        if (typeof aiData?.response === 'string') {
          try {
            const jsonMatch = aiData.response.match(/\[[\s\S]*\]/)
            if (jsonMatch) {
              const aiResults = JSON.parse(jsonMatch[0])
              setDuplicates(aiResults)
              return aiResults
            }
          } catch (e) {
            console.warn('AI duplicates parsing failed:', e)
          }
        }
      }

      const results = potentialDuplicates.map(doc => ({
        id: doc.id,
        title: doc.title,
        similarity: calculateSimilarity(file.name, doc.title)
      })).filter(d => d.similarity > 60)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 5)

      setDuplicates(results)
      return results
    } catch (error) {
      console.error('Failed to detect duplicates:', error)
      return []
    } finally {
      setIsDetecting(false)
    }
  }, [])

  return { detectDuplicates, duplicates, isDetecting }
}

export function useAISummarizeDocument() {
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)

  const summarizeDocument = useCallback(async (documentId: string): Promise<string | null> => {
    setIsSummarizing(true)
    try {
      const { data: doc, error } = await supabase
        .from('documents')
        .select('title, content, description')
        .eq('id', documentId)
        .single()

      if (error) throw error

      const { data: aiData, error: aiError } = await supabase.functions.invoke('process-ai-request', {
        body: {
          task: 'chat',
          prompt: `Summarize this hotel document concisely.

Title: ${doc.title}
Description: ${doc.description || 'N/A'}
Content: ${doc.content?.slice(0, 5000) || 'N/A'}

Provide:
1. A 1-2 sentence summary
2. Key points (3-5 bullet points)
3. Action items (if any)

Format as plain text.`,
        }
      })

      if (aiError) throw aiError

      const result = typeof aiData?.response === 'string' ? aiData.response : null
      setSummary(result)

      if (result) {
        const { error: updateError } = await supabase
          .from('documents')
          .update({ summary: result })
          .eq('id', documentId)
        if (updateError) console.error('Failed to persist AI summary:', updateError)
      }

      return result
    } catch (error) {
      console.error('Failed to summarize document:', error)
      return null
    } finally {
      setIsSummarizing(false)
    }
  }, [])

  return { summarizeDocument, summary, isSummarizing }
}
