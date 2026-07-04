import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — CareSpeak",
  description: "Terms of service for CareSpeak assistive communication software",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#f9f7f5]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <h1 className="text-4xl font-bold text-[#1f1f1f] mb-8">Terms of Service</h1>
        <div className="card p-8 text-sm text-[#6e6e6e] leading-relaxed space-y-4">
          <p><strong>Last updated:</strong> July 2026</p>

          <h2 className="text-lg font-semibold text-[#1f1f1f] mt-6">Acceptance of Terms</h2>
          <p>
            By using CareSpeak, you agree to these terms of service. If you do not agree, 
            do not use the software.
          </p>

          <h2 className="text-lg font-semibold text-[#1f1f1f] mt-6">Medical Disclaimer</h2>
          <p>
            CareSpeak is an assistive communication tool and is not a medical device. It is not 
            intended to replace professional medical care, monitoring, or emergency response 
            systems. Always follow your healthcare facility&apos;s protocols for patient communication 
            and monitoring.
          </p>

          <h2 className="text-lg font-semibold text-[#1f1f1f] mt-6">Open Source License</h2>
          <p>
            CareSpeak is released under the MIT License. You are free to use, modify, and 
            distribute the software in accordance with that license.
          </p>

          <h2 className="text-lg font-semibold text-[#1f1f1f] mt-6">No Warranty</h2>
          <p>
            CareSpeak is provided &quot;as is&quot; without warranty of any kind, express or implied. 
            The authors are not liable for any damages arising from the use of this software.
          </p>

          <h2 className="text-lg font-semibold text-[#1f1f1f] mt-6">Changes to Terms</h2>
          <p>
            We reserve the right to update these terms at any time. Continued use of CareSpeak 
            after changes constitutes acceptance of the new terms.
          </p>
        </div>
      </div>
    </div>
  );
}
