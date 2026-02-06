const fs = require('fs');
const path = require('path');

const filesToFix = [
    'src/pages/tasks/TaskDetail.tsx',
    'src/pages/tasks/TasksDashboard.tsx',
    'src/pages/training/TrainingPlayer.tsx',
    'src/pages/settings/Settings.tsx',
    'src/pages/learning/QuizBuilder.tsx',
    'src/pages/learning/MyLearning.tsx',
    'src/pages/public/PublicHome.tsx',
    'src/pages/learning/components/QuizComponent.tsx',
    'src/pages/profile/MyProfile.tsx',
    'src/pages/operations/OperationsDashboard.tsx',
    'src/pages/knowledge/KnowledgeViewer.tsx',
    'src/pages/knowledge/KnowledgeReview.tsx',
    'src/pages/knowledge/KnowledgeLibrary.tsx',
    'src/pages/knowledge/KnowledgeEditor.tsx',
    'src/pages/knowledge/KnowledgeHome.tsx',
    'src/hooks/useKnowledge.ts',
    'src/hooks/useInactivityTimeout.ts',
    'src/hooks/useNavigation.ts',
    'src/hooks/useNotificationTriggers.ts',
    'src/hooks/useOrgHierarchy.ts',
    'src/hooks/useEmployeeDocuments.ts',
    'src/hooks/useDocuments.ts',
    'src/hooks/usePermissions.ts',
    'src/hooks/useQuestions.ts',
    'src/hooks/useRecentlyViewed.ts',
    'src/hooks/useSessionTimeout.ts',
    'src/components/notifications/NotificationBell.tsx',
    'src/components/tasks/TaskForm.tsx',
    'src/components/training/TrainingProgressVisualization.tsx',
    'src/components/training/TrainingCertificateGenerator.tsx',
    'src/components/documents/RecentlyViewedDocuments.tsx',
    'src/components/profile/UserSkillsDisplay.tsx',
    'src/components/layout/AppLayout.tsx',
    'src/components/layout/SidebarNavigation.tsx',
    'src/components/knowledge/KnowledgeSidebar.tsx',
    'src/components/layout/Header.tsx',
    'src/components/dashboard/KnowledgeWidget.tsx',
    'src/components/documents/DocumentRecommendations.tsx',
    'src/components/documents/DocumentBulkOperations.tsx',
    'src/components/directory/EmployeeAssignmentDialog.tsx',
    'src/components/directory/OrgPyramid.tsx',
    'src/hooks/useTraining.ts',
    'src/components/auth/LoginForm.tsx',
    'src/components/auth/PasswordEnforcementGuard.tsx',
    'src/components/approvals/DelegateApprovalDialog.tsx',
    'src/components/auth/RoleBasedRedirect.tsx',
    'src/components/auth/ProtectedRoute.tsx',
    'src/components/common/WizardTrigger.tsx',
    'src/components/auth/LoginPanel.tsx'
];

const baseDir = process.cwd();

filesToFix.forEach(fileRelPath => {
    const filePath = path.join(baseDir, fileRelPath);
    if (!fs.existsSync(filePath)) {
        console.log(`File not found: ${fileRelPath}`);
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let updatedContent = content.replace(
        /import\s*{\s*useAuth\s*}\s*from\s*'@\/contexts\/AuthContext'/g,
        "import { useAuth } from '@/hooks/useAuth'"
    );

    // Also handle cases with semi-colon inside or single quotes
    updatedContent = updatedContent.replace(
        /import\s*{\s*useAuth\s*}\s*from\s*"@\/contexts\/AuthContext"/g,
        'import { useAuth } from "@/hooks/useAuth"'
    );

    // Handle cases where it might be mixed with other imports (unlikely for this specific case but good for safety)
    // Actually, the grep showed exactly these patterns.

    if (content !== updatedContent) {
        fs.writeFileSync(filePath, updatedContent);
        console.log(`Updated: ${fileRelPath}`);
    } else {
        console.log(`No change for: ${fileRelPath}`);
    }
});
