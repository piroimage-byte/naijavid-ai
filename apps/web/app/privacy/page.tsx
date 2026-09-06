"use client";

import { useRouter } from "next/navigation";

export default function PrivacyPolicyPage() {
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
            Privacy Policy
          </h1>

          <p className="mt-3 text-sm text-white/50">
            Effective date: 6 September 2026
          </p>
        </div>

        <div className="space-y-8 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-8">
          <section>
            <h2 className="text-2xl font-bold">1. Introduction</h2>
            <p className="mt-3 leading-7 text-white/75">
              NaijaVid AI provides tools for creating videos from text, images,
              prompts and related media. This Privacy Policy explains the
              personal information we collect, why we use it, how we protect
              it, and the choices available to you when you use NaijaVid AI.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold">2. Information We Collect</h2>
            <div className="mt-3 space-y-3 leading-7 text-white/75">
              <p>
                We may collect account information such as your name, email
                address, profile information and authentication identifiers.
              </p>
              <p>
                When you use the generator, we may process prompts, uploaded
                images, generated videos, generation settings, language
                choices, timestamps and related usage information.
              </p>
              <p>
                For paid plans, payment processing is handled through our
                payment provider. NaijaVid AI does not need to store your full
                payment-card number, PIN or CVV.
              </p>
              <p>
                We may also process technical information such as device,
                browser, IP address, error logs and service-usage information
                for security, troubleshooting and platform improvement.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold">3. Why We Use Information</h2>
            <div className="mt-3 space-y-3 leading-7 text-white/75">
              <p>
                We use information to authenticate users, provide video
                generation, save video history, enforce free and paid plan
                limits, process subscriptions, prevent fraud and abuse,
                maintain security and improve service reliability.
              </p>
              <p>
                We may also use information where necessary to comply with
                applicable law, respond to lawful requests, protect users and
                enforce our Terms of Service.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold">4. Legal Basis and Nigerian Data Protection</h2>
            <p className="mt-3 leading-7 text-white/75">
              Where applicable, NaijaVid AI processes personal data on
              recognised lawful bases such as consent, contractual necessity,
              legitimate interests and legal obligations. We aim to handle
              personal data in accordance with applicable Nigerian data
              protection requirements, including the Nigeria Data Protection
              Act 2023.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold">5. Third-Party Services</h2>
            <p className="mt-3 leading-7 text-white/75">
              NaijaVid AI uses third-party infrastructure and services for
              functions such as authentication, cloud hosting, storage,
              payments and media processing. These providers may process
              information on our behalf according to their own privacy and
              security obligations.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold">6. Uploaded Images and Generated Content</h2>
            <p className="mt-3 leading-7 text-white/75">
              Content you upload may be transmitted to systems required to
              perform generation, storage or delivery. You should only upload
              material that you have the right and permission to use. Generated
              content may be retained in your video history until it is deleted
              or removed according to our storage practices.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold">7. Data Retention</h2>
            <p className="mt-3 leading-7 text-white/75">
              We retain information for as long as reasonably necessary to
              provide the service, maintain account and transaction records,
              prevent abuse, comply with legal obligations and resolve
              disputes. Retention periods may vary according to the type of
              information and purpose for which it is processed.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold">8. Security</h2>
            <p className="mt-3 leading-7 text-white/75">
              We use technical and organisational safeguards designed to
              protect user information, including authenticated access,
              server-side payment verification and restricted access to
              sensitive credentials. No online service can guarantee absolute
              security, so users should also protect their accounts and devices.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold">9. Your Rights and Choices</h2>
            <p className="mt-3 leading-7 text-white/75">
              Subject to applicable law, you may have rights relating to
              access, correction, deletion, restriction, objection, withdrawal
              of consent and portability of your personal data. Some data may
              need to be retained where required for legal, security or
              transaction-record purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold">10. Children</h2>
            <p className="mt-3 leading-7 text-white/75">
              NaijaVid AI is not intended for children who are not legally able
              to provide valid consent or enter into the applicable service
              agreement without appropriate parental or guardian involvement.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold">11. International Processing</h2>
            <p className="mt-3 leading-7 text-white/75">
              Some service providers used by NaijaVid AI may process or store
              information outside Nigeria. Where applicable, we aim to use
              appropriate safeguards for such processing.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold">12. Changes to This Policy</h2>
            <p className="mt-3 leading-7 text-white/75">
              We may update this Privacy Policy when the service, law or our
              data-handling practices change. The effective date at the top of
              this page will be updated when material revisions are published.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold">13. Contact</h2>
            <p className="mt-3 leading-7 text-white/75">
              For privacy questions, data-rights requests or complaints,
              contact NaijaVid AI through the support or contact channel
              provided within the platform.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
