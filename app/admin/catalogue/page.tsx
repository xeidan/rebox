
"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type CatalogueRequest = {
  id: number;
  brand: string | null;
  model: string | null;
  model_number: string | null;
  category: string | null;
  details: string | null;
  status: string;
  created_at: string;
};

const statuses = ["pending", "added", "rejected"];

export default function AdminCataloguePage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sessionToken, setSessionToken] = useState("");
  const [requests, setRequests] = useState<CatalogueRequest[]>([]);
  const [activeStatus, setActiveStatus] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadRequests = useCallback(async (token: string, status: string) => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/admin/catalogue-requests?status=${status}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to load requests");
      }

      setRequests(result.requests || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;

      const token = data.session?.access_token || "";

      setSessionToken(token);

      if (token) {
        loadRequests(token, activeStatus);
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;

        const token = session?.access_token || "";
        setSessionToken(token);

        if (token) {
          loadRequests(token, activeStatus);
        } else {
          setRequests([]);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [activeStatus, loadRequests]);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      setError(error?.message || "Login failed");
      setLoading(false);
      return;
    }

    setSessionToken(data.session.access_token);
    await loadRequests(data.session.access_token, activeStatus);
    setPassword("");
  }

  async function reviewRequest(id: number, action: "approve" | "reject") {
    if (!sessionToken) return;

    const confirmed = window.confirm(
      action === "approve"
        ? "Approve this request and add the device to the catalogue?"
        : "Reject this catalogue request?"
    );

    if (!confirmed) return;

    setBusyId(id);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        "/api/admin/catalogue-requests/review",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionToken}`,
          },
          body: JSON.stringify({ id, action }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Review action failed");
      }

      setMessage(
        action === "approve"
          ? "Device successfully added to the catalogue."
          : "Catalogue request rejected."
      );

      await loadRequests(sessionToken, activeStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Review failed");
    } finally {
      setBusyId(null);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    setSessionToken("");
    setRequests([]);
    setMessage("");
  }

  if (!sessionToken && !loading) {
    return (
      <main className="min-h-screen bg-[#f7f8fa] flex items-center justify-center px-5">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm"
        >
          <div className="mb-8">
            <p className="text-sm font-bold tracking-widest text-purple-700">
              REBOX
            </p>
            <h1 className="mt-3 text-2xl font-bold text-gray-950">
              Admin login
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Sign in to manage device catalogue submissions.
            </p>
          </div>

          <label className="mb-2 block text-sm font-medium text-gray-700">
            Email address
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mb-5 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-purple-600"
            placeholder="admin@example.com"
          />

          <label className="mb-2 block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mb-5 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-purple-600"
          />

          {error && (
            <p className="mb-4 text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gray-950 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f8fa]">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
          <div>
            <p className="text-sm font-bold tracking-widest text-purple-700">
              REBOX
            </p>
            <p className="text-xs text-gray-500">ADMIN CONSOLE</p>
          </div>

          <button
            onClick={logout}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Sign out
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-10">
        <div className="mb-8">
          <p className="text-sm font-medium text-purple-700">
            DEVICE INTELLIGENCE
          </p>
          <h1 className="mt-2 text-3xl font-bold text-gray-950">
            Catalogue requests
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Review device submissions and manage the Rebox catalogue.
          </p>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {statuses.map((status) => (
            <button
              key={status}
              onClick={() => setActiveStatus(status)}
              className={`rounded-lg px-5 py-2.5 text-sm font-semibold capitalize ${
                activeStatus === status
                  ? "bg-gray-950 text-white"
                  : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {message && (
          <div className="mb-5 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
            <h2 className="font-semibold capitalize text-gray-950">
              {activeStatus} submissions
            </h2>

            <button
              onClick={() => loadRequests(sessionToken, activeStatus)}
              disabled={loading}
              className="text-sm font-medium text-purple-700 hover:text-purple-900 disabled:opacity-50"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center text-sm text-gray-500">
              Loading submissions...
            </div>
          ) : requests.length === 0 ? (
            <div className="p-12 text-center">
              <p className="font-medium text-gray-800">
                No {activeStatus} submissions
              </p>
              <p className="mt-2 text-sm text-gray-500">
                New catalogue requests will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {requests.map((item) => (
                <article key={item.id} className="p-6">
                  <div className="flex flex-col justify-between gap-5 md:flex-row">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-bold text-gray-950">
                          {[item.brand, item.model]
                            .filter(Boolean)
                            .join(" ") || "Unnamed device"}
                        </h3>

                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium capitalize text-gray-600">
                          {item.status}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div>
                          <p className="text-xs text-gray-400">Model number</p>
                          <p className="mt-1 text-sm font-medium text-gray-800">
                            {item.model_number || "Not provided"}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-gray-400">Category</p>
                          <p className="mt-1 text-sm font-medium text-gray-800">
                            {item.category || "Not provided"}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-gray-400">Submitted</p>
                          <p className="mt-1 text-sm font-medium text-gray-800">
                            {new Date(item.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {item.details && (
                        <div className="mt-4 rounded-lg bg-gray-50 p-4">
                          <p className="text-xs text-gray-400">Details</p>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
                            {item.details}
                          </p>
                        </div>
                      )}
                    </div>

                    {activeStatus === "pending" && (
                      <div className="flex shrink-0 items-start gap-2 md:flex-col">
                        <button
                          onClick={() => reviewRequest(item.id, "approve")}
                          disabled={busyId !== null}
                          className="rounded-lg bg-gray-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
                        >
                          {busyId === item.id ? "Processing..." : "Approve"}
                        </button>

                        <button
                          onClick={() => reviewRequest(item.id, "reject")}
                          disabled={busyId !== null}
                          className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
