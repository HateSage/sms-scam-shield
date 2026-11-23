import "./globals.css";

export const metadata = {
  title: "SMS Scam Shield | AI & Heuristic Fraud Detector",
  description: "Detect scam and fraud SMS messages in real-time with machine learning and red flag analysis.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
