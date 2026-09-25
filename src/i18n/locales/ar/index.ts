/**
 * All Arabic namespaces as one module. Loaded on demand (a separate chunk) only when Arabic is selected.
 */
import arAdmin from './admin.json'
import arAnalytics from './analytics.json'
import arAuth from './auth.json'
import arCommon from './common.json'
import arDashboard from './dashboard.json'
import arDocuments from './documents.json'
import arMedia from './media.json'
import arKnowledge from './knowledge.json'
import arNav from './nav.json'
import arProfile from './profile.json'
import arPublic from './public.json'
import arSettings from './settings.json'
import arTraining from './training.json'
import arUsers from './users.json'
import arAiTools from './ai_tools.json'
import arErrors from './errors.json'
import arExtracted from './extracted.json'
import arLearning from './learning.json'
import arRequests from './requests.json'
import arWizard from './wizard.json'
import arDirectory from './directory.json'
import arMessages from './messages.json'
import arNotifications from './notifications.json'
import arTasks from './tasks.json'

const resources = {
  admin: arAdmin,
  analytics: arAnalytics,
  auth: arAuth,
  common: arCommon,
  dashboard: arDashboard,
  documents: arDocuments,
  media: arMedia,
  knowledge: arKnowledge,
  nav: arNav,
  profile: arProfile,
  public: arPublic,
  settings: arSettings,
  training: arTraining,
  users: arUsers,
  ai_tools: arAiTools,
  errors: arErrors,
  extracted: arExtracted,
  learning: arLearning,
  requests: arRequests,
  wizard: { ...arWizard, wizard: { ...arWizard, ...(arWizard.wizard || {}) } },
  directory: arDirectory,
  messages: arMessages,
  notifications: arNotifications,
  tasks: arTasks,
}

export default resources
