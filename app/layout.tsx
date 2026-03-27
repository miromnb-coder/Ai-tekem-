export const metadata = {
  title: "Halo AI App Builder",
  description: "Build Halo-style AI app blueprints from a prompt.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fi">
      <body>{children}</body>
    </html>
  );
}
