import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Leaf, CheckCircle, XCircle, Loader2 } from "lucide-react";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";

type Status = "loading" | "success" | "error";

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No verification token found. Please check your email link.");
      return;
    }

    fetch(`${API_BASE_URL}/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setStatus("success");
          setMessage(data.message || "Email verified successfully. You can now log in.");
        } else {
          setStatus("error");
          setMessage(
            data.message ||
              "This verification link is invalid or has expired. Please request a new one."
          );
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Something went wrong. Please try again.");
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-[#F7F4EF] flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        {/* Logo */}
        <Link to="/" className="inline-flex items-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-[#2D6A4F] flex items-center justify-center">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <span className="text-[#1B2D1B] text-2xl font-bold">
            Far<span className="text-[#2D6A4F]">mart</span>
          </span>
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {status === "loading" && (
            <>
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Loader2 className="w-8 h-8 text-[#2D6A4F] animate-spin" />
              </div>
              <h2 className="text-[#1B2D1B] text-xl font-bold mb-2">
                Verifying your email…
              </h2>
              <p className="text-gray-400 text-sm">Please wait a moment.</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="w-16 h-16 rounded-full bg-[#D8EAD1] flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-[#2D6A4F]" />
              </div>
              <h2 className="text-[#1B2D1B] text-xl font-bold mb-2">
                Email Verified!
              </h2>
              <p className="text-gray-500 text-sm mb-6">{message}</p>
              <Link
                to="/login"
                className="inline-block bg-[#2D6A4F] text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-[#235A41] transition-colors"
              >
                Sign in to your account
              </Link>
            </>
          )}

          {status === "error" && (
            <>
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-[#1B2D1B] text-xl font-bold mb-2">
                Verification Failed
              </h2>
              <p className="text-gray-500 text-sm mb-6">{message}</p>
              <Link
                to="/register"
                className="inline-block bg-[#2D6A4F] text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-[#235A41] transition-colors"
              >
                Back to Register
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
