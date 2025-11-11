import Link from "next/link";

const links = [
  { href: "/applications", label: "Applications" },
  { href: "/documents", label: "Documents" },
  { href: "/lenders", label: "Lenders" },
  { href: "/pipeline", label: "Pipeline" },
];

export default function Home() {
  return (
    <div>
      <h1>Boreal Financial Staff Portal</h1>
      <p>Select a module to explore the stubbed integrations.</p>
      <ul>
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href}>{link.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
