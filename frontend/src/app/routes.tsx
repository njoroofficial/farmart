import { createBrowserRouter, Outlet } from "react-router";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";

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
    children: [{ index: true, Component: LandingPage }],
  },
  {
    path: "/",
    Component: AuthLayout,
    children: [
      { path: "login", Component: LoginPage },
      { path: "register", Component: RegisterPage },
    ],
  },
]);
