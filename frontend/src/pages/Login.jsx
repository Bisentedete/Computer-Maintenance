import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { formatErr } from "@/lib/api";
import { Wrench, Loader2 } from "lucide-react";

export default function Login() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("admin@lab.edu");
  const [password, setPassword] = useState("admin123");
  const [remember, setRemember] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await login(email.trim().toLowerCase(), password);
      nav("/");
    } catch (e) {
      setErr(formatErr(e?.response?.data?.detail) || "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  };

  const quick = (e, p) => {
    setEmail(e);
    setPassword(p);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-800 text-white">
            <Wrench size={18} strokeWidth={2.25} />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900 leading-none">
              Computer Laboratory Maintenance System
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Manage laboratory equipment, maintenance, and service requests in one place.
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-md shadow-sm p-6">
          <h1 className="text-xl font-semibold text-gray-900 mb-1">Sign in</h1>
          <p className="text-sm text-gray-500 mb-5">Use your laboratory account to continue.</p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email</label>
              <input
                data-testid="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-800 focus:ring-1 focus:ring-blue-800"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Password</label>
              <input
                data-testid="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-800 focus:ring-1 focus:ring-blue-800"
                required
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="rounded border-gray-300 text-blue-800 focus:ring-blue-800"
                />
                Remember me
              </label>
              <button type="button" className="text-blue-800 hover:underline">Forgot password?</button>
            </div>

            {err && (
              <div data-testid="login-error" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                {err}
              </div>
            )}

            <button
              type="submit"
              data-testid="login-submit"
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900 transition-colors disabled:opacity-60"
            >
              {busy && <Loader2 size={14} className="animate-spin" />}
              Sign in
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-gray-100">
            <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-2">Demo accounts</div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <button data-testid="demo-admin" onClick={() => quick("admin@lab.edu", "admin123")} className="rounded-md border border-gray-200 px-2 py-1.5 text-left hover:bg-gray-50 transition-colors">
                <div className="font-medium text-gray-900">Admin</div>
                <div className="text-gray-500 truncate">admin@lab.edu</div>
              </button>
              <button data-testid="demo-tech" onClick={() => quick("tech@lab.edu", "tech123")} className="rounded-md border border-gray-200 px-2 py-1.5 text-left hover:bg-gray-50 transition-colors">
                <div className="font-medium text-gray-900">Technician</div>
                <div className="text-gray-500 truncate">tech@lab.edu</div>
              </button>
              <button data-testid="demo-user" onClick={() => quick("user@lab.edu", "user123")} className="rounded-md border border-gray-200 px-2 py-1.5 text-left hover:bg-gray-50 transition-colors">
                <div className="font-medium text-gray-900">User</div>
                <div className="text-gray-500 truncate">user@lab.edu</div>
              </button>
            </div>
          </div>
        </div>

        <div className="text-center text-[11px] text-gray-500 mt-6">
          © 2026 Computer Laboratory Maintenance System
        </div>
      </div>
    </div>
  );
}
