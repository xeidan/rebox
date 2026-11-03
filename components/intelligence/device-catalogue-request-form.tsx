
"use client";

import { useState } from "react";

type Props = {
  detectedModel?: string | null;
};

export default function DeviceCatalogueRequestForm({
  detectedModel,
}: Props) {
  const [open, setOpen] = useState(false);
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState(detectedModel ?? "");
  const [modelNumber, setModelNumber] = useState("");
  const [category, setCategory] = useState("Smartphone");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/devices/catalogue-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand,
          model,
          model_number: modelNumber,
          category,
          details,
          website: "",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error ?? "Unable to submit your request.");
        return;
      }

      setMessage("Request submitted. REBOX will review this device.");
      setBrand("");
      setModel("");
      setModelNumber("");
      setDetails("");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-5">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-sm font-semibold text-violet-700 underline underline-offset-4 hover:text-violet-900"
        >
          Can’t find your device? Request it
        </button>
      ) : (
        <div className="max-w-xl rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Request a device
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Tell us which device is missing from the REBOX catalogue.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close request form"
              className="text-gray-400 hover:text-gray-800"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-gray-700">
                Brand
                <input
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  maxLength={80}
                  placeholder="Apple, Samsung..."
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-violet-500"
                />
              </label>

              <label className="block text-sm font-medium text-gray-700">
                Model
                <input
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  maxLength={120}
                  placeholder="iPhone 15 Pro"
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-violet-500"
                />
              </label>
            </div>

            <label className="block text-sm font-medium text-gray-700">
              Model number
              <input
                value={modelNumber}
                onChange={(e) => setModelNumber(e.target.value)}
                maxLength={80}
                placeholder="A3102 (optional)"
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-violet-500"
              />
            </label>

            <label className="block text-sm font-medium text-gray-700">
              Category
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-500"
              >
                <option>Smartphone</option>
                <option>Laptop</option>
                <option>Tablet</option>
                <option>Smartwatch</option>
                <option>Gaming</option>
                <option>Audio</option>
                <option>Other</option>
              </select>
            </label>

            <label className="block text-sm font-medium text-gray-700">
              Additional details
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                maxLength={1000}
                rows={3}
                placeholder="Storage, release year, region, or anything else..."
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-violet-500"
              />
            </label>

            <div className="hidden" aria-hidden="true">
              <label>
                Website
                <input
                  name="website"
                  value=""
                  readOnly
                  tabIndex={-1}
                  autoComplete="off"
                />
              </label>
            </div>

            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}

            {message && (
              <p role="status" className="text-sm text-emerald-700">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#111111] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Submitting..." : "Submit device request"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
