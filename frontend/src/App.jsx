import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import routes from './routes';
import './styles/App.css';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8">
        <Routes>
          {routes.map((route, index) => (
            <Route
              key={index}
              path={route.path}
              element={
                route.protected && !user ? (
                  <Navigate to="/login" />
                ) : route.admin && user?.user_type !== 'admin' ? (
                  <Navigate to="/" />
                ) : route.seller && user?.user_type !== 'seller' ? (
                  <Navigate to="/" />
                ) : route.buyer && user?.user_type !== 'buyer' ? (
                  <Navigate to="/" />
                ) : (
                  <route.component />
                )
              }
            />
          ))}
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
