"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";

type DeviceStory = {
  success: boolean;
  device: {
    id: number;
    brand: string;
    model: string;
    model_number: string | null;
    category: string;
    release_year: number | null;
    specifications: Record<string, unknown> | null;
  };
  variants: Array<{
    id: number;
    model_number: string;
    region: string | null;
    storage: string | null;
    connectivity: string | null;
    specifications: Record<string, unknown> | null;
  }>;
  identifiers: Array<{
    id: number;
    identifier_type: string;
    source: string | null;
    confidence: number | null;
  }>;
  verifications: Array<{
    id: number;
    verification_type: string;
    result: string;
    confidence: number | null;
    metadata: Record<string, unknown> | null;
    created_at: string | null;
  }>;
  physicalDevices: Array<{
    id: number;
    variant_id: number | null;
    status: string;
    first_seen_at: string;
    last_seen_at: string;
    updated_at: string;
  }>;
  evidence: Array<{
    id: number;
    physical_device_id: number;
    evidence_type: string;
    result: string;
    source_type: string;
    source_name: string | null;
    confidence: number | null;
    observed_at: string;
    expires_at: string | null;
    metadata: Record<string, unknown> | null;
  }>;
  dataSources: Array<{
    id: number;
    source_name: string;
    source_record_id: string | null;
    retrieved_at: string;
    metadata: Record<string, unknown> | null;
  }>;
};

function humanize(value: string) {
  return value
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "Not available";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleString();
}

function Section({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-[#ece8f4] bg-white p-5 shadow-[0_8px_40px_rgba(34,18,68,0.025)] sm:p-7">
      <div className="mb-6 flex flex-col gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-600">
          {eyebrow}
        </p>

        <h2 className="text-xl font-semibold tracking-[-0.04em] text-[#171522] sm:text-2xl">
          {title}
        </h2>

        {description && (
          <p className="max-w-2xl text-sm leading-6 text-[#777384]">
            {description}
          </p>
        )}
      </div>

      {children}
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#e5e0ef] bg-[#fcfbff] px-5 py-6">
      <p className="text-sm leading-6 text-[#777384]">{text}</p>
    </div>
  );
}

function SpecificationGrid({
  specifications,
}: {
  specifications: Record<string, unknown> | null;
}) {
  const entries = Object.entries(specifications ?? {});

  if (!entries.length) {
    return (
      <EmptyState text="Specifications have not been added to the REBOX catalogue yet." />
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {entries.map(([key, value]) => (
        <div
          key={key}
          className="min-w-0 rounded-2xl border border-[#efecf5] bg-[#fcfbff] p-4"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#918b9f]">
            {humanize(key)}
          </p>

          <p className="mt-2 break-words text-sm font-medium leading-6 text-[#252131]">
            {formatValue(value)}
          </p>
        </div>
      ))}
    </div>
  );
}

function DataCard({
  title,
  subtitle,
  result,
  children,
}: {
  title: string;
  subtitle?: string;
  result?: string;
  children?: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-[#efecf5] bg-[#fcfbff] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[#252131]">{title}</h3>

          {subtitle && (
            <p className="mt-1 text-xs leading-5 text-[#898395]">{subtitle}</p>
          )}
        </div>

        {result && (
          <span className="rounded-full border border-violet-100 bg-white px-3 py-1 text-xs font-medium text-violet-700">
            {humanize(result)}
          </span>
        )}
      </div>

      {children && <div className="mt-4">{children}</div>}
    </article>
  );
}

function Metadata({
  data,
}: {
  data: Record<string, unknown> | null;
}) {
  if (!data || Object.keys(data).length === 0) return null;

  return (
    <pre className="overflow-x-auto rounded-xl border border-[#efecf5] bg-white p-4 text-xs leading-5 text-[#696477]">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

export default function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  const [story, setStory] = useState<DeviceStory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadStory() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/devices/${encodeURIComponent(slug)}`,
          {
            signal: controller.signal,
            cache: "no-store",
          },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to load device story.");
        }

        setStory(data);
      } catch (err) {
        if (controller.signal.aborted) return;

        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong while loading this device.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadStory();

    return () => controller.abort();
  }, [slug]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#fcfbff] px-5 py-12">
        <div className="mx-auto max-w-7xl animate-pulse">
          <div className="h-4 w-28 rounded bg-violet-100" />
          <div className="mt-8 h-64 rounded-[28px] bg-violet-50" />
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div className="h-56 rounded-[28px] bg-white" />
            <div className="h-56 rounded-[28px] bg-white" />
          </div>
        </div>
      </main>
    );
  }

  if (error || !story) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center bg-[#fcfbff] px-5 py-12">
        <div className="w-full max-w-md rounded-[28px] border border-[#ece8f4] bg-white p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-xl font-semibold text-violet-600">
            !
          </div>

          <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.2em] text-violet-600">
            REBOX Device Intelligence
          </p>

          <h1 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[#171522]">
            Device story unavailable
          </h1>

          <p className="mt-3 text-sm leading-6 text-[#777384]">
            {error || "The requested device could not be found."}
          </p>

          <Link
            href="/"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-[#211832] px-6 text-sm font-medium text-white transition hover:bg-violet-700"
          >
            Back to REBOX
          </Link>
        </div>
      </main>
    );
  }

  const { device } = story;

  return (
    <main className="min-h-screen bg-[#fcfbff] text-[#171522]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#777384] transition hover:text-violet-700"
        >
          <span aria-hidden="true">←</span>
          Back to REBOX
        </Link>

        {/* Device hero */}
        <header className="relative mt-7 overflow-hidden rounded-[32px] border border-[#eae5f4] bg-white p-6 sm:p-10 lg:p-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-28 h-96 w-96 rounded-full bg-violet-200/40 blur-[100px]"
          />

          <div className="relative z-10">
            <div className="flex flex-wrap items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-violet-600" />

              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-600">
                Every Device Has a Story
              </p>

              <span className="rounded-full border border-[#ece8f4] bg-[#fcfbff] px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#777384]">
                {humanize(device.category)}
              </span>
            </div>

            <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#918b9f]">
                  {device.brand}
                </p>

                <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-[1.04] tracking-[-0.06em] text-[#171522] sm:text-5xl lg:text-6xl">
                  {device.model}
                </h1>

                <p className="mt-5 max-w-xl text-sm leading-7 text-[#777384] sm:text-base">
                  Explore the specifications, hardware configurations, and
                  available intelligence recorded for this device in the REBOX
                  catalogue.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-[#efecf5] bg-[#fcfbff] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#918b9f]">
                    Release year
                  </p>
                  <p className="mt-2 text-xl font-semibold tracking-tight text-[#252131]">
                    {device.release_year ?? "Not listed"}
                  </p>
                </div>

                <div className="rounded-2xl border border-[#efecf5] bg-[#fcfbff] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#918b9f]">
                    Model number
                  </p>
                  <p className="mt-2 break-words text-xl font-semibold tracking-tight text-[#252131]">
                    {device.model_number || "Not listed"}
                  </p>
                </div>

                <div className="col-span-2 rounded-2xl border border-[#efecf5] bg-[#fcfbff] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#918b9f]">
                    Registered variants
                  </p>
                  <p className="mt-2 text-xl font-semibold tracking-tight text-[#252131]">
                    {story.variants.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="mt-6 grid gap-6">
          {/* Specifications */}
          <Section
            eyebrow="01 / Device intelligence"
            title="Technical specifications"
            description="Published specifications recorded for this catalogue model."
          >
            <SpecificationGrid specifications={device.specifications} />
          </Section>

          {/* Variants */}
          <Section
            eyebrow="02 / Configurations"
            title="Hardware variants"
            description="Model numbers and configurations registered for this device."
          >
            {story.variants.length === 0 ? (
              <EmptyState text="No hardware variants have been registered yet." />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {story.variants.map((variant) => (
                  <DataCard
                    key={variant.id}
                    title={variant.model_number || `Variant #${variant.id}`}
                    subtitle={`Variant ID ${variant.id}`}
                    result="Catalogue variant"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        ["Storage", variant.storage],
                        ["Connectivity", variant.connectivity],
                        ["Region", variant.region],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#918b9f]">
                            {label}
                          </p>
                          <p className="mt-1 text-sm font-medium text-[#252131]">
                            {value || "Not listed"}
                          </p>
                        </div>
                      ))}
                    </div>

                    {variant.specifications &&
                      Object.keys(variant.specifications).length > 0 && (
                        <div className="mt-4 border-t border-[#eae5f4] pt-4">
                          <SpecificationGrid
                            specifications={variant.specifications}
                          />
                        </div>
                      )}
                  </DataCard>
                ))}
              </div>
            )}
          </Section>

          {/* Verification */}
          <Section
            eyebrow="03 / Trust"
            title="Verification records"
            description="Catalogue-linked verification records. These do not automatically verify a specific physical device."
          >
            {story.verifications.length === 0 ? (
              <EmptyState text="No verification results are currently recorded for this model." />
            ) : (
              <div className="space-y-3">
                {story.verifications.map((verification) => (
                  <DataCard
                    key={verification.id}
                    title={humanize(verification.verification_type)}
                    subtitle={formatDate(verification.created_at)}
                    result={verification.result}
                  >
                    {verification.confidence !== null && (
                      <p className="mb-3 text-sm text-[#777384]">
                        Confidence:{" "}
                        {Math.round(verification.confidence * 100)}%
                      </p>
                    )}

                    <Metadata data={verification.metadata} />
                  </DataCard>
                ))}
              </div>
            )}
          </Section>

          {/* Physical devices */}
          <Section
            eyebrow="04 / Individual devices"
            title="Registered physical devices"
            description="Records for individual devices associated with this catalogue model."
          >
            {story.physicalDevices.length === 0 ? (
              <EmptyState text="No individual physical devices are linked to this model yet. Catalogue specifications describe the model, not the condition of a particular device." />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {story.physicalDevices.map((physicalDevice) => (
                  <DataCard
                    key={physicalDevice.id}
                    title={`Physical device #${physicalDevice.id}`}
                    subtitle={`Updated ${formatDate(physicalDevice.updated_at)}`}
                    result={physicalDevice.status}
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#918b9f]">
                          First seen
                        </p>
                        <p className="mt-1 text-sm font-medium text-[#252131]">
                          {formatDate(physicalDevice.first_seen_at)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#918b9f]">
                          Last seen
                        </p>
                        <p className="mt-1 text-sm font-medium text-[#252131]">
                          {formatDate(physicalDevice.last_seen_at)}
                        </p>
                      </div>
                    </div>
                  </DataCard>
                ))}
              </div>
            )}
          </Section>

          {/* Evidence */}
          <Section
            eyebrow="05 / Diagnostics"
            title="Evidence and diagnostics"
            description="Recorded evidence from individual physical devices. Only data actually collected is displayed."
          >
            {story.evidence.length === 0 ? (
              <EmptyState text="No diagnostic or device evidence has been recorded yet." />
            ) : (
              <div className="space-y-3">
                {story.evidence.map((item) => (
                  <DataCard
                    key={item.id}
                    title={humanize(item.evidence_type)}
                    subtitle={`${item.source_name || humanize(item.source_type)} · ${formatDate(item.observed_at)}`}
                    result={item.result}
                  >
                    {item.confidence !== null && (
                      <p className="mb-3 text-sm text-[#777384]">
                        Confidence: {Math.round(item.confidence * 100)}%
                      </p>
                    )}

                    <Metadata data={item.metadata} />
                  </DataCard>
                ))}
              </div>
            )}
          </Section>

          {/* Sources */}
          <Section
            eyebrow="06 / Provenance"
            title="Data sources"
            description="Sources that contributed information to this catalogue entry."
          >
            {story.dataSources.length === 0 ? (
              <EmptyState text="No external data sources are recorded for this device yet." />
            ) : (
              <div className="space-y-3">
                {story.dataSources.map((source) => (
                  <DataCard
                    key={source.id}
                    title={source.source_name}
                    subtitle={`Retrieved ${formatDate(source.retrieved_at)}`}
                  >
                    {source.source_record_id && (
                      <p className="mb-3 break-all text-xs text-[#777384]">
                        Source record: {source.source_record_id}
                      </p>
                    )}

                    <Metadata data={source.metadata} />
                  </DataCard>
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>
    </main>
  );
}