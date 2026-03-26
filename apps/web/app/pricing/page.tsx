export default function PricingPage() {
  return (
    <main className="min-h-screen bg-black text-white px-6 py-16">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-4xl font-bold mb-6">Pricing</h1>
        <p className="text-white/70 mb-10">
          Choose the plan that fits your video generation needs.
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
            <h2 className="text-2xl font-semibold mb-3">Free</h2>
            <p className="text-white/70 mb-4">For testing and light usage.</p>
            <p className="text-3xl font-bold mb-6">₦0</p>
            <ul className="space-y-2 text-white/80">
              <li>Limited daily generations</li>
              <li>Basic features</li>
              <li>Standard speed</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
            <h2 className="text-2xl font-semibold mb-3">Pro</h2>
            <p className="text-white/70 mb-4">For serious creators and businesses.</p>
            <p className="text-3xl font-bold mb-6">₦5,000</p>
            <ul className="space-y-2 text-white/80">
              <li>More generations</li>
              <li>Priority access</li>
              <li>Premium workflow</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}