"use client";

import { useRouter } from "next/navigation";

export default function TermsPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-6 md:py-12">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="mb-6 rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold hover:bg-white/10"
          >
            ← Back to NaijaVid AI
          </button>

          <h1 className="text-3xl font-bold sm:text-4xl md:text-5xl">
            Terms of Service
          </h1>

          <p className="mt-3 text-sm text-white/50">
            Effective date: 6 September 2026
          </p>
        </div>

        <div className="space-y-8 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-8">
          <section>
            <h2 className="text-2xl font-bold">1. Acceptance of Terms</h2>
            <p className="mt-3 leading-7 text-white/75">
              By accessing or using NaijaVid AI, you agree to these Terms of
              Service and our Privacy Policy. If you do not agree, do not use
              the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold">2. The Service</h2>
            <p className="mt-3 leading-7 text-white/75">
              NaijaVid AI provides tools that can turn text, images and user
              instructions into short videos and related media. Features,
              limits, supported languages, generation quality and availability
              may change as the service develops.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold">3. Accounts</h2>
            <p className="mt-3 leading-7 text-white/75">
              You are responsible for maintaining control of your account and
              for activity performed through it. You must provide accurate
              information where required and must not use another person's
              account without permission.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold">4. Free and Paid Plans</h2>
            <p className="mt-3 leading-7 text-white/75">
              Free-plan usage is subject to the limits displayed in NaijaVid AI.
              Paid subscriptions provide the features described at the time of
              purchase and remain subject to fair-use, technical and capacity
              limits.
            </p>
            <p className="mt-3 leading-7 text-white/75">
              Subscription periods are calculated according to the plan terms
              shown during checkout. Early renewal may extend an active
              subscription from its existing expiry date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold">5. Payments</h2>
            <p className="mt-3 leading-7 text-white/75">
              Payments are processed through third-party payment providers.
              Prices are displayed before checkout. Payment verification is
              completed server-side before paid access is granted. You are
              responsible for ensuring that you are signed into the correct
              NaijaVid AI account when making a payment.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold">6. Refunds</h2>
            <p className="mt-3 leading-7 text-white/75">
              Unless required by applicable law or expressly stated otherwise,
              payments for successfully activated digital subscription periods
              are generally non-refundable once paid features have been made
              available. Where a duplicate charge, failed activation or billing
              error occurs, contact support so the transaction can be reviewed.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold">7. User Content and Permissions</h2>
            <p className="mt-3 leading-7 text-white/75">
              You retain responsibility for text, images and other material you
              submit. You represent that you have the rights and permissions
              necessary to upload and use that material. You grant NaijaVid AI
              the limited permission necessary to process, store, transform and
              deliver the content in order to provide the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold">8. Prohibited Use</h2>
            <div className="mt-3 space-y-3 leading-7 text-white/75">
              <p>
                You must not use NaijaVid AI to violate law, infringe
                intellectual-property or privacy rights, impersonate others for
                deceptive purposes, distribute malware, exploit the platform,
                evade usage limits or interfere with the service.
              </p>
              <p>
                You must not submit content that you are legally prohibited
                from possessing, processing or distributing.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold">9. AI-Generated Content</h2>
            <p className="mt-3 leading-7 text-white/75">
              AI-assisted or automated outputs may contain mistakes,
              inaccuracies, artefacts or unexpected results. You are
              responsible for reviewing generated content before publishing,
              distributing or relying on it. NaijaVid AI does not guarantee
              that generated output will be unique, error-free or suitable for
              every purpose.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold">10. Intellectual Property</h2>
            <p className="mt-3 leading-7 text-white/75">
              NaijaVid AI, its software, branding, interfaces and platform
              materials remain protected by applicable intellectual-property
              rights. These Terms do not transfer ownership of the platform or
              its underlying technology to users.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold">11. Availability and Changes</h2>
            <p className="mt-3 leading-7 text-white/75">
              We may update, suspend, limit or discontinue features where
              necessary for maintenance, security, legal compliance, capacity
              management or product development. We do not guarantee
              uninterrupted availability.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold">12. Suspension and Termination</h2>
            <p className="mt-3 leading-7 text-white/75">
              Access may be limited or suspended where we reasonably believe an
              account is involved in fraud, abuse, security threats, unlawful
              activity, repeated policy violations or attempts to circumvent
              platform restrictions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold">13. Disclaimer</h2>
            <p className="mt-3 leading-7 text-white/75">
              NaijaVid AI is provided on an "as available" basis to the extent
              permitted by law. We do not guarantee that every generated video,
              narration, language output or third-party service will meet a
              particular user's requirements.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold">14. Limitation of Liability</h2>
            <p className="mt-3 leading-7 text-white/75">
              To the extent permitted by applicable law, NaijaVid AI will not
              be liable for indirect, incidental or consequential loss arising
              solely from use of, inability to use, or reliance on generated
              content or third-party services. Nothing in these Terms excludes
              liability that cannot lawfully be excluded.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold">15. Governing Law</h2>
            <p className="mt-3 leading-7 text-white/75">
              These Terms are intended to operate under the applicable laws of
              the Federal Republic of Nigeria, subject to any mandatory rights
              that may apply to a user in another jurisdiction.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold">16. Changes to These Terms</h2>
            <p className="mt-3 leading-7 text-white/75">
              We may revise these Terms as NaijaVid AI evolves. Material
              revisions will be reflected by an updated effective date.
              Continued use after revised Terms become effective constitutes
              acceptance to the extent permitted by law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold">17. Contact</h2>
            <p className="mt-3 leading-7 text-white/75">
              For support, billing questions, complaints or legal enquiries,
              contact NaijaVid AI through the support or contact channel
              provided within the platform.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
