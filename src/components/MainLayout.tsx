import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import EmailList from './EmailList'
import EmailDetail from './EmailDetail'
import ComposeModal from './ComposeModal'
import HottPage from './HottPage'

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [composeOpen, setComposeOpen] = useState(false)

  return (
    <div className="flex overflow-hidden bg-g-bg" style={{ height: '100dvh' }}>
      {/* Sidebar */}
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onCompose={() => setComposeOpen(true)}
      />

      {/* Main column */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/inbox" replace />} />
            <Route path="/inbox" element={<EmailList labelId="INBOX" />} />
            <Route path="/starred" element={<EmailList labelId="STARRED" />} />
            <Route path="/sent" element={<EmailList labelId="SENT" />} />
            <Route path="/drafts" element={<EmailList labelId="DRAFT" />} />
            <Route path="/hott" element={<HottPage />} />
            <Route path="/spam" element={<EmailList labelId="SPAM" />} />
            <Route path="/trash" element={<EmailList labelId="TRASH" />} />
            <Route path="/search" element={<EmailList isSearch />} />
            <Route path="/email/:messageId" element={<EmailDetail />} />
          </Routes>
        </main>

        <BottomNav onCompose={() => setComposeOpen(true)} />
      </div>

      {composeOpen && <ComposeModal onClose={() => setComposeOpen(false)} />}
    </div>
  )
}
