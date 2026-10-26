export default function Newsletter() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="overflow-hidden rounded-[40px] bg-[#111111] px-6 py-16 text-white lg:px-16">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-violet-400">
              Stay Updated
            </p>

            <h2 className="mt-4 text-4xl font-black tracking-[-0.05em]">
              Get notified about fresh deals before everyone else.
            </h2>

            <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-zinc-400">
              Be the first to know when new verified iPhones, MacBooks,
              gaming consoles, and accessories drop on Rebox.
            </p>
          </div>

          <div className="mt-10 flex flex-col gap-2 sm:flex-row">
            <input
              type="email"
              placeholder="Enter your email"
              className="h-14 w-full rounded-full border border-zinc-700 bg-zinc-900 px-6 text-[15px] text-white outline-none placeholder:text-zinc-500"
            />

            <button className="h-14 whitespace-nowrap rounded-full bg-violet-500 px-10 py-3 text-[16px] font-semibold text-white transition hover:bg-violet-600">
              Sign up
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}