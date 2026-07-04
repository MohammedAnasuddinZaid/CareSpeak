import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — CareSpeak",
  description: "CareSpeak privacy policy — all processing happens on-device, no data leaves your browser",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#f9f7f5]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <h1 className="text-4xl font-bold text-[#1f1f1f] mb-8">Privacy Policy</h1>
        <div className="card p-8 text-sm text-[#6e6e6e] leading-relaxed space-y-4">
          <p><strong>Last updated:</strong> July 2025</p>

          <h2 className="text-lg font-semibold text-[#1f1f1f] mt-6">Our Commitment</h2>
          <p>
            CareSpeak is designed with privacy as a fundamental principle. All computer vision 
            processing happens entirely on your device using WebAssembly. No video, images, or 
            personal data are ever transmitted to any server.
          </p>

          <h2 className="text-lg font-semibold text-[#1f1f1f] mt-6">What We Collect</h2>
          <p>
            <strong>Nothing.</strong> CareSpeak does not collect, store, or transmit any personal 
            information. There are no analytics, no tracking scripts, no cookies, and no user accounts.
          </p>

          <h2 className="text-lg font-semibold text-[#1f1f1f] mt-6">How It Works</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Camera frames are processed in real-time by MediaPipe (on-device WebAssembly)</li>
            <li>Landmark data (21 hand points / 478 face points) is analyzed locally</li>
            <li>Gesture classifications and metrics are stored in your browser&apos;s localStorage</li>
            <li>Cross-device sync transmits only text-based gesture data (no video or images)</li>
          </ul>

          <h2 className="text-lg font-semibold text-[#1f1f1f] mt-6">Camera Access</h2>
          <p>
            Camera access is requested solely for real-time gesture detection. The video stream 
            never leaves your browser. You can revoke camera permission at any time via your 
            browser settings.
          </p>

          <h2 className="text-lg font-semibold text-[#1f1f1f] mt-6">Contact</h2>
          <p>
            For privacy-related questions, please open an issue on our GitHub repository.
          </p>
        </div>
      </div>
    </div>
  );
}
