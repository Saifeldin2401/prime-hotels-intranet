import re

file_path = 'src/pages/learning/components/QuizComponentEnhanced.tsx'
with open(file_path, 'r') as f:
    content = f.read()

search_str = """    const translateQuestion = async (questionItem: NonNullable<LearningQuiz['questions']>[number]) => {
        if (!translationTarget || !questionItem?.question) return

        setIsTranslating(true)
        try {
            const questionText = questionItem.question.question_text || ''
            const explanationText = questionItem.question.explanation || ''
            const optionTexts = questionItem.question.options?.map(o => ({ id: o.id, text: o.option_text })) || []

            const [translatedQuestion, translatedExplanation] = await Promise.all([
                translateAI.mutateAsync({ text: questionText, target_lang: translationTarget, source_lang: 'auto' }),
                explanationText
                    ? translateAI.mutateAsync({ text: explanationText, target_lang: translationTarget, source_lang: 'auto' })
                    : Promise.resolve({ translated_text: '' })
            ])

            const translatedOptionsEntries = await Promise.all(
                optionTexts.map(async (opt) => {
                    const res = opt.text
                        ? await translateAI.mutateAsync({ text: opt.text, target_lang: translationTarget, source_lang: 'auto' })
                        : { translated_text: '' }
                    return [opt.id, res.translated_text]
                })
            )

            setTranslatedQuestions(prev => ({
                ...prev,
                [questionItem.question_id]: {
                    ...prev[questionItem.question_id],
                    [translationTarget]: {
                        text: translatedQuestion.translated_text,
                        explanation: translatedExplanation.translated_text,
                        options: Object.fromEntries(translatedOptionsEntries)
                    }
                }
            }))
        } catch (error) {
            console.error('Quiz translation failed:', error)
        } finally {
            setIsTranslating(false)
        }
    }"""

replace_str = """    const translateQuestion = async (questionItem: NonNullable<LearningQuiz['questions']>[number]) => {
        if (!translationTarget || !questionItem?.question) return

        setIsTranslating(true)
        try {
            const questionText = questionItem.question.question_text || ''
            const explanationText = questionItem.question.explanation || ''
            const options = questionItem.question.options || []

            // 1. Collect all texts: [Question, Explanation, Option1, Option2, ...]
            const textsToTranslate = [
                questionText,
                explanationText,
                ...options.map(o => o.option_text || '')
            ]

            // 2. Batch translation call
            const res = await translateAI.mutateAsync({
                texts: textsToTranslate,
                target_lang: translationTarget,
                source_lang: 'auto'
            })

            if (!res.translated_texts) throw new Error('No translations returned')

            // 3. Unpack results
            const translatedQText = res.translated_texts[0]
            const translatedExpText = res.translated_texts[1]
            const translatedOptsList = res.translated_texts.slice(2)

            const translatedOptionsMap: Record<string, string> = {}
            options.forEach((opt, idx) => {
                translatedOptionsMap[opt.id] = translatedOptsList[idx] || ''
            })

            setTranslatedQuestions(prev => ({
                ...prev,
                [questionItem.question_id]: {
                    ...prev[questionItem.question_id],
                    [translationTarget]: {
                        text: translatedQText,
                        explanation: translatedExpText,
                        options: translatedOptionsMap
                    }
                }
            }))
        } catch (error) {
            console.error('Quiz translation failed:', error)
        } finally {
            setIsTranslating(false)
        }
    }

    // Trigger translation when question or language changes
    useEffect(() => {
        if (translationTarget && currentQuestion) {
             const translated = getTranslatedQuestion(currentQuestion)
             if (!translated || !translated.text) {
                 translateQuestion(currentQuestion)
             }
        }
    }, [translationTarget, currentQuestionIndex])"""

if search_str in content:
    new_content = content.replace(search_str, replace_str)
    with open(file_path, 'w') as f:
        f.write(new_content)
    print("Successfully replaced.")
else:
    print("Search string not found.")
