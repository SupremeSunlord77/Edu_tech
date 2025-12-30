"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null); // Clear any previous error

    try {
      const res = await api.post("/auth/login", {
        email,
        password,
      });

      localStorage.setItem("accessToken", res.data.accessToken);
      if (res.data.refreshToken) {
        localStorage.setItem("refreshToken", res.data.refreshToken);
      }

      // Role-based redirect
      const role = res.data.user.role;
      
      if (role === "SUPERADMIN") {
        router.push("/superadmin/dashboard");
      } else if (role === "SCHOOL_ADMIN") {
        router.push("/schooladmin/dashboard");
      } else if (role === "TEACHER") {
        router.push("/teacher/dashboard");
      } else {
        setError("Unknown role. Please contact admin.");
      }
    } catch (err: any) {
      // Set error to display inline instead of using alert()
      setError(err.response?.data?.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        * {
          box-sizing: border-box;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        body {
          margin: 0;
          padding: 0;
          background-color: #f8f9fa;
          display: flex;
          flex-direction: column;
          align-items: center;
          min-height: 100vh;
        }

        .navbar {
          width: 100%;
          padding: 20px 50px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #fff;
        }

        .logo {
          font-weight: bold;
          font-size: 1.2rem;
          color: #1a1d23;
        }

        .login-container {
          margin-top: 80px;
          width: 450px;
          position: relative;
        }

        .welcome-card {
          background-color: #12141a;
          color: white;
          padding: 40px 40px 100px;
          border-radius: 12px;
        }

        .welcome-card h1 {
          margin: 0;
          font-size: 2rem;
        }

        .welcome-card p {
          color: #9ca3af;
          margin-top: 10px;
        }

        .form-card {
          background: white;
          border-radius: 12px;
          padding: 40px;
          margin: -70px 25px 0;
          box-shadow: 0 10px 25px rgba(0,0,0,0.05);
        }

        .input-group {
          margin-bottom: 20px;
        }

        input {
          width: 100%;
          padding: 14px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
        }

        input:focus {
          outline: none;
          border-color: #12141a;
        }

        .login-btn {
          width: 100%;
          background-color: #12141a;
          color: white;
          border: none;
          padding: 14px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .login-btn:hover {
          background-color: #2d3748;
        }

        .login-btn:disabled {
          background-color: #6b7280;
          cursor: not-allowed;
        }

        .form-footer {
          display: flex;
          justify-content: space-between;
          margin-top: 25px;
          font-size: 0.85rem;
          color: #6b7280;
        }

        .signup-text {
          text-align: center;
          margin-top: 30px;
          color: #6b7280;
        }

        /* Error message styles */
        .error-container {
          background-color: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          padding: 12px 16px;
          margin-bottom: 20px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .error-icon {
          flex-shrink: 0;
          width: 20px;
          height: 20px;
          color: #dc2626;
        }

        .error-content {
          flex: 1;
        }

        .error-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: #991b1b;
          margin: 0 0 2px 0;
        }

        .error-message {
          font-size: 0.875rem;
          color: #dc2626;
          margin: 0;
        }

        .error-close {
          flex-shrink: 0;
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          color: #f87171;
          transition: color 0.2s;
        }

        .error-close:hover {
          color: #dc2626;
        }
      `}</style>

      <header className="navbar">
        <h1 className="logo">SmartGrade EduSystem</h1>
      </header>

      <div className="login-container">
        <div className="welcome-card">
          <h1>Welcome</h1>
          <p>Login to your account</p>
        </div>

        <div className="form-card">
          <form onSubmit={handleLogin}>
            {/* Inline Error Display */}
            {error && (
              <div className="error-container">
                <svg className="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <div className="error-content">
                  <p className="error-title">Login Failed</p>
                  <p className="error-message">{error}</p>
                </div>
                <button 
                  type="button" 
                  className="error-close" 
                  onClick={() => setError(null)}
                  aria-label="Dismiss error"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            )}

            <div className="input-group">
              <input
                type="email"
                placeholder="Email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null); // Clear error when user starts typing
                }}
              />
            </div>

            <div className="input-group">
              <input
                type="password"
                placeholder="Password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null); // Clear error when user starts typing
                }}
              />
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>

            <div className="form-footer">
              <label>
                <input type="checkbox" /> Remember me
              </label>
              <span>|</span>
              <span>Forgot Password?</span>
            </div>
          </form>
        </div>

        <div className="signup-text">
          Don't have your account? <strong>Contact Admin</strong>
        </div>
      </div>
    </>
  );
}