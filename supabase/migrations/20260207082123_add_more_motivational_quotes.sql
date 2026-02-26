-- Add more motivational quotes including Arabic personalities
INSERT INTO public.motivational_content (content_en, content_ar, author_en, author_ar, category) VALUES
-- Arabic Leaders and Thinkers
('The greatest glory in living lies not in never falling, but in rising every time we fall.', 'أعظم مجد في الحياة لا يكمن في عدم السقوط أبدًا، بل في النهوض في كل مرة نسقط فيها.', 'Nelson Mandela', 'نيلسون مانديلا', 'leadership'),
('Knowledge is power and enthusiasm pulls the switch.', 'المعرفة قوة، والحماس هو الذي يضغط على المفتاح.', 'Steve Droke', 'ستيف دروك', 'leadership'),
('The only way to do great work is to love what you do.', 'الطريقة الوحيدة لعمل أشياء عظيمة هي أن تحب ما تفعله.', 'Steve Jobs', 'ستيف جوبز', 'leadership'),
('Excellence is never an accident. It is always the result of high intention, sincere effort, and intelligent execution.', 'التميز ليس أبدًا حادثًا. إنه دائمًا نية عالية، وجهد مخلص، وتنفيذ ذكي.', 'Aristotle', 'أرسطو', 'service'),

-- Famous Arabic Personalities
('If knowledge had no other merit than to save man from pride, it would be enough.', 'لو لم يكن للعلم فضل إلا أنه ينجي الإنسان من الكبر، لكفى.', 'Imam Al-Ghazali', 'الإمام الغزالي', 'general'),
('The ink of the scholar is more sacred than the blood of the martyr.', 'مداد العلماء أقدس من دم الشهداء.', 'Prophet Muhammad', 'النبي محمد', 'general'),
('Seek knowledge from the cradle to the grave.', 'اطلب العلم من المهد إلى اللحد.', 'Prophet Muhammad', 'النبي محمد', 'general'),
('Your work is a reflection of your character. Make it beautiful.', 'عملك هو انعكاس لشخصيتك. اجعله جميلاً.', 'Khalil Gibran', 'جبران خليل جبران', 'service'),
('The beauty of life does not depend on how happy you are, but on how happy others can be because of you.', 'جمال الحياة لا يعتمد على مدى سعادتك، بل على مدى سعادة الآخرين بسبلك.', 'Khalil Gibran', 'جبران خليل جبران', 'service'),
('Patience is bitter, but its fruit is sweet.', 'الصبر مر، لكن ثمرته حلوة.', 'Jean-Jacques Rousseau', 'جان جاك روسو', 'wellness'),
('He who has health has hope; and he who has hope has everything.', 'من لديه الصحة لديه الأمل؛ ومن لديه الأمل لديه كل شيء.', 'Arabic Proverb', 'مثل عربي', 'wellness'),

-- Modern Leadership and Service
('The way to get started is to quit talking and begin doing.', 'الطريقة للبدء هي التوقف عن الكلام والبدء في الفعل.', 'Walt Disney', 'والت ديزني', 'leadership'),
('Don''t watch the clock; do what it does. Keep going.', 'لا تراقب الساعة؛ افعل ما تفعله. استمر في التحرك.', 'Sam Levenson', 'سام ليفنسون', 'leadership'),
('The future belongs to those who believe in the beauty of their dreams.', 'المستقبل ينتمي إلى أولئك الذين يؤمنون بجمال أحلامهم.', 'Eleanor Roosevelt', 'إليانور روزفلت', 'general'),
('It does not matter how slowly you go as long as you do not stop.', 'لا يهم مدى بطء سيرك طالما أنك لا تتوقف.', 'Confucius', 'كونفوشيوس', 'general'),

-- Customer Service Excellence
('We see our customers as invited guests to a party, and we are the hosts. It''s our job every day to make every important aspect of the customer experience a little bit better.', 'نرى عملائنا كضيوف مدعوين إلى حفلة، ونحن المضيفون. مهمتنا كل يوم هي جعل كل جانب مهم من تجربة العميل أفضل قليلاً.', 'Jeff Bezos', 'جيف بيزوس', 'service'),
('Your most unhappy customers are your greatest source of learning.', 'أكثر عملائك تعاسة هم أعظم مصدر للتعلم.', 'Bill Gates', 'بيل غيتس', 'service'),
('Quality in a service or product is not what you put into it. It is what the client gets out of it.', 'الجودة في الخدمة أو المنتج لا تكمن في ما تضعه فيه، بل في ما يحصل عليه العميل.', 'Peter Drucker', 'بيتر دراكر', 'service'),

-- Wellness and Work-Life Balance
('Take care of your body. It''s the only place you have to live.', 'اعتن بجسدك. إنه المكان الوحيد الذي تعيش فيه.', 'Jim Rohn', 'جيم رون', 'wellness'),
('The time to relax is when you don''t have time for it.', 'وقت الاسترخاء هو عندما ليس لديك وقت له.', 'Sydney J. Harris', 'سيدني هاريس', 'wellness'),
('A healthy outside starts from the inside.', 'صحة الخارج تبدأ من الداخل.', 'Robert Urich', 'روبرت أوريك', 'wellness'),

-- Sales and Performance
('Sales are contingent upon the attitude of the salesman, not the attitude of the prospect.', 'المبيعات تعتمد على موقف البائع، وليس على موقف العميل المحتمل.', 'W. Clement Stone', 'دبليو كليمنت ستون', 'sales'),
('You don''t close a sale; you open a relationship if you want to build a long-term, successful enterprise.', 'أنت لا تغلق صفقة؛ بل تفتح علاقة إذا كنت تريد بناء مؤسسة ناجحة طويلة الأمد.', 'Patricia Fripp', 'باتريشيا فريب', 'sales'),
('The best salespeople are those who can sell themselves first.', 'أفضل البائعين هم أولئك الذين يستطيعون بيع أنفسهم أولاً.', 'Zig Ziglar', 'زيغ زيغلار', 'sales'),

-- Additional Arabic Wisdom
('A friend is known in adversity.', 'الصديق يعرف في الشدة.', 'Arabic Proverb', 'مثل عربي', 'general'),
('The mind is like a parachute. It only works when it''s open.', 'العقل مثل المظلة. لا يعمل إلا عندما يكون مفتوحًا.', 'Albert Einstein', 'ألبرت أينشتاين', 'general'),
('Action is the foundational key to all success.', 'الفعل هو المفتاح الأساسي لكل نجاح.', 'Pablo Picasso', 'بابلو بيكاسو', 'leadership'),
('The only impossible journey is the one you never begin.', 'الرحلة المستحيلة الوحيدة هي التي لا تبدأها أبدًا.', 'Tony Robbins', 'توني روبنز', 'general'),
('In the middle of difficulty lies opportunity.', 'في وسط الصعوبة يكمن الفرصة.', 'Albert Einstein', 'ألبرت أينشتاين', 'leadership');;
