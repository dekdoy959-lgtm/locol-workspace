import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ConfirmProvider } from './components/modals/ConfirmProvider';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import { AppLayout } from './components/layout/AppLayout';
import { OfflineBanner } from './components/layout/OfflineBanner';
import { LoginPage } from './pages/Login';
import { ContactListPage } from './pages/contacts/ContactListPage';
import { ContactDetailPage } from './pages/contacts/ContactDetailPage';
import { ContactFormPage } from './pages/contacts/ContactFormPage';
import { MergeContactsPage } from './pages/contacts/MergeContactsPage';
import { GroupsListPage } from './pages/groups/GroupsListPage';
import { GroupDetailPage } from './pages/groups/GroupDetailPage';
import { GroupFormPage } from './pages/groups/GroupFormPage';
import { OrgListPage } from './pages/organizations/OrgListPage';
import { OrgDetailPage } from './pages/organizations/OrgDetailPage';
import { OrgFormPage } from './pages/organizations/OrgFormPage';
import { RelationshipGraphPage } from './pages/relationships/RelationshipGraphPage';
import { InboxPage } from './pages/inbox/InboxPage';
import { InboxSummaryPage } from './pages/inbox/InboxSummaryPage';
import { InboxTablePage } from './pages/inbox/InboxTablePage';
import { OpportunityDetailPage } from './pages/inbox/OpportunityDetailPage';
import { OpportunityFormPage } from './pages/inbox/OpportunityFormPage';
import { OpportunityBriefPage } from './pages/inbox/OpportunityBriefPage';
import { MilestonesPage } from './pages/milestones/MilestonesPage';
import { BriefingPage } from './pages/briefing/BriefingPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { TeamPage } from './pages/team/TeamPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { DiscordInboxPage } from './pages/discord-inbox/DiscordInboxPage';
import { CalendarPage } from './pages/calendar/CalendarPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Persist cache for 24h so offline-opens still see data
      gcTime: 1000 * 60 * 60 * 24,
      // Retry once on offline / failure
      retry: 1,
      networkMode: 'offlineFirst',
    },
    mutations: {
      // Show optimistic updates even when offline; will replay on reconnect (manually queued)
      networkMode: 'offlineFirst',
    },
  },
});

const PERSISTED_CACHE_KEY = 'LOCOL_QUERY_CACHE';

const persister = createSyncStoragePersister({
  storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  key: PERSISTED_CACHE_KEY,
  throttleTime: 1000,
});

// Export so AuthContext.signOut can clear the persisted cache to prevent
// PII (contacts/notes/calendar) from leaking to the next user on the same device.
export { queryClient, PERSISTED_CACHE_KEY };

export function App() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 1000 * 60 * 60 * 24, // 1 day
        // Don't persist sensitive queries (auth, etc.)
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => {
            const key = query.queryKey[0];
            // Skip Gmail/Calendar live queries — they hold OAuth tokens implicitly
            // and contain personal email/meeting data that doesn't belong on
            // shared devices. (Was 'calendar-events' — wrong key; real key is 'calendar')
            if (key === 'gmail' || key === 'calendar') return false;
            return query.state.status === 'success';
          },
        },
      }}
    >
      <ThemeProvider>
      <AuthProvider>
        <ConfirmProvider>
        <BrowserRouter>
          <ErrorBoundary>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/inbox" replace />} />
              <Route path="inbox" element={<InboxPage />} />
              <Route path="inbox/summary" element={<InboxSummaryPage />} />
              <Route path="inbox/table" element={<InboxTablePage />} />
              <Route path="inbox/new" element={<OpportunityFormPage mode="create" />} />
              <Route path="inbox/:id" element={<OpportunityDetailPage />} />
              <Route path="inbox/:id/brief" element={<OpportunityBriefPage />} />
              <Route path="inbox/:id/edit" element={<OpportunityFormPage mode="edit" />} />
              <Route path="milestones" element={<MilestonesPage />} />
              <Route path="contacts" element={<ContactListPage />} />
              <Route path="contacts/new" element={<ContactFormPage mode="create" />} />
              <Route path="contacts/:id" element={<ContactDetailPage />} />
              <Route path="contacts/:id/edit" element={<ContactFormPage mode="edit" />} />
              <Route path="contacts/:id/merge" element={<MergeContactsPage />} />
              <Route path="organizations" element={<OrgListPage />} />
              <Route path="organizations/new" element={<OrgFormPage mode="create" />} />
              <Route path="organizations/:id" element={<OrgDetailPage />} />
              <Route path="organizations/:id/edit" element={<OrgFormPage mode="edit" />} />
              <Route path="groups" element={<GroupsListPage />} />
              <Route path="groups/new" element={<GroupFormPage mode="create" />} />
              <Route path="groups/:id" element={<GroupDetailPage />} />
              <Route path="groups/:id/edit" element={<GroupFormPage mode="edit" />} />
              <Route path="relationships" element={<RelationshipGraphPage />} />
              <Route path="discord-inbox" element={<DiscordInboxPage />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="briefing" element={<BriefingPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="team" element={<TeamPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </ErrorBoundary>
          <OfflineBanner />
        </BrowserRouter>
        </ConfirmProvider>
      </AuthProvider>
      </ThemeProvider>
    </PersistQueryClientProvider>
  );
}
