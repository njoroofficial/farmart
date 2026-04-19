import { createBrowserRouter, Outlet } from "react-router";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { MarketplacePage } from "./pages/MarketplacePage";
import { AnimalDetailPage } from "./pages/AnimalDetailsPage";
import { CartPage } from "./pages/CartPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { PaymentSuccessPage } from "./pages/PaymentSuccessPage";
import { MyOrdersPage } from "./pages/MyOrdersPage";
import { VerifyEmailPage } from "./pages/VerifyEmailPage";
import { FarmerLayout } from "./pages/farmer/FarmerLayout";
import { DashboardPage } from "./pages/farmer/DashboardPage";
import { MyListingsPage } from "./pages/farmer/MyListingsPage";
import { AddAnimalPage } from "./pages/farmer/AddAnimalPage";
import { EditAnimalPage } from "./pages/farmer/EditAnimalPage";
import { OrdersPage } from "./pages/farmer/OrdersPage";
import { BuyerLayout } from "./pages/buyer/BuyerLayout";
import { BuyerDashboardPage } from "./pages/buyer/BuyerDashboardPage";



// Root layout with Navbar + Footer for public/buyer pages
function PublicLayout() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

// Auth layout
function AuthLayout() {
  return <Outlet />;
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: PublicLayout,
    children: [
      { index: true, Component: LandingPage },
      { path: 'marketplace', Component: MarketplacePage },
      { path: "cart", Component: CartPage },
      { path: "checkout", Component: CheckoutPage },
      { path: "payment-success", Component: PaymentSuccessPage },
      { path: "my-orders", Component: MyOrdersPage },
      { path: "animals/:id", Component: AnimalDetailPage }

    ],
  },

  {
    path: "/",
    Component: AuthLayout,
    children: [
      { path: "login", Component: LoginPage },
      { path: "register", Component: RegisterPage },
      { path: "verify-email", Component: VerifyEmailPage },
    ],
  },
  {
    path: "/farmer",
    Component: FarmerLayout,
    children: [
      { path: "dashboard", Component: DashboardPage },
      { path: "listings", Component: MyListingsPage },
      { path: "listings/add", Component: AddAnimalPage },
      { path: "listings/:id/edit", Component: EditAnimalPage },
      { path: "orders", Component: OrdersPage },
    ],
  },
  {
    path: "/buyer",
    Component: BuyerLayout,
    children: [
      { path: "dashboard", Component: BuyerDashboardPage },
      { path: "orders", Component: MyOrdersPage },
      { path: "cart", Component: CartPage },
    ],
  },
]);
