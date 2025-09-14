import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ClerkProvider } from "@clerk/nextjs";
import { UsageProvider } from "./contexts/UsageContext";
import { ConditionalLayout } from "./components/conditional-layout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "MinuteMind - AI-Powered Meeting Management",
    template: "%s | MinuteMind"
  },
  description: "Transform your meetings with AI-powered note-taking, action item tracking, and seamless integration with Trello, Jira, Asana, and Google Calendar. Boost productivity and never miss important tasks again.",
  keywords: [
    "meeting management",
    "AI note-taking",
    "action items",
    "project management",
    "Trello integration",
    "Jira integration",
    "Asana integration",
    "Google Calendar",
    "productivity",
    "team collaboration",
    "meeting minutes",
    "meeting bot",
    "AI assistant",
    "meeting automation",
    "meeting summaries",
    "task tracking",
    "Slack integration",
    "meeting insights"
  ],
  authors: [{ name: "MinuteMind Team" }],
  creator: "MinuteMind",
  publisher: "MinuteMind",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "MinuteMind - AI-Powered Meeting Management",
    description: "Transform your meetings with AI-powered note-taking, action item tracking, and seamless integration with Trello, Jira, Asana, and Google Calendar.",
    siteName: "MinuteMind",
    images: [
      {
        url: "/logo.jpg",
        width: 1200,
        height: 630,
        alt: "MinuteMind - AI-Powered Meeting Management",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MinuteMind - AI-Powered Meeting Management",
    description: "Transform your meetings with AI-powered note-taking, action item tracking, and seamless integration with Trello, Jira, Asana, and Google Calendar.",
    images: ["/logo.jpg"],
    creator: "@minutemind",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html>
        <head>
          <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
          <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
          <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
          <link rel="manifest" href="/site.webmanifest" />
          <meta name="msapplication-TileColor" content="#da532c" />
          <meta name="theme-color" content="#ffffff" />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Organization",
                "name": "MinuteMind",
                "url": process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
                "logo": `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/logo.jpg`,
                "description": "Transform your meetings with AI-powered note-taking, action item tracking, and seamless integration with Trello, Jira, Asana, and Google Calendar.",
                "foundingDate": "2023",
                "sameAs": [
                  "https://twitter.com/minutemind"
                ]
              })
            }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Product",
                "name": "MinuteMind - AI-Powered Meeting Management",
                "description": "AI-powered meeting assistant for automatic summaries, action items, and integrations with popular tools.",
                "brand": {
                  "@type": "Brand",
                  "name": "MinuteMind"
                },
                "offers": {
                  "@type": "Offer",
                  "price": "0",
                  "priceCurrency": "USD",
                  "availability": "https://schema.org/InStock",
                  "description": "Free forever plan available"
                },
                "aggregateRating": {
                  "@type": "AggregateRating",
                  "ratingValue": "4.8",
                  "reviewCount": "150"
                }
              })
            }}
          />
        </head>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <body
            className={`${geistSans.variable} ${geistMono.variable} antialiased`}
          >
            <UsageProvider>
              <ConditionalLayout>{children}</ConditionalLayout>
            </UsageProvider>
          </body>
        </ThemeProvider>
      </html>
    </ClerkProvider>
  );
}
