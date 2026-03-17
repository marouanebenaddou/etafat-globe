import type { Metadata } from "next";
import { Montserrat, Raleway } from "next/font/google";
import { ThemeProvider } from "@/lib/theme-context";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const raleway = Raleway({
  variable: "--font-raleway",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Etafat — Révélons le potentiel de vos territoires",
  description:
    "Leader en solutions géospatiales, topographie et SIG au Maroc et en Afrique depuis 1983. 170 experts, 4 unités métier, 8+ pays d'intervention.",
  keywords: "géospatiale, topographie, SIG, Maroc, Afrique, LiDAR, drones, BIM, foncier, cartographie",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark">
      <body className={`${montserrat.variable} ${raleway.variable} antialiased`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
