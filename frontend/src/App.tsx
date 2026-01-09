import { NavLink, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import TradeView from "./pages/TradeView";
import Positions from "./pages/Positions";
import TradeLog from "./pages/TradeLog";
import Settings from "./pages/Settings";
import Lessons from "./pages/Lessons";
import Portal from "./pages/Portal";

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-zinc-800/70 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <h1 className="text-lg font-semibold tracking-tight">
            Learning Mode
          </h1>
          <nav className="flex items-center gap-2 text-sm">
            <TopLink to="/portal">← Back to Portal</TopLink>
            <TopLink to="/">Dashboard</TopLink>
            <TopLink to="/settings">Settings</TopLink>
          </nav>
        </div>
      </header>

      {/* Sidebar + content */}
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="grid grid-cols-[220px,1fr] gap-4">
          {/* Sidebar */}
          <aside className="rounded-xl border border-zinc-800/70 bg-zinc-900/40 p-3">
            <nav className="space-y-1 text-sm">
              <SideLink to="/" end>
                Overview
              </SideLink>
              <SideLink to="/trade">Trade View</SideLink>
              <SideLink to="/positions">Positions &amp; Orders</SideLink>
              <SideLink to="/log">Trade Log</SideLink>
              <SideLink to="/lessons">Lessons</SideLink>
            </nav>
          </aside>

          {/* Routed page */}
          <section className="rounded-xl border border-zinc-800/70 bg-zinc-900/40">
            {children}
          </section>
        </div>
      </main>
    </div>
  );
}

function TopLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `px-3 py-1.5 rounded-lg border ${
          isActive
            ? "bg-zinc-800 border-zinc-700"
            : "border-zinc-700 hover:bg-zinc-900"
        }`
      }
      end={to === "/"}
    >
      {children}
    </NavLink>
  );
}

function SideLink({
  to,
  children,
  end = false,
}: {
  to: string;
  children: React.ReactNode;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `block px-3 py-2 rounded-lg border ${
          isActive
            ? "bg-zinc-800 border-zinc-700"
            : "border-transparent hover:bg-zinc-800/60 hover:border-zinc-700"
        }`
      }
    >
      {children}
    </NavLink>
  );
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <AppLayout>
            <Dashboard />
          </AppLayout>
        }
      />
      <Route
        path="/trade"
        element={
          <AppLayout>
            <TradeView />
          </AppLayout>
        }
      />
      <Route
        path="/positions"
        element={
          <AppLayout>
            <Positions />
          </AppLayout>
        }
      />
      <Route
        path="/log"
        element={
          <AppLayout>
            <TradeLog />
          </AppLayout>
        }
      />
      <Route
        path="/lessons"
        element={
          <AppLayout>
            <Lessons />
          </AppLayout>
        }
      />
      <Route path="/portal" element={<Portal />} />
      <Route
        path="/settings"
        element={
          <AppLayout>
            <Settings />
          </AppLayout>
        }
      />
    </Routes>
  );
}
