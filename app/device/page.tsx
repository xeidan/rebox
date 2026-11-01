"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import DeviceDetection, {
  type DetectedDevice,
} from "@/components/intelligence/device-detection";

type Device = {
  id: number;
  brand: string;
  model: string;
  model_number: string | null;
  category: string;
  release_year: number | null;
  specifications: Record<string, unknown>;
};

type Variant = {
  id: number;
  model_number: string;
  region: string | null;
  storage: string | null;
  connectivity: string | null;
  specifications: Record<string, unknown>;
};

type Candidate = {
  device: Device;
  variants: Variant[];
};

type Result = {
  detected: boolean;
  status: string;
  reason?: string;
  device: Device | null;
  variant: Variant | null;
  variants?: Variant[];
  confidence: number;
  confidenceLevel?: string;
};

function formatLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatValue(value: unknown): string {
  if (Array.isArray(value)) return value.map(formatValue).join(", ");

  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => `${formatLabel(key)}: ${formatValue(item)}`)
      .join(" · ");
  }

  if (value === null || value === undefined || value === "") {
    return "Not available";
  }

  return String(value);
}

export default function DevicePage() {
  const searchParams = useSearchParams();

  const [type, setType] = useState<"model" | "model_number">("model");
  const [value, setValue] = useState("");
  const [browserDevice, setBrowserDevice] =
    useState<DetectedDevice | null>(null);

  const [result, setResult] = useState<Result | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(
    null,
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [requestBrand, setRequestBrand] = useState("");
  const [requestModel, setRequestModel] = useState("");
  const [requestModelNumber, setRequestModelNumber] = useState("");
  const [requestCategory, setRequestCategory] = useState("");
  const [requestDetails, setRequestDetails] = useState("");
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  const queryModel = searchParams.get("model");

  useEffect(() => {
    
    if (queryModel) {
      setType("model");
      setValue(queryModel);
    }
  }, [queryModel]);

  const handleDeviceDetected = useCallback(
    (device: DetectedDevice) => {
      setBrowserDevice(device);

      if (device.model && !queryModel) {
        setType("model");
        setValue(device.model);
      }
    },
    [queryModel],
  );

  const selectedVariant =
    result?.variants?.find((variant) => variant.id === selectedVariantId) ??
    result?.variant ??
    null;

  const specifications =
    selectedVariant?.specifications &&
    Object.keys(selectedVariant.specifications).length > 0
      ? selectedVariant.specifications
      : result?.device?.specifications ?? {};

  async function identifyDevice(event: React.FormEvent) {
    event.preventDefault();

    if (!value.trim()) {
      setError("Enter a device model or model number.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    setCandidates([]);
    setSelectedVariantId(null);
    setRequestSubmitted(false);
    setRequestError("");

    try {
      const response = await fetch("/api/devices/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          value: value.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Device identification failed.");
      }

      if (data.status === "ambiguous" && data.candidates?.length) {
        setCandidates(data.candidates);
        return;
      }

      setResult(data);

      if (data.variant?.id) {
        setSelectedVariantId(data.variant.id);
      } else if (data.variants?.length === 1) {
        setSelectedVariantId(data.variants[0].id);
      }

      if (!data.detected) {
        if (type === "model_number") {
          setRequestModelNumber(value.trim());
        } else {
          setRequestModel(value.trim());
        }
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to identify this device.",
      );
    } finally {
      setLoading(false);
    }
  }

  function selectCandidate(candidate: Candidate) {
    setResult({
      detected: true,
      status: "matched",
      device: candidate.device,
      variant:
        candidate.variants.length === 1 ? candidate.variants[0] : null,
      variants: candidate.variants,
      confidence: 1,
    });

    setSelectedVariantId(
      candidate.variants.length === 1 ? candidate.variants[0].id : null,
    );

    setCandidates([]);
  }

  async function submitCatalogueRequest(event: React.FormEvent) {
    event.preventDefault();

    if (
      !requestBrand.trim() &&
      !requestModel.trim() &&
      !requestModelNumber.trim()
    ) {
      setRequestError("Enter at least a brand, model or model number.");
      return;
    }

    setRequestLoading(true);
    setRequestError("");

    try {
      const response = await fetch("/api/devices/catalogue-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: requestBrand,
          model: requestModel,
          model_number: requestModelNumber,
          category: requestCategory,
          details: requestDetails,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to submit your request.");
      }

      setRequestSubmitted(true);
    } catch (err) {
      setRequestError(
        err instanceof Error
          ? err.message
          : "Unable to submit your request. Please try again.",
      );
    } finally {
      setRequestLoading(false);
    }
  }

  const showCatalogueRequest =
    result !== null && !result.detected && result.status !== "ambiguous";

  return (
    <main className="min-h-screen bg-[#fcfbff] px-5 py-16">
      <DeviceDetection onDetected={handleDeviceDetected} />

      <div className="mx-auto max-w-3xl">
        {browserDevice && (
          <div className="mb-6 rounded-2xl border border-violet-100 bg-white p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-violet-600">
              Automatic device detection
            </p>

            <p className="mt-2 text-lg font-bold text-gray-900">
              {browserDevice.deviceName}
            </p>

            <p className="mt-1 text-sm text-gray-500">
              {browserDevice.deviceDetails}
            </p>

            {!browserDevice.model && (
              <p className="mt-3 text-xs text-gray-500">
                Exact model unavailable from browser information. Enter your
                model below.
              </p>
            )}
          </div>
        )}

        <div className="mb-10 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-600">
            Rebox Device Intelligence
          </p>

          <h1 className="mt-4 text-4xl font-black tracking-tight text-gray-950 sm:text-5xl">
            Identify your device.
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-gray-500">
            Find your device model, regional variant and specifications.
          </p>
        </div>

        <form
          onSubmit={identifyDevice}
          className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8"
        >
          <div className="mb-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setType("model");
                setResult(null);
                setCandidates([]);
                setError("");
              }}
              className={`rounded-full px-5 py-3 text-sm font-semibold ${
                type === "model"
                  ? "bg-gray-950 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              Brand and model
            </button>

            <button
              type="button"
              onClick={() => {
                setType("model_number");
                setResult(null);
                setCandidates([]);
                setError("");
              }}
              className={`rounded-full px-5 py-3 text-sm font-semibold ${
                type === "model_number"
                  ? "bg-gray-950 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              Model number
            </button>
          </div>

          <label className="mb-2 block text-sm font-semibold text-gray-800">
            {type === "model"
              ? "Enter brand and model"
              : "Enter regional model number"}
          </label>

          <input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={
              type === "model"
                ? "e.g. Apple iPhone 15 Pro"
                : "e.g. A3102"
            }
            maxLength={120}
            className="h-14 w-full rounded-xl border border-gray-200 px-4 text-sm text-gray-950 outline-none transition focus:border-violet-500"
          />

          <button
            type="submit"
            disabled={loading}
            className="mt-5 h-14 w-full rounded-xl bg-gray-950 text-sm font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Identifying device..." : "Identify my device"}
          </button>

          {error && (
            <p role="alert" className="mt-4 text-sm font-medium text-red-600">
              {error}
            </p>
          )}
        </form>

        {candidates.length > 0 && (
          <section className="mt-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-bold text-gray-950">
              Multiple possible matches
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Select the device that matches yours.
            </p>

            <div className="mt-5 space-y-3">
              {candidates.map((candidate) => (
                <button
                  key={candidate.device.id}
                  type="button"
                  onClick={() => selectCandidate(candidate)}
                  className="w-full rounded-xl border border-gray-200 p-4 text-left transition hover:border-violet-500 hover:bg-violet-50"
                >
                  <span className="block font-bold text-gray-950">
                    {candidate.device.brand} {candidate.device.model}
                  </span>

                  <span className="mt-1 block text-sm text-gray-500">
                    {candidate.device.category}
                    {candidate.device.release_year
                      ? ` · ${candidate.device.release_year}`
                      : ""}
                  </span>

                  {candidate.variants.length > 0 && (
                    <span className="mt-2 block text-xs text-gray-500">
                      {candidate.variants
                        .map((variant) => variant.model_number)
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </section>
        )}

        {result && (
          <section className="mt-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            {result.detected && result.device ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                    Catalogue match
                  </p>

                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                    {Math.round(result.confidence * 100)}% confidence
                  </span>
                </div>

                <h2 className="mt-4 text-2xl font-black text-gray-950">
                  {result.device.brand} {result.device.model}
                </h2>

                <p className="mt-2 text-sm text-gray-500">
                  {result.device.category}
                  {result.device.release_year
                    ? ` · ${result.device.release_year}`
                    : ""}
                </p>

                {result.variants && result.variants.length > 0 && (
                  <div className="mt-6">
                    <label
                      htmlFor="device-variant"
                      className="mb-2 block text-sm font-bold text-gray-900"
                    >
                      Select device variant
                    </label>

                    <select
                      id="device-variant"
                      value={selectedVariantId ?? ""}
                      onChange={(event) =>
                        setSelectedVariantId(
                          event.target.value
                            ? Number(event.target.value)
                            : null,
                        )
                      }
                      className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-violet-500"
                    >
                      <option value="">Choose a variant</option>

                      {result.variants.map((variant) => (
                        <option key={variant.id} value={variant.id}>
                          {[
                            variant.model_number,
                            variant.region,
                            variant.storage,
                            variant.connectivity,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedVariant && (
                  <div className="mt-6 rounded-2xl bg-violet-50 p-5">
                    <h3 className="text-sm font-bold text-gray-900">
                      Selected variant
                    </h3>

                    <div className="mt-3 grid grid-cols-2 gap-4">
                      {[
                        ["Model number", selectedVariant.model_number],
                        ["Region", selectedVariant.region],
                        ["Storage", selectedVariant.storage],
                        ["Connectivity", selectedVariant.connectivity],
                      ].map(([label, item]) => (
                        <div key={label}>
                          <p className="text-xs text-gray-500">{label}</p>
                          <p className="mt-1 text-sm font-semibold text-gray-900">
                            {item || "Not available"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-6">
                  <h3 className="text-sm font-bold text-gray-900">
                    Specifications
                  </h3>

                  {Object.keys(specifications).length > 0 ? (
                    <div className="mt-3 divide-y divide-gray-100 rounded-xl border border-gray-100">
                      {Object.entries(specifications).map(([key, item]) => (
                        <div
                          key={key}
                          className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:justify-between sm:gap-6"
                        >
                          <p className="text-sm text-gray-500">
                            {formatLabel(key)}
                          </p>

                          <p className="text-sm font-semibold text-gray-900 sm:text-right">
                            {formatValue(item)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-gray-500">
                      Specifications have not been added to the catalogue yet.
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div>
                <h2 className="text-xl font-bold text-gray-950">
                  Device not found
                </h2>

                <p className="mt-2 text-sm text-gray-500">
                  {result.reason ||
                    "This device could not be matched to the Rebox catalogue."}
                </p>

                <p className="mt-3 text-sm text-gray-600">
                  You can submit its details below so it can be considered for
                  inclusion in the catalogue.
                </p>
              </div>
            )}
          </section>
        )}

        {showCatalogueRequest && (
          <section className="mt-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            {requestSubmitted ? (
              <div className="py-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <span className="text-xl font-bold">✓</span>
                </div>

                <h2 className="mt-4 text-xl font-bold text-gray-950">
                  Request submitted
                </h2>

                <p className="mt-2 text-sm text-gray-600">
                  Your device has been submitted for catalogue review. It has
                  not yet been identified or added to the catalogue.
                </p>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-gray-950">
                  Can't find your device?
                </h2>

                <p className="mt-2 text-sm text-gray-500">
                  Submit its details for review by the Rebox team.
                </p>

                <form
                  onSubmit={submitCatalogueRequest}
                  className="mt-6 space-y-4"
                >
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-800">
                      Brand
                    </label>
                    <input
                      value={requestBrand}
                      onChange={(event) => setRequestBrand(event.target.value)}
                      placeholder="e.g. Apple, Samsung, Google"
                      maxLength={80}
                      className="h-12 w-full rounded-xl border border-gray-200 px-4 text-sm text-gray-950 outline-none focus:border-violet-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-800">
                      Model
                    </label>
                    <input
                      value={requestModel}
                      onChange={(event) => setRequestModel(event.target.value)}
                      placeholder="e.g. iPhone 15 Pro"
                      maxLength={120}
                      className="h-12 w-full rounded-xl border border-gray-200 px-4 text-sm text-gray-950 outline-none focus:border-violet-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-800">
                      Model number
                    </label>
                    <input
                      value={requestModelNumber}
                      onChange={(event) =>
                        setRequestModelNumber(event.target.value)
                      }
                      placeholder="e.g. A3102"
                      maxLength={80}
                      className="h-12 w-full rounded-xl border border-gray-200 px-4 text-sm text-gray-950 outline-none focus:border-violet-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-800">
                      Category
                    </label>
                    <select
                      value={requestCategory}
                      onChange={(event) =>
                        setRequestCategory(event.target.value)
                      }
                      className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-950 outline-none focus:border-violet-500"
                    >
                      <option value="">Select category</option>
                      <option value="Smartphone">Smartphone</option>
                      <option value="Laptop">Laptop</option>
                      <option value="Tablet">Tablet</option>
                      <option value="Smartwatch">Smartwatch</option>
                      <option value="Gaming">Gaming</option>
                      <option value="Audio">Audio</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-800">
                      Additional details (optional)
                    </label>
                    <textarea
                      value={requestDetails}
                      onChange={(event) =>
                        setRequestDetails(event.target.value)
                      }
                      placeholder="Any other information that may help identify this device."
                      maxLength={1000}
                      rows={3}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-950 outline-none focus:border-violet-500"
                    />
                  </div>

                  <input
                    type="text"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    className="hidden"
                    onChange={() => {}}
                  />

                  {requestError && (
                    <p role="alert" className="text-sm font-medium text-red-600">
                      {requestError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={requestLoading}
                    className="h-14 w-full rounded-xl bg-gray-950 text-sm font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {requestLoading
                      ? "Submitting request..."
                      : "Submit device for review"}
                  </button>
                </form>
              </>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
