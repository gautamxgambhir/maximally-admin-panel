interface NewsletterPreviewProps {
  subject: string;
  htmlContent: string;
}

export function NewsletterPreview({ subject, htmlContent }: NewsletterPreviewProps) {
  return (
    <div className="bg-white text-black p-8 rounded-lg">
      <div className="max-w-2xl mx-auto">
        {/* Email Header */}
        <div className="border-b pb-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{subject}</h1>
          <p className="text-sm text-gray-500 mt-2">From: Maximally Newsletter</p>
        </div>

        {/* Email Content */}
        <div
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />

        {/* Email Footer */}
        <div className="border-t mt-8 pt-6 text-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} Maximally. All rights reserved.</p>
          <p className="mt-2">
            You're receiving this email because you subscribed to our newsletter.
          </p>
          <p className="mt-1">
            <a href="#" className="text-purple-600 hover:underline">
              Unsubscribe
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
