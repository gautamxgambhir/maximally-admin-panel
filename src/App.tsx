import { Routes, Route, Navigate } from 'react-router-dom'
import { Login } from './pages/Login'
import { EnhancedDashboard } from './pages/EnhancedDashboard'
import { BlogList } from './pages/BlogList'
import { CreateBlog } from './pages/CreateBlog'
import { EditBlog } from './pages/EditBlog'
import { HackathonList } from './pages/HackathonList'
import { CreateHackathon } from './pages/CreateHackathon'
import { EditHackathon } from './pages/EditHackathon'
import { AdminManagement } from './pages/AdminManagement'
import { PeopleManagement } from './pages/PeopleManagement'
// REMOVED - Judge account system deprecated (Platform Simplification)
// import { JudgesManagement } from './pages/JudgesManagement'
// import JudgeApplications from './pages/JudgeApplications'
// import JudgeInbox from './pages/JudgeInbox'
// import { JudgeEventsVerification } from './pages/JudgeEventsVerification'
import OrganizerApplications from './pages/OrganizerApplications'
import { Certificates } from './pages/Certificates'
import { EmailGenerator } from './pages/EmailGenerator'
import { OrganizerHackathonRequests } from './pages/OrganizerHackathonRequests'
// REMOVED - Duplicate of Organizer Oversight
// import { OrganizersManagement } from './pages/OrganizersManagement'
import { OrganizerOversight } from './components/OrganizerOversight'
import OrganizerInbox from './pages/OrganizerInbox'
// import { NotificationsManagement } from './pages/NotificationsManagement' // REMOVED - Notification system disabled
// REMOVED - Edit request system deprecated (Platform Simplification - organizers can edit directly)
// import HackathonEditRequests from './pages/HackathonEditRequests'
import UserReports from './pages/UserReports'
import UserModeration from './pages/UserModeration'
import ProjectGalleryModeration from './pages/ProjectGalleryModeration'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
// Admin Moderation System pages
import { ActivityFeed } from './components/ActivityFeed'
import { ModerationQueue } from './components/ModerationQueue'
import AuditLogs from './pages/AuditLogs'
import DataManagement from './pages/DataManagement'
import SystemHealth from './pages/SystemHealth'
import DocsManagement from './pages/DocsManagement'
import NewsletterManagement from './pages/NewsletterManagement'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <EnhancedDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/blogs"
        element={
          <ProtectedRoute>
            <Layout>
              <BlogList />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/blogs/create"
        element={
          <ProtectedRoute>
            <Layout>
              <CreateBlog />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/blogs/edit/:id"
        element={
          <ProtectedRoute>
            <Layout>
              <EditBlog />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/hackathons"
        element={
          <ProtectedRoute>
            <Layout>
              <HackathonList />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/hackathons/create"
        element={
          <ProtectedRoute>
            <Layout>
              <CreateHackathon />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/hackathons/edit/:id"
        element={
          <ProtectedRoute>
            <Layout>
              <EditHackathon />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin-management"
        element={
          <ProtectedRoute>
            <Layout>
              <AdminManagement />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/people"
        element={
          <ProtectedRoute>
            <Layout>
              <PeopleManagement />
            </Layout>
          </ProtectedRoute>
        }
      />
      {/* REMOVED - Judge account system deprecated (Platform Simplification)
      <Route
        path="/judges"
        element={
          <ProtectedRoute>
            <Layout>
              <JudgesManagement />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/judge-applications"
        element={
          <ProtectedRoute>
            <Layout>
              <JudgeApplications />
            </Layout>
          </ProtectedRoute>
        }
      />
      */}
      <Route
        path="/organizer-applications"
        element={
          <ProtectedRoute>
            <Layout>
              <OrganizerApplications />
            </Layout>
          </ProtectedRoute>
        }
      />
      {/* REMOVED - Judge account system deprecated (Platform Simplification)
      <Route
        path="/judge-inbox"
        element={
          <ProtectedRoute>
            <Layout>
              <JudgeInbox />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/judge-events-verification"
        element={
          <ProtectedRoute>
            <Layout>
              <JudgeEventsVerification />
            </Layout>
          </ProtectedRoute>
        }
      />
      */}
      <Route
        path="/certificates"
        element={
          <ProtectedRoute>
            <Layout>
              <Certificates />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/email-generator"
        element={
          <ProtectedRoute>
            <Layout>
              <EmailGenerator />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/organizer-requests"
        element={
          <ProtectedRoute>
            <Layout>
              <OrganizerHackathonRequests />
            </Layout>
          </ProtectedRoute>
        }
      />
      {/* REMOVED - Edit request system deprecated (Platform Simplification - organizers can edit directly)
      <Route
        path="/edit-requests"
        element={
          <ProtectedRoute>
            <Layout>
              <HackathonEditRequests />
            </Layout>
          </ProtectedRoute>
        }
      />
      */}
      {/* REMOVED - Duplicate of Organizer Oversight, organizer_profiles table not populated
      <Route
        path="/organizers"
        element={
          <ProtectedRoute>
            <Layout>
              <OrganizersManagement />
            </Layout>
          </ProtectedRoute>
        }
      />
      */}
      <Route
        path="/organizer-oversight"
        element={
          <ProtectedRoute>
            <Layout>
              <OrganizerOversight />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/organizer-inbox"
        element={
          <ProtectedRoute>
            <Layout>
              <OrganizerInbox />
            </Layout>
          </ProtectedRoute>
        }
      />
      {/* Notifications route - DISABLED */}
      {/* <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <Layout>
              <NotificationsManagement />
            </Layout>
          </ProtectedRoute>
        }
      /> */}
      <Route
        path="/user-reports"
        element={
          <ProtectedRoute>
            <Layout>
              <UserReports />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/user-moderation"
        element={
          <ProtectedRoute>
            <Layout>
              <UserModeration />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/project-gallery"
        element={
          <ProtectedRoute>
            <Layout>
              <ProjectGalleryModeration />
            </Layout>
          </ProtectedRoute>
        }
      />
      {/* Admin Moderation System Routes */}
      <Route
        path="/activity"
        element={
          <ProtectedRoute>
            <Layout>
              <div className="space-y-6">
                <div>
                  <h1 className="text-3xl font-bold">Activity Feed</h1>
                  <p className="text-muted-foreground mt-1">
                    Real-time platform activity monitoring
                  </p>
                </div>
                <ActivityFeed showFilters={true} showStats={true} enableRealtime={true} />
              </div>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/queue"
        element={
          <ProtectedRoute>
            <Layout>
              <div className="space-y-6">
                <div>
                  <h1 className="text-3xl font-bold">Moderation Queue</h1>
                  <p className="text-muted-foreground mt-1">
                    Review and process flagged content
                  </p>
                </div>
                <ModerationQueue />
              </div>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/audit"
        element={
          <ProtectedRoute>
            <Layout>
              <AuditLogs />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/data-management"
        element={
          <ProtectedRoute>
            <Layout>
              <DataManagement />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/system-health"
        element={
          <ProtectedRoute>
            <Layout>
              <SystemHealth />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/docs"
        element={
          <ProtectedRoute>
            <Layout>
              <DocsManagement />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/newsletter"
        element={
          <ProtectedRoute>
            <Layout>
              <NewsletterManagement />
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App
