import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import RequireRole from './routes/RequireRole';
import RedirectIfAuthenticated from './routes/RedirectIfAuthenticated';
import PortalLayout from './layouts/PortalLayout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import MyBooksPage from './pages/author/MyBooksPage';
import NewTicketPage from './pages/author/NewTicketPage';
import MyTicketsPage from './pages/author/MyTicketsPage';
import TicketQueuePage from './pages/admin/TicketQueuePage';
import TicketDetailPage from './pages/admin/TicketDetailPage';
import NotFoundPage from './pages/NotFoundPage';

const AUTHOR_LINKS = [
  { to: '/author/books', label: 'My Books', icon: 'book' },
  { to: '/author/tickets', label: 'My Tickets', icon: 'inbox', end: true },
  { to: '/author/tickets/new', label: 'New Query', icon: 'messagePlus' },
];
const ADMIN_LINKS = [{ to: '/admin/tickets', label: 'Ticket Queue', icon: 'queue' }];

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />

          <Route element={<RedirectIfAuthenticated role="author" />}>
            <Route path="/login" element={<LoginPage role="author" />} />
          </Route>
          <Route element={<RedirectIfAuthenticated role="admin" />}>
            <Route path="/admin/login" element={<LoginPage role="admin" />} />
          </Route>

          <Route element={<RequireRole role="author" />}>
            <Route element={<PortalLayout role="author" links={AUTHOR_LINKS} />}>
              <Route path="/author/books" element={<MyBooksPage />} />
              <Route path="/author/tickets" element={<MyTicketsPage />} />
              <Route path="/author/tickets/new" element={<NewTicketPage />} />
            </Route>
          </Route>

          <Route element={<RequireRole role="admin" />}>
            <Route element={<PortalLayout role="admin" links={ADMIN_LINKS} />}>
              <Route path="/admin/tickets" element={<TicketQueuePage />} />
              <Route path="/admin/tickets/:id" element={<TicketDetailPage />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
