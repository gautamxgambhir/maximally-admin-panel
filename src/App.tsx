import { Routes, Route, Navigate } from 'react-router-dom'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { BlogList } from './pages/BlogList'
import { CreateBlog } from './pages/CreateBlog'
import { EditBlog } from './pages/EditBlog'
import { HackathonList } from './pages/HackathonList'
import { CreateHackathon } from './pages/CreateHackathon'
import { EditHackathon } from './pages/EditHackathon'
import { AdminManagement } from './pages/AdminManagement'
import { PeopleManagement } from './pages/PeopleManagement'
import { JudgesManagement } from './pages/JudgesManagement'
import JudgeApplications from './pages/JudgeApplications'
import JudgeInbox from './pages/JudgeInbox'
import { Certificates } from './pages/Certificates'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'

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
              <Dashboard />
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
        path="/certificates"
        element={
          <ProtectedRoute>
            <Layout>
              <Certificates />
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App
