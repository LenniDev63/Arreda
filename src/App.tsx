import { HashRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ProtectedRoute } from '@/components/ProtectedRoute';

import LandingPage from '@/pages/LandingPage';
import SearchPage from '@/pages/SearchPage';
import PropertyDetailPage from '@/pages/PropertyDetailPage';
import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import ProfilePage from '@/pages/ProfilePage';
import { OwnerLayout } from '@/components/OwnerLayout';
import { ClientLayout } from '@/components/ClientLayout';
import OwnerDashboard from '@/pages/OwnerDashboard';
import PropertyEditorPage from '@/pages/PropertyEditorPage';
import OwnerBookingsPage from '@/pages/OwnerBookingsPage';
import OwnerCalendarPage from '@/pages/OwnerCalendarPage';
import ClientDashboard from '@/pages/ClientDashboard';
import ClientBookingsPage from '@/pages/ClientBookingsPage';
import FavoritesPage from '@/pages/FavoritesPage';
import BookingRequestPage from '@/pages/BookingRequestPage';
import CheckoutPage from '@/pages/CheckoutPage';
import BookingSuccessPage from '@/pages/BookingSuccessPage';
import NotFoundPage from '@/pages/NotFoundPage';

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/buscar" element={<SearchPage />} />
            <Route path="/imovel/:id" element={<PropertyDetailPage />} />

            <Route path="/login" element={<LoginPage />} />
            <Route path="/cadastro" element={<SignupPage />} />

            <Route path="/perfil" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

            <Route path="/painel/proprietario" element={<ProtectedRoute requireType="owner"><OwnerLayout /></ProtectedRoute>}>
              <Route index element={<OwnerDashboard />} />
              <Route path="imoveis" element={<OwnerDashboard />} />
              <Route path="reservas" element={<OwnerBookingsPage />} />
              <Route path="calendario" element={<OwnerCalendarPage />} />
              <Route path="calendario/:propertyId" element={<OwnerCalendarPage />} />
            </Route>
            <Route path="/anunciar" element={<ProtectedRoute requireType="owner"><PropertyEditorPage /></ProtectedRoute>} />
            <Route path="/imovel/:id/editar" element={<ProtectedRoute requireType="owner"><PropertyEditorPage /></ProtectedRoute>} />

            <Route path="/painel/cliente" element={<ProtectedRoute requireType="client"><ClientLayout /></ProtectedRoute>}>
              <Route index element={<ClientDashboard />} />
              <Route path="reservas" element={<ClientBookingsPage />} />
              <Route path="favoritos" element={<FavoritesPage />} />
            </Route>
            <Route path="/reservar/:propertyId" element={<ProtectedRoute requireType="client"><BookingRequestPage /></ProtectedRoute>} />
            <Route path="/pagamento/:bookingId" element={<ProtectedRoute requireType="client"><CheckoutPage /></ProtectedRoute>} />
            <Route path="/reserva/sucesso" element={<ProtectedRoute requireType="client"><BookingSuccessPage /></ProtectedRoute>} />

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Layout>
      </HashRouter>
    </AuthProvider>
  );
}
