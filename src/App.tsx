import { lazy, Suspense } from "react";
import { Home } from "./components/Home";
import { Logo } from "./components/Logo";
import { Link, usePath } from "./router";

// The About page loads only when you open it, so the main screen opens faster.
const About = lazy(() => import("./components/About").then((m) => ({ default: m.About })));

export function App() {
  const path = usePath();
  const page =
    path === "/about" ? <About /> : <Home />;

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <Link href="/" className="brand" aria-label="TurnAround home">
          <Logo size={32} />
          <span className="brand-name">TurnAround</span>
        </Link>
        <nav aria-label="Pages">
          {path === "/about" ? (
            <Link href="/" className="nav-link">
              Live
            </Link>
          ) : (
            <Link href="/about" className="nav-link">
              About
            </Link>
          )}
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
