/**
 * All English namespaces as one module. Bundled with the app as the fallback language.
 */
import enAdmin from './admin.json'
import enAnalytics from './analytics.json'
import enAuth from './auth.json'
import enCommon from './common.json'
import enDashboard from './dashboard.json'
import enDocuments from './documents.json'
import enMedia from './media.json'
import enKnowledge from './knowledge.json'
import enNav from './nav.json'
import enProfile from './profile.json'
import enPublic from './public.json'
import enSettings from './settings.json'
import enTraining from './training.json'
import enUsers from './users.json'
import enAiTools from './ai_tools.json'
import enErrors from './errors.json'
import enExtracted from './extracted.json'
import enLearning from './learning.json'
import enRequests from './requests.json'
import enWizard from './wizard.json'
import enDirectory from './directory.json'
import enMessages from './messages.json'
import enNotifications from './notifications.json'
import enTasks from './tasks.json'

const resources = {
  admin: enAdmin,
  analytics: enAnalytics,
  auth: enAuth,
  common: enCommon,
  dashboard: enDashboard,
  documents: enDocuments,
  media: enMedia,
  knowledge: enKnowledge,
  nav: enNav,
  profile: enProfile,
  public: enPublic,
  settings: enSettings,
  training: enTraining,
  users: enUsers,
  ai_tools: enAiTools,
  errors: enErrors,
  extracted: enExtracted,
  learning: enLearning,
  requests: enRequests,
  wizard: { ...enWizard, wizard: { ...enWizard, ...(enWizard.wizard || {}) } },
  directory: enDirectory,
  messages: enMessages,
  notifications: enNotifications,
  tasks: enTasks,
}

export default resources
