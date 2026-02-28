-- Create table and Seed script for System Wiki content based on roles

CREATE TABLE IF NOT EXISTS public.system_wiki (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    slug text NOT NULL UNIQUE,
    title_en text NOT NULL,
    title_ar text NOT NULL,
    content_en text,
    content_ar text,
    subtopics jsonb DEFAULT '[]'::jsonb,
    allowed_roles app_role[] DEFAULT '{}'::app_role[],
    order_index integer DEFAULT 0,
    is_active boolean DEFAULT true,
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.system_wiki ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.system_wiki;
DROP POLICY IF EXISTS "Enable all access for admins" ON public.system_wiki;

-- Allow read access to all authenticated users (frontend handles role filtering)
CREATE POLICY "Enable read access for all users" ON public.system_wiki
    FOR SELECT TO authenticated USING (true);

-- Allow admins to manage wiki content
CREATE POLICY "Enable all access for admins" ON public.system_wiki
    FOR ALL TO authenticated USING (
      has_role(auth.uid(), 'corporate_admin')
    );

INSERT INTO system_wiki (slug, title_en, title_ar, allowed_roles, is_active, order_index, subtopics)
VALUES
(
  'getting_started',
  'Getting Started',
  'البدء',
  ARRAY['staff', 'manager', 'department_head', 'property_hr', 'property_manager', 'regional_hr', 'regional_admin', 'corporate_admin']::app_role[],
  true,
  10,
  '[
    {
      "id": "interface",
      "title_en": "Interface Anatomy",
      "title_ar": "تشريح الواجهة",
      "content_en": "<p>Welcome to PRIME Connect, the global intranet for PRIME Hotels. This platform centralizes all your HR, operational, and communication needs into a single, secure environment.</p><p>Navigating the system effectively starts with understanding the layout:</p><ul><li><strong>Sidebar Navigation:</strong> Your primary map. Items are grouped logically (e.g., \"My Work\", \"HR Services\"). If you can''t see a link, it may be restricted by your role permissions.</li><li><strong>Top Header:</strong> Contains the <em>Global Search</em> bar, language toggle, and notification bell.</li><li><strong>Breadcrumbs:</strong> Located just below the header, these help you understand where you are within the module hierarchy (e.g., Home &gt; Knowledge &gt; Wiki).</li><li><strong>Search:</strong> Use <code>Ctrl + K</code> to quickly open the global search from anywhere in the app to find staff, documents, or tasks.</li></ul>",
      "content_ar": "<p>مرحباً بكم في PRIME Connect، الإنترانت العالمي لفنادق برايم. تجمع هذه المنصة جميع احتياجاتك في الموارد البشرية والعمليات والاتصالات في بيئة واحدة آمنة.</p><p>يبدأ التنقل في النظام بشكل فعال بفهم التخطيط:</p><ul><li><strong>التنقل في الشريط الجانبي:</strong> خريطتك الأساسية. يتم تجميع العناصر منطقياً. إذا لم تتمكن من رؤية رابط، فقد يكون مقيداً بصلاحيات دورك.</li><li><strong>الرأس العلوي:</strong> يحتوي على شريط البحث العالمي، تبديل اللغة، وجرس الإشعارات.</li><li><strong>التنقل التفصيلي:</strong> يساعدك على فهم موقعك ضمن التسلسل الهرمي.</li><li><strong>البحث:</strong> استخدم <code>Ctrl + K</code> لفتح البحث العالمي بسرعة من أي مكان في التطبيق.</li></ul>"
    },
    {
      "id": "dashboard",
      "title_en": "Understanding Your Dashboard",
      "title_ar": "فهم لوحة التحكم الخاصة بك",
      "content_en": "<p>Your Dashboard is customized to your role and provides a snapshot of everything requiring your attention.</p><ul><li><strong>To-Do List:</strong> Shows urgent tasks or onboarding slips that require your immediate action. Click on a task to view details or mark it complete.</li><li><strong>My Schedule:</strong> Displays your upcoming shifts for the current week. If you need to request a change, you must do so before the schedule is locked.</li><li><strong>Announcements:</strong> Important updates from your property management or global corporate. Unread announcements will have a badge indicating they are new.</li><li><strong>Training Progress:</strong> A circular gauge showing your completion rate for mandatory safety and compliance courses.</li></ul>",
      "content_ar": "<p>تم تصميم لوحة التحكم خصيصاً لدورك وتوفر لمحة سريعة عن كل ما يتطلب انتباهك.</p><ul><li><strong>قائمة المهام:</strong> تعرض المهام العاجلة التي تتطلب إجراءً فورياً.</li><li><strong>جدولي الزمني:</strong> يعرض مناوباتك القادمة للأسبوع الحالي.</li><li><strong>الإعلانات:</strong> تحديثات هامة من إدارة الفندق أو الإدارة المركزية.</li><li><strong>تقدم التدريب:</strong> مؤشر دائري يوضح معدل إكمالك للدورات الإلزامية.</li></ul>"
    },
    {
      "id": "profile",
      "title_en": "Setting Up Your Profile",
      "title_ar": "إعداد الملف الشخصي",
      "content_en": "<p>Keeping your profile up-to-date ensures your notifications are routed correctly and colleagues can collaborate with you.</p><ul><li><strong>Access Settings:</strong> Click on your Avatar (Top Right) &gt; My Profile.</li><li><strong>Verification:</strong> Ensure your English and Arabic names match your official HR records.</li><li><strong>Notification Hub:</strong> Navigate to the Preferences tab in your profile. Toggle Email Alerts for high-priority items like Task Assignments and Approval Status changes.</li><li><strong>Two-Factor Auth:</strong> For Admin/GM roles, ensure 2FA is enabled via your profile security settings.</li></ul>",
      "content_ar": "<p>يضمن تحديث ملفك الشخصي توجيه إشعاراتك بشكل صحيح وإمكانية تعاون زملائك معك.</p><ul><li><strong>إعدادات الوصول:</strong> انقر على صورتك الرمزية في أعلى الشاشة &gt; الملف الشخصي.</li><li><strong>التأكيد:</strong> تأكد من تطابق اسمك باللغتين الإنجليزية والعربية مع سجلات الموارد البشرية.</li><li><strong>الإشعارات:</strong> توجه إلى قسم التفضيلات لتفعيل التنبيهات.</li></ul>"
    },
    {
      "id": "translations",
      "title_en": "Translations & RTL Support",
      "title_ar": "الترجمة ودعم اللغة العربية",
      "content_en": "<p>The system is natively bilingual. Switching between English and Arabic changes the Directionality of the entire app.</p><ul><li><strong>Language Toggle:</strong> Clicking the globe icon flips the layout (LTR to RTL) and swaps all translations.</li><li><strong>Hijri Calendar:</strong> In Arabic mode, date pickers and calendars will allow for Hijri date selection in accordance with KSA standards.</li><li><strong>AI Translation:</strong> If a colleague messages you in a language you don''t speak, look for the Translate button on the message bubble to see an AI-generated conversion.</li></ul>",
      "content_ar": "<p>النظام ثنائي اللغة أصلًا. التبديل بين الإنجليزية والعربية يغير اتجاه التطبيق بالكامل (ميزة الـ RTL).</p><ul><li><strong>تغيير اللغة:</strong> النقر على الأيقونة يقلب واجهة المستخدم ويعرضها باللغة المختارة.</li><li><strong>التقويم الهجري:</strong> في النسخة العربية، يتم دعم التواريخ الهجرية وتخصيصها.</li></ul>"
    }
  ]'::jsonb
),
(
  'my_work',
  'My Work & Tasks',
  'عملي والمهام',
  ARRAY['staff', 'manager', 'department_head', 'property_hr', 'property_manager']::app_role[],
  true,
  20,
  '[
    {
      "id": "task_lifecycle",
      "title_en": "Task Lifecycle & Management",
      "title_ar": "دورة حياة المهام وإدارتها",
      "content_en": "<p>Learn how to manage your daily responsibilities, complete training, and interact with colleagues in real-time.</p><p>Understanding Task States:</p><ul><li><strong>To Do:</strong> New tasks awaiting start.</li><li><strong>In Progress:</strong> Active work. Moving a task here notifies your manager work has begun.</li><li><strong>Blocked:</strong> Use this if you are waiting on another department. Always add a comment explaining why.</li><li><strong>Done:</strong> Complete work. These will move to the Archive after 7 days.</li></ul><p>Collaboration Tips: Mention colleagues using @name in comments to notify them. Attach photos or PDFs to task comments for evidence of completion (e.g., a photo of a clean lobby).</p>",
      "content_ar": "<p>تعرف على كيفية إدارة مسؤولياتك اليومية وإكمال التدريب والتفاعل مع الزملاء.</p><p>فهم حالات المهام:</p><ul><li><strong>للعمل:</strong> مهام جديدة في انتظار البدء.</li><li><strong>قيد التنفيذ:</strong> عمل نشط يتم إشعار مديرك ببدئه.</li><li><strong>محظور:</strong> استخدم هذا إذا كنت تنتظر إدارة أخرى. أضف دائمًا تعليقًا يوضح السبب.</li><li><strong>تم:</strong> العمل المنجز.</li></ul><p>نصائح: قم بالإشارة للزملاء باستخدام @name لإعلامهم. قم بإرفاق الصور أو المستندات كأدلة على الإنجاز.</p>"
    },
    {
      "id": "learning_hub",
      "title_en": "Learning & Training",
      "title_ar": "التعلم والتدريب",
      "content_en": "<p>Your portal for career growth and mandatory certifications.</p><ul><li><strong>Assignments:</strong> Any SOP reading or Quiz assigned to you will appear under \"My Assignments\". You cannot mark these complete without opening and interacting with the content.</li><li><strong>Certification Expiry:</strong> If a mandatory safety certificate (e.g., Fire Safety) is approaching expiry, the system will auto-enroll you in the refresher course 30 days prior.</li><li><strong>Knowledge Base (SOPs):</strong> Use the Knowledge Base to search for specific procedures. You can download these as PDFs for offline viewing.</li></ul>",
      "content_ar": "<p>بوابتك للنمو الوظيفي والشهادات الإلزامية.</p><ul><li><strong>التكليفات:</strong> أي قراءة أو اختبار موجه لك سيظهر هنا. يجب التفاعل مع المحتوى لإتمامه.</li><li><strong>انتهاء الشهادات:</strong> سيقوم النظام بالتسجيل التلقائي لإعادة التدريب قبل 30 يوماً من انتهاء صلاحية شهاداتك الضرورية (مثل السلامة من الحرائق).</li><li><strong>قاعدة المعرفة:</strong> للبحث عن الإجراءات المحددة وتحميلها كملفات PDF.</li></ul>"
    }
  ]'::jsonb
),
(
  'hr_services',
  'HR Services',
  'خدمات الموارد البشرية',
  ARRAY['staff', 'manager', 'department_head', 'property_hr', 'property_manager']::app_role[],
  true,
  30,
  '[
    {
      "id": "leave_requests",
      "title_en": "Leave & Absence Management",
      "title_ar": "إدارة الإجازات والغياب",
      "content_en": "<p>Handle all your HR requests without paper trails.</p><ul><li><strong>Submitting a Leave:</strong> Go to HR Services &gt; Leave Requests. Select the Request Type (Annual, Sick, Unpaid). The system will automatically calculate if you have enough balance.</li><li><strong>Sick Leave Protocol:</strong> For Sick Leave, you MUST upload a medical certificate PDF. The request will be blocked otherwise.</li><li><strong>Approval Workflow:</strong> Leave requests go to your Direct Manager first. If the duration exceeds 14 days, it will automatically escalate to Property HR for secondary approval.</li></ul>",
      "content_ar": "<p>تعامل مع جميع طلبات الموارد البشرية الخاصة بك بدون الحاجة للأعمال الورقية.</p><ul><li><strong>تقديم طلب إجازة:</strong> من القائمة، اختر نوع الإجازة وسيحسب النظام رصيدك المتبقي.</li><li><strong>الإجازات المرضية:</strong> لابد من إرفاق تقرير طبي بصيغة PDF لكي يتم الموافقة.</li><li><strong>مسار الموافقة:</strong> يذهب الطلب لمديرك المباشر أولا، وإذا تخطت الإجازة 14 يوماً تصعد مباشرة لقسم الموارد البشرية للموافقة النهائية.</li></ul>"
    },
    {
      "id": "payslips",
      "title_en": "Payslips & Certificates",
      "title_ar": "مسيرات الرواتب والشهادات",
      "content_en": "<p>Access your financial and employment documents securely.</p><ul><li><strong>Monthly Payslips:</strong> Available on the 28th of each Gregorian month. You must enter your 2FA pin to download the PDF.</li><li><strong>Letter Requests:</strong> Request standard letters like \"Salary Certificate\" or \"NOC\" directly from the HR dashboard. Once generated by HR, you will receive a push notification to download it from your profile.</li></ul>",
      "content_ar": "<p>الوصول الآمن إلى مستنداتك المالية والوظيفية.</p><ul><li><strong>مسيرات الرواتب الشهرية:</strong> تتاح يوم 28 من كل شهر ميلادي. قد تحتاج لرمز الدخول الثنائي لتحميلها.</li><li><strong>طلبات الخطابات:</strong> اطلب شهادة راتب أو إشعار عدم ممانعة وسيتم إشعارك فور إصدارها.</li></ul>"
    }
  ]'::jsonb
),
(
  'team_management',
  'Team Management',
  'إدارة الفريق',
  ARRAY['manager', 'department_head', 'property_hr', 'property_manager']::app_role[],
  true,
  40,
  '[
    {
      "id": "approvals",
      "title_en": "Approvals & Schedules",
      "title_ar": "الموافقات والجداول الزمنية",
      "content_en": "<p>Tools for Supervisors and Department Heads to build efficient, compliant operations.</p><ul><li><strong>Approval Queue:</strong> Your clearinghouse for everything your team submits (Leaves, Expenses, Shift Swaps). You can \"Bulk Approve\" items, but it is recommended to review justifications, especially for overtime.</li><li><strong>Delegation:</strong> Going on leave? Setup an \"Approval Delegation\" rule to route your team''s requests to the Assistant Manager while you are away. The system will auto-revoke this access on your return date.</li></ul>",
      "content_ar": "<p>أدوات للمشرفين ورؤساء الأقسام لبناء عمليات فعالة ومتطابقة.</p><ul><li><strong>طابور الموافقات:</strong> لمراجعة طلبات فريقك. يمكنك عمل موافقة جماعية، ولكن يُفضل مراجعة المبررات في طلبات العمل الإضافي.</li><li><strong>التفويض:</strong> عند خروجك في إجازة، قم بوضع تفويض ليتم الموافقة على طلبات فريقك من قبل مساعد المدير. سيتم إلغاء التفويض تلقائياً عند عودتك.</li></ul>"
    },
    {
      "id": "performance",
      "title_en": "Task Assignment & Performance",
      "title_ar": "إسناد المهام والأداء",
      "content_en": "<p>Monitor execution and assign cross-functional work.</p><ul><li><strong>Assigning Work:</strong> Create Tasks and assign them globally. If you assign a task to someone outside your department (e.g., asking Maintenance to fix a light), their manager will be CC''d via notification.</li><li><strong>Team Analytics:</strong> View the \"Productivity\" tab to see who completes tasks fastest and who is struggling. Use this data for monthly 1-on-1 reviews.</li></ul>",
      "content_ar": "<p>مراقبة التنفيذ وإسناد الأعمال عبر الأقسام المختلفة.</p><ul><li><strong>إسناد العمل:</strong> يمكنك إسناد مهام لأي قسم وسيحصل مدير القسم على إشعار لمعرفته بالدور المطلوب.</li><li><strong>تحليلات الفريق:</strong> توفر شاشة الإنتاجية إحصائيات حول أسرع موظف في إنجاز المهام وأيهم بحاجة للتدريب الإضافي.</li></ul>"
    }
  ]'::jsonb
),
(
  'property_management',
  'Property Management',
  'إدارة الممتلكات (الفندق)',
  ARRAY['property_hr', 'property_manager']::app_role[],
  true,
  50,
  '[
    {
      "id": "hotel_configuration",
      "title_en": "Hotel Configuration & Departments",
      "title_ar": "إعدادات الفندق والأقسام",
      "content_en": "<p>Configure property-specific settings and oversee department structures.</p><ul><li><strong>Department Hierarchy:</strong> Add or remove sub-departments. The GM must approve structural changes.</li><li><strong>Property Branding:</strong> Upload your specific property logo and banner images for the landing page.</li><li><strong>Location Data:</strong> Update emergency contacts and property address information used in automated templates.</li></ul>",
      "content_ar": "<p>تكوين الإعدادات الخاصة بالفندق والإشراف على هياكل الأقسام.</p><ul><li><strong>هيكلة الأقسام:</strong> إضافة أو إزالة أقسام فرعية.</li><li><strong>العلامة التجارية للممتلكات:</strong> رفع شعار فندقك المخصص وصور اللافتة.</li><li><strong>بيانات الموقع:</strong> تحديث بيانات الطوارئ والعنوان المستخدمة في القوالب.</li></ul>"
    },
    {
      "id": "compliance",
      "title_en": "Audit & Compliance Tracking",
      "title_ar": "التدقيق ومتابعة الامتثال",
      "content_en": "<p>Track regulatory compliance and safety audits specific to your hotel.</p><ul><li><strong>Safety Standards:</strong> Monitor the completion percentage of mandatory safety courses for all property staff.</li><li><strong>Incident Reports:</strong> Review auto-generated incident summaries and follow up on Corrective Action Plans.</li></ul>",
      "content_ar": "<p>تتبع الامتثال التنظيمي وتدقيقات السلامة الخاصة بفندقك.</p><ul><li><strong>معايير السلامة:</strong> مراقبة معدل إكمال دورات السلامة الإلزامية لجميع موظفي الفندق.</li><li><strong>تقارير الحوادث:</strong> مراجعة ملخصات الحوادث الناتجة تلقائياً ومتابعة الإجراءات التصحيحية.</li></ul>"
    }
  ]'::jsonb
),
(
  'regional_management',
  'Regional Management',
  'الإدارة الإقليمية',
  ARRAY['regional_hr', 'regional_admin']::app_role[],
  true,
  60,
  '[
    {
      "id": "portfolio",
      "title_en": "Portfolio Overview",
      "title_ar": "الرؤية العامة للمحفظة",
      "content_en": "<p>Keep an eye on multiple properties (Clusters) within your geographic area.</p><ul><li><strong>Cluster Dashboard:</strong> The \"My Cluster\" view aggregates KPIs (Occupancy, SLA adherence, staff turnover) across all assigned hotels.</li><li><strong>Property Comparison:</strong> Contrast financial margins and task completion rates between different properties to identify high and low performers.</li></ul>",
      "content_ar": "<p>مراقبة عدة فنادق (المجموعات) ضمن منطقتك الجغرافية.</p><ul><li><strong>لوحة تحكم المجموعة:</strong> تجمع مؤشرات الأداء الرئيسية لجميع فنادقك في عرض واحد (على سبيل المثال: الإشغال، والامتثال، وتسرب الموظفين).</li><li><strong>مقارنة الممتلكات (الفنادق):</strong> مقارنة هوامش الربح ومعدلات الإنجاز لتمييز الفنادق ذات الأداء العالي عن تلك التي تحتاج إلى دعم.</li></ul>"
    }
  ]'::jsonb
),
(
  'system_admin',
  'System Administration',
  'إدارة النظام',
  ARRAY['corporate_admin']::app_role[],
  true,
  70,
  '[
    {
      "id": "global_config",
      "title_en": "Global App Configuration",
      "title_ar": "الإعدادات العالمية للنظام",
      "content_en": "<p>Control the core behavior of the entire PRIME Connect application.</p><ul><li><strong>Global Parameters:</strong> Manage allowed file upload formats, default currency (SAR), and timezone (AST).</li><li><strong>Knowledge Base Governance:</strong> Oversee Document Versioning. Every policy change requires a version bump and mandatory staff acknowledgment.</li></ul>",
      "content_ar": "<p>التحكم في السلوك الأساسي لتطبيق PRIME Connect عبر جميع المواقع.</p><ul><li><strong>المحددات العالمية:</strong> إدارة صيغ الملفات المسموحة وحجم الملفات، العملة الافتراضية، وتحديد المنطقة الزمنية القياسية.</li><li><strong>حوكمة قاعدة المعرفة:</strong> كل تعديل على أي سياسة يتطلب تحديثاً إلزامياً وإشعار لجميع الموظفين.</li></ul>"
    },
    {
      "id": "security",
      "title_en": "Security & Audit Tracking",
      "title_ar": "الأمان ومتابعة التدقيق",
      "content_en": "<p>Central control over user roles, permissions, and security compliance.</p><ul><li><strong>System Audit Logs:</strong> Tracking of Create, Update, and Delete actions on all database tables (RLS enforced).</li><li><strong>SLA Monitoring:</strong> Define mandatory response times for Maintenance tickets or Guest requests. Critical alerts are sent to Management if SLAs are breached.</li></ul>",
      "content_ar": "<p>تحكم مركزي في أدوار المستخدمين والأذونات وحوادث الامتثال.</p><ul><li><strong>سجلات تدقيق النظام:</strong> تتبع جميع عمليات الإنشاء والتعديل والحذف وتحديد مصدرها.</li><li><strong>مراقبة اتفاقيات مستوى الخدمة (SLA):</strong> تحديد الأوقات القياسية للرد وإرسال إنذارات فورية إذا تم الانتهاك.</li></ul>"
    }
  ]'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  title_en = EXCLUDED.title_en,
  title_ar = EXCLUDED.title_ar,
  allowed_roles = EXCLUDED.allowed_roles,
  order_index = EXCLUDED.order_index,
  subtopics = EXCLUDED.subtopics;
