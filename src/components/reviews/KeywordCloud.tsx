import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Hash, MessageSquare } from 'lucide-react'

interface GuestReview {
  id: string
  review_text?: string
  summary_en?: string
  issues?: Array<{
    category: string
    issue_summary_en?: string
  }>
}

interface KeywordCloudProps {
  reviews: GuestReview[]
  maxKeywords?: number
  className?: string
}

// Common stop words to filter out
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
  'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at',
  'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after',
  'above', 'below', 'between', 'under', 'again', 'further', 'then',
  'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all',
  'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
  'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too',
  'very', 'just', 'and', 'but', 'if', 'or', 'because', 'until',
  'while', 'this', 'that', 'these', 'those', 'i', 'me', 'my',
  'myself', 'we', 'our', 'you', 'your', 'he', 'him', 'his',
  'she', 'her', 'it', 'its', 'they', 'them', 'their', 'what',
  'which', 'who', 'whom', 'whose', 'where', 'when', 'why',
  'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most',
  'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
  'same', 'so', 'than', 'too', 'very', 's', 't', 'don', 'doesn',
  'didn', 'wasn', 'weren', 'haven', 'hasn', 'hadn', 'won', 'wouldn',
  'couldn', 'shouldn', 'isn', 'aren', 'ain', 'ma', 'mightn',
  'mustn', 'needn', 'shan', 'shouldn', 'wasn', 'weren', 'won',
  'wouldn', 'y', 'ain', 'aren', 'couldn', 'didn', 'doesn',
  'hadn', 'hasn', 'haven', 'isn', 'let', 'll', 'mustn', 'needn',
  'shan', 'shouldn', 'wasn', 'weren', 'won', 'wouldn', 'y',
  'ain', 'aren', 'couldn', 'didn', 'doesn', 'hadn', 'hasn',
  'haven', 'isn', 'let', 'll', 'mustn', 'needn', 'shan',
  'shouldn', 'wasn', 'weren', 'were', 'aren', 'ain', 'll', 't',
  're', 've', 'm', 's', 'd', 'hotel', 'room', 'stay', 'guest',
  'good', 'great', 'nice', 'really', 'time', 'stayed', 'staff',
  'service', 'clean', 'friendly', 'helpful', 'place', 'one',
  'get', 'go', 'came', 'come', 'got', 'went', 'went', 'made',
  'make', 'felt', 'feel', 'found', 'find', 'took', 'take',
  'gave', 'give', 'left', 'leave', 'kept', 'keep', 'seemed',
  'seem', 'asked', 'ask', 'told', 'tell', 'said', 'say',
  'thought', 'think', 'wanted', 'want', 'needed', 'need',
  'liked', 'like', 'loved', 'love', 'hated', 'hate',
  'enjoyed', 'enjoy', 'recommend', 'recommended', 'would',
  'will', 'definitely', 'absolutely', 'highly', 'sure',
  'back', 'again', 'next', 'everything', 'nothing',
  'something', 'anything', 'everyone', 'someone', 'anyone',
  'always', 'never', 'sometimes', 'often', 'usually',
  'also', 'even', 'still', 'just', 'already', 'yet',
  'well', 'better', 'best', 'bad', 'worse', 'worst',
  'much', 'many', 'more', 'most', 'less', 'least',
  'first', 'last', 'second', 'third', 'next', 'previous',
])

// Hotel-specific keywords to boost
const BOOST_WORDS = new Set([
  'cleanliness', 'clean', 'dirty', 'housekeeping', 'maid',
  'service', 'staff', 'reception', 'concierge', 'bellhop',
  'room', 'suite', 'bed', 'pillow', 'mattress', 'linen',
  'bathroom', 'shower', 'towel', 'toilet', 'amenity',
  'wifi', 'internet', 'tv', 'television', 'ac', 'air',
  'conditioning', 'heating', 'temperature', 'noise', 'quiet',
  'loud', 'sleep', 'rest', 'comfortable', 'uncomfortable',
  'food', 'breakfast', 'restaurant', 'dining', 'meal',
  'location', 'view', 'beach', 'pool', 'gym', 'spa',
  'parking', 'valet', 'laundry', 'iron', 'minibar',
  'checkin', 'checkout', 'late', 'early', 'quick',
  'slow', 'fast', 'speed', 'efficient', 'professional',
  'rude', 'polite', 'courteous', 'unprofessional',
  'maintenance', 'broken', 'repair', 'fix', 'issue',
  'problem', 'complaint', 'complain', 'refund',
])

export function KeywordCloud({ reviews, maxKeywords = 30, className }: KeywordCloudProps) {
  const keywords = useMemo(() => {
    const wordCounts: Record<string, number> = {}
    const wordContexts: Record<string, string[]> = {}

    // Extract words from reviews
    reviews.forEach((review) => {
      const text = review.review_text || review.summary_en || ''
      
      // Extract individual words
      const words = text
        .toLowerCase()
        .replace(/[^a-zA-Z\s]/g, ' ')
        .split(/\s+/)
        .filter((word) => 
          word.length > 2 && 
          !STOP_WORDS.has(word) &&
          !/^\d+$/.test(word)
        )

      words.forEach((word) => {
        wordCounts[word] = (wordCounts[word] || 0) + 1
        
        // Store context
        if (!wordContexts[word]) {
          wordContexts[word] = []
        }
        if (wordContexts[word].length < 3) {
          wordContexts[word].push(text.substring(0, 100))
        }
      })

      // Also extract phrases (2-3 words)
      const phrases: string[] = []
      for (let i = 0; i < words.length - 1; i++) {
        const phrase = `${words[i]} ${words[i + 1]}`
        if (!STOP_WORDS.has(words[i]) && !STOP_WORDS.has(words[i + 1])) {
          phrases.push(phrase)
        }
      }

      phrases.forEach((phrase) => {
        wordCounts[phrase] = (wordCounts[phrase] || 0) + 2 // Weight phrases higher
      })

      // Add issue categories
      review.issues?.forEach((issue) => {
        const category = issue.category?.toLowerCase().replace(/_/g, ' ')
        if (category) {
          wordCounts[category] = (wordCounts[category] || 0) + 5 // High weight for issues
        }
      })
    })

    // Convert to array and calculate scores
    const scoredWords = Object.entries(wordCounts)
      .map(([word, count]) => {
        let score = count
        
        // Boost hotel-specific terms
        const words = word.split(' ')
        words.forEach((w) => {
          if (BOOST_WORDS.has(w)) {
            score *= 1.5
          }
        })

        return {
          word,
          count,
          score,
          contexts: wordContexts[word] || [],
        }
      })
      .filter((item) => item.count >= 2) // Min threshold
      .sort((a, b) => b.score - a.score)
      .slice(0, maxKeywords)

    return scoredWords
  }, [reviews, maxKeywords])

  const maxScore = Math.max(...keywords.map((k) => k.score), 1)

  const getSizeClass = (score: number) => {
    const normalized = score / maxScore
    if (normalized > 0.8) return 'text-lg font-bold'
    if (normalized > 0.6) return 'text-base font-semibold'
    if (normalized > 0.4) return 'text-sm font-medium'
    return 'text-xs'
  }

  const getColorClass = (word: string) => {
    const lowerWord = word.toLowerCase()
    
    // Negative sentiment words
    if (['dirty', 'rude', 'broken', 'slow', 'bad', 'terrible', 'awful', 'hate', 'worst', 'horrible'].some(w => lowerWord.includes(w))) {
      return 'bg-red-100 text-red-700 hover:bg-red-200'
    }
    
    // Positive sentiment words
    if (['clean', 'friendly', 'helpful', 'great', 'excellent', 'amazing', 'love', 'best', 'perfect', 'wonderful'].some(w => lowerWord.includes(w))) {
      return 'bg-green-100 text-green-700 hover:bg-green-200'
    }
    
    // Neutral/service words
    if (['wifi', 'room', 'service', 'staff', 'location', 'breakfast'].some(w => lowerWord.includes(w))) {
      return 'bg-blue-100 text-blue-700 hover:bg-blue-200'
    }
    
    return 'bg-muted text-muted-foreground hover:bg-muted/80'
  }

  if (keywords.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Hash className="h-4 w-4 text-primary" />
            Most Mentioned Topics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Not enough data</p>
            <p className="text-xs">More reviews needed to generate insights</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Hash className="h-4 w-4 text-primary" />
          Most Mentioned Topics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {keywords.map((keyword) => (
            <Badge
              key={keyword.word}
              variant="secondary"
              className={`${getSizeClass(keyword.score)} ${getColorClass(keyword.word)} cursor-default transition-colors`}
              title={`Mentioned ${keyword.count} times${keyword.contexts.length > 0 ? `: "${keyword.contexts[0]}..."` : ''}`}
            >
              {keyword.word}
              <span className="ml-1 opacity-60 text-[10px]">
                {keyword.count}
              </span>
            </Badge>
          ))}
        </div>
        
        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-green-100" />
            <span>Positive</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-red-100" />
            <span>Negative</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-blue-100" />
            <span>Service</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-muted" />
            <span>Other</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
