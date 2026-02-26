import re

file_path = 'src/pages/learning/components/QuizComponentEnhanced.tsx'
with open(file_path, 'r') as f:
    content = f.read()

bad_block = """    // Trigger translation when question or language changes
    useEffect(() => {
        if (translationTarget && currentQuestion) {
             const translated = getTranslatedQuestion(currentQuestion)
             if (!translated || !translated.text) {
                 translateQuestion(currentQuestion)
             }
        }
    }, [translationTarget, currentQuestionIndex])"""

# We redefine currentQuestion locally to be safe and clean
# And depend on quiz and index
fixed_block = """    // Trigger translation when question or language changes
    useEffect(() => {
        const currentQ = quiz?.questions?.[currentQuestionIndex]
        if (translationTarget && currentQ) {
             // Use translateQuestion which is available in scope (hoisted via closure capture or defined above)
             // But getTranslatedQuestion is defined below.
             // To be 100% safe, we can move the check logic or access getTranslatedQuestion if we trust it's initialized.
             // Given getTranslatedQuestion is const, it is initialized by the time effect runs.

             // However, to avoid any linter warnings about missing deps or scope:
             const translated = translatedQuestions[currentQ.question_id]?.[translationTarget]
             if (!translated || !translated.text) {
                 translateQuestion(currentQ)
             }
        }
    }, [translationTarget, currentQuestionIndex, quiz, translatedQuestions])"""

if bad_block in content:
    new_content = content.replace(bad_block, fixed_block)
    with open(file_path, 'w') as f:
        f.write(new_content)
    print("Fixed useEffect.")
else:
    print("Bad block not found.")
