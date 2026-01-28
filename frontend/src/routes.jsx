import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrdersPage from './pages/OrdersPage';
import OrderDetailPage from './pages/OrderDetailPage';
import ProfilePage from './pages/ProfilePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminPage from './pages/AdminPage';
import SellerPage from './pages/SellerPage';
import BuyerDashboard from './pages/BuyerDashboard';
import PaymentCallback from './pages/PaymentCallback';

const routes = [
  // Public routes
  { path: '/', component: HomePage },
  { path: '/products', component: ProductsPage },
  { path: '/products/:id', component: ProductDetailPage },
  { path: '/login', component: LoginPage },
  { path: '/register', component: RegisterPage },
  { path: '/payment/callback', component: PaymentCallback },
  
  // Protected routes
  { path: '/cart', component: CartPage, protected: true },
  { path: '/checkout', component: CheckoutPage, protected: true },
  { path: '/orders', component: OrdersPage, protected: true },
  { path: '/orders/:id', component: OrderDetailPage, protected: true },
  { path: '/profile', component: ProfilePage, protected: true },
  
  // Buyer routes
  { path: '/buyer', component: BuyerDashboard, protected: true, buyer: true },
  
  // Admin routes
  { path: '/admin', component: AdminPage, protected: true, admin: true },
  { path: '/admin/users', component: AdminPage, protected: true, admin: true },
  { path: '/admin/orders', component: AdminPage, protected: true, admin: true },
  
  // Seller routes
  { path: '/seller', component: SellerPage, protected: true, seller: true },
  { path: '/seller/products', component: SellerPage, protected: true, seller: true },
  { path: '/seller/orders', component: SellerPage, protected: true, seller: true },
];

export default routes;