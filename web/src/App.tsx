import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import type { ReactElement } from 'react'
import { SessionProvider, useSession } from '@/lib/session'
import { MarketingLayout } from '@/components/marketing/MarketingLayout'
import { AppShell } from '@/components/app/AppShell'
import Home from '@/pages/marketing/Home'
import Product from '@/pages/marketing/Product'
import HowItWorks from '@/pages/marketing/HowItWorks'
import Pricing from '@/pages/marketing/Pricing'
import Guides from '@/pages/marketing/Guides'
import GuideArticle from '@/pages/marketing/GuideArticle'
import Contact from '@/pages/marketing/Contact'
import Legal from '@/pages/marketing/Legal'
import SignIn from '@/pages/auth/SignIn'
import SignUp from '@/pages/auth/SignUp'
import VerifyPhone from '@/pages/auth/VerifyPhone'
import ForgotPassword from '@/pages/auth/ForgotPassword'
import ResetPassword from '@/pages/auth/ResetPassword'
import Dashboard from '@/pages/app/Dashboard'
import Groups from '@/pages/app/Groups'
import NewGroup from '@/pages/app/NewGroup'
import GroupLayout from '@/pages/app/GroupLayout'
import GroupOverview from '@/pages/app/GroupOverview'
import GroupLedger from '@/pages/app/GroupLedger'
import GroupMembers from '@/pages/app/GroupMembers'
import GroupLoans from '@/pages/app/GroupLoans'
import GroupReports from '@/pages/app/GroupReports'
import GroupRules from '@/pages/app/GroupRules'
import Settings from '@/pages/app/Settings'
import NotFound from '@/pages/NotFound'

function RequireAuth({ children }: { children: ReactElement }) {
  const { isAuthenticated, isLoading } = useSession()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <p className="t-eyebrow">Opening your ledger…</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace state={{ from: location.pathname }} />
  }

  return children
}

export default function App() {
  return (
    <SessionProvider>
      <Routes>
        <Route element={<MarketingLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/product" element={<Product />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/guides" element={<Guides />} />
          <Route path="/guides/:slug" element={<GuideArticle />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy" element={<Legal kind="privacy" />} />
          <Route path="/terms" element={<Legal kind="terms" />} />
        </Route>

        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/verify" element={<VerifyPhone />} />
        <Route path="/forgot" element={<ForgotPassword />} />
        <Route path="/reset" element={<ResetPassword />} />

        <Route
          path="/app"
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="groups" element={<Groups />} />
          <Route path="groups/new" element={<NewGroup />} />
          <Route path="groups/:groupId" element={<GroupLayout />}>
            <Route index element={<GroupOverview />} />
            <Route path="ledger" element={<GroupLedger />} />
            <Route path="members" element={<GroupMembers />} />
            <Route path="loans" element={<GroupLoans />} />
            <Route path="reports" element={<GroupReports />} />
            <Route path="rules" element={<GroupRules />} />
          </Route>
          <Route path="settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </SessionProvider>
  )
}
