import { lazy, Suspense } from "react";
import { Home } from "./components/Home";
import { Logo } from "./components/Logo";
import { Link, usePath } from "./router";

// The Harvey and About pages load only when you open them, so the main screen opens faster.
const HarveyReplay = lazy(() =>
  import("./components/HarveyReplay").then((m) => ({ default: m.HarveyReplay })),
);
const About = lazy(() => import("./components/About").then((m) => ({ default: m.About })));

const PAGES = [
  { href: "/", label: "Live" },
  { href: "/harvey", label: "Harvey Replay" },
  { href: "/about", label: "About" },
];

export function App() {
  const path = usePath();
  const page =
    path === "/harvey" ? <HarveyReplay /> : path === "/about" ? <About /> : <Home />;

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <Link href="/" className="brand" aria-label="TurnAround home">
          <Logo size={36} />
          <span className="brand-name">TurnAround</span>
        </Link>
        <nav aria-label="Pages">
          {PAGES.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              className="nav-link"
              aria-current={path === p.href ? "page" : undefined}
            >
              {p.label}
            </Link>
          ))}
        </nav>
      </header>
      <main id="main" className="page">
        <Suspense fallback={<p className="notice">Loading…</p>}>{page}</Suspense>
      </main>
      <footer className="site-footer">
        <p>
          Not an official warning service. Follow the{" "}
          <a href="https://www.weather.gov/hgx/">National Weather Service</a>. In an emergency,
          call <a href="tel:911">911</a>.
        </p>
      </footer>
    </>
  );
}
