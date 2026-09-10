import { Fraunces, Geist } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
});

export const metadata = {
  title: "Spora — funghi a Massa-Carrara",
  description:
    "Mappa micologica per frazione, tipo di bosco e versante: Massa-Carrara e tutta Italia.",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="it"
      className={`dark ${geist.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="flex h-full flex-col font-sans">
        <TooltipProvider>
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        </TooltipProvider>
      </body>
    </html>
  );
}
