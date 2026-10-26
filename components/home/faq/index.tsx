export default function FaqSection() {
  const faqs = [
    {
      question: "Are the devices original?",
      answer:
        "Yes. All devices sold on Rebox are verified original devices from trusted sellers and suppliers.",
    },

    {
      question: "How do I know the phone is in good condition?",
      answer:
        "Every device goes through inspection checks covering functionality, battery health, display quality, cameras, speakers, and more.",
    },

    {
      question: "Do the devices come with warranty?",
      answer:
        "Yes. Eligible devices come with warranty coverage so you can buy with confidence.",
    },

    {
      question: "Can I pay on delivery?",
      answer:
        "Payment and delivery options depend on your location and the seller. More flexible options will be added over time.",
    },

    {
      question: "Why buy pre-owned instead of new?",
      answer:
        "You save a significant amount of money while still getting premium devices that perform properly.",
    },
  ];

  return (
    <section className="px-6 py-20 lg:px-12">

      <div className="mx-auto max-w-5xl">

        {/* HEADER */}
        <div className="max-w-2xl">

          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-violet-600">
            FAQ
          </p>

          <h2 className="mt-3 text-[24px] font-bold tracking-[-0.05em] text-[#111111]">
            Frequently Asked Questions
          </h2>

        </div>

        {/* FAQ LIST */}
        <div className="mt-14 space-y-4">

          {faqs.map((faq, index) => (
            <div
              key={index}
              className="rounded-[28px] border border-[#ebe7ff] bg-white p-6 lg:p-8"
            >

              <h3 className="text-[16px] font-medium leading-relaxed text-[#111111]">
                {faq.question}
              </h3>

              <p className="mt-4 text-[15px] leading-relaxed text-[#5f6470]">
                {faq.answer}
              </p>

            </div>
          ))}

        </div>

      </div>

    </section>
  );
}