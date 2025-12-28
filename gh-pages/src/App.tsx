import { Routes, Route, Link, useLocation } from "react-router-dom";
import data from "../data/fork-progress.json";

// Types
type Issue = (typeof data.issues)[0];
type Module = (typeof data.modules)[0];

// Navigation
function Nav() {
  const location = useLocation();
  const isActive = (path: string) =>
    location.pathname === path ? "text-blue-400 font-semibold" : "text-slate-400 hover:text-white";

  return (
    <nav className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-xl font-bold text-white flex items-center gap-2">
            ✈️ Plane Fork
          </Link>
          <span className="text-slate-600">|</span>
          <span className="text-slate-500 text-sm">Read-only Progress Tracker</span>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <Link to="/" className={isActive("/")}>
            Overview
          </Link>
          <Link to="/issues" className={isActive("/issues")}>
            Issues
          </Link>
          <Link to="/modules" className={isActive("/modules")}>
            Modules
          </Link>
          <Link to="/pages" className={isActive("/pages")}>
            Pages
          </Link>
          <Link to="/analytics" className={isActive("/analytics")}>
            Analytics
          </Link>
        </div>
      </div>
    </nav>
  );
}

// Overview Page
function Overview() {
  const completedIssues = data.issues.filter((i) => i.state === "Deployed" || i.state === "Done").length;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="bg-slate-800 rounded-xl p-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">{data.project.name}</h1>
            <p className="text-slate-400 text-lg mb-4">{data.project.description}</p>
            <div className="flex gap-3">
              <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-sm">main-pms</span>
              <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm">✓ Active</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-blue-400">{data.stats.linesAdded.toLocaleString()}</div>
            <div className="text-slate-500">lines added</div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon="📋" value={data.issues.length} label="Work Items" color="blue" />
        <StatCard icon="✓" value={completedIssues} label="Completed" color="green" />
        <StatCard icon="📦" value={data.modules.length} label="Modules" color="purple" />
        <StatCard icon="🔄" value={data.commits.length} label="Commits" color="orange" />
      </div>

      {/* Recent Commits */}
      <div className="bg-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Commits</h2>
        <div className="space-y-2">
          {data.commits.slice(0, 8).map((commit) => (
            <div key={commit.hash} className="flex items-center gap-4 p-3 rounded-lg bg-slate-700/50">
              <code className="text-slate-500 font-mono text-sm">{commit.hash.slice(0, 7)}</code>
              <CommitTypeBadge message={commit.message} />
              <span className="flex-1 text-slate-300 truncate">{commit.message.split(":")[1]?.trim()}</span>
              <span className="text-slate-500 text-sm">{commit.date}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Goals */}
      <div className="bg-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Project Goals</h2>
        <div className="grid grid-cols-2 gap-4">
          <GoalCard icon="🖥️" title="Run entirely on localhost" desc="Edge proxy on port 3005" />
          <GoalCard icon="💾" title="Portable data storage" desc="All state under ./data/" />
          <GoalCard icon="⚖️" title="OSS licensing compliance" desc="AGPLv3 license" />
          <GoalCard icon="🪶" title="Minimal services" desc="Essential containers only" />
        </div>
      </div>
    </div>
  );
}

// Issues Page
function Issues() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Work Items</h1>
        <span className="text-slate-500">{data.issues.length} items</span>
      </div>
      <div className="space-y-2">
        {data.issues.map((issue) => (
          <IssueCard key={issue.id} issue={issue} />
        ))}
      </div>
    </div>
  );
}

// Modules Page
function Modules() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Modules</h1>
      <div className="grid grid-cols-2 gap-4">
        {data.modules.map((module) => (
          <ModuleCard key={module.id} module={module} />
        ))}
      </div>

      <h2 className="text-xl font-bold mt-8">Cycles (Sprints)</h2>
      <div className="space-y-3">
        {data.cycles.map((cycle) => (
          <div key={cycle.id} className="bg-slate-800 rounded-lg p-4 flex justify-between items-center">
            <div>
              <h3 className="font-semibold">{cycle.name}</h3>
              <p className="text-slate-500 text-sm">{cycle.description}</p>
            </div>
            <div className="text-right text-sm text-slate-500">
              {cycle.startDate} → {cycle.endDate}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Pages Page
function Pages() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Documentation Pages</h1>
      {data.pages.map((page) => (
        <div key={page.id} className="bg-slate-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-700 flex justify-between items-center">
            <h3 className="font-semibold">{page.name}</h3>
            <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">Public</span>
          </div>
          <div
            className="p-6 prose prose-invert prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: page.content }}
          />
        </div>
      ))}
    </div>
  );
}

// Analytics Page
function Analytics() {
  const byPriority: Record<string, number> = {};
  const byModule: Record<string, number> = {};
  const byLabel: Record<string, number> = {};

  data.issues.forEach((issue) => {
    byPriority[issue.priority] = (byPriority[issue.priority] || 0) + 1;
    byModule[issue.module] = (byModule[issue.module] || 0) + 1;
    issue.labels.forEach((l) => {
      byLabel[l] = (byLabel[l] || 0) + 1;
    });
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Analytics Dashboard</h1>

      <div className="grid grid-cols-4 gap-4">
        <StatCard icon="📋" value={data.issues.length} label="Total Issues" color="blue" />
        <StatCard
          icon="✓"
          value={data.issues.filter((i) => i.state === "Deployed").length}
          label="Deployed"
          color="green"
        />
        <StatCard icon="📝" value={data.stats.linesAdded.toLocaleString()} label="Lines Added" color="purple" />
        <StatCard icon="📁" value={data.stats.filesChanged} label="Files Changed" color="orange" />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-xl p-6">
          <h3 className="font-semibold mb-4">By Priority</h3>
          {Object.entries(byPriority)
            .sort((a, b) => b[1] - a[1])
            .map(([p, count]) => (
              <ProgressBar key={p} label={p} value={count} max={data.issues.length} />
            ))}
        </div>

        <div className="bg-slate-800 rounded-xl p-6">
          <h3 className="font-semibold mb-4">By Module</h3>
          {Object.entries(byModule)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([m, count]) => (
              <ProgressBar key={m} label={m} value={count} max={data.issues.length} />
            ))}
        </div>

        <div className="bg-slate-800 rounded-xl p-6 col-span-2">
          <h3 className="font-semibold mb-4">Top Labels</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(byLabel)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 12)
              .map(([label, count]) => {
                const labelData = data.labels.find((l) => l.name === label);
                return (
                  <span
                    key={label}
                    className="px-3 py-1 rounded-full text-sm"
                    style={{ background: `${labelData?.color}20`, color: labelData?.color }}
                  >
                    {label} ({count})
                  </span>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}

// Components
function StatCard({
  icon,
  value,
  label,
  color,
}: {
  icon: string;
  value: number | string;
  label: string;
  color: string;
}) {
  const colors: Record<string, string> = {
    blue: "bg-blue-500/20 text-blue-400",
    green: "bg-green-500/20 text-green-400",
    purple: "bg-purple-500/20 text-purple-400",
    orange: "bg-orange-500/20 text-orange-400",
  };
  return (
    <div className="bg-slate-800 rounded-xl p-6">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-lg ${colors[color]} flex items-center justify-center text-xl`}>{icon}</div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-slate-500 text-sm">{label}</div>
        </div>
      </div>
    </div>
  );
}

function GoalCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-lg bg-slate-700/50">
      <span className="text-xl">{icon}</span>
      <div>
        <div className="font-medium">{title}</div>
        <div className="text-slate-500 text-sm">{desc}</div>
      </div>
    </div>
  );
}

function CommitTypeBadge({ message }: { message: string }) {
  const type = message.split(":")[0];
  const colors: Record<string, string> = {
    feat: "bg-green-500/20 text-green-400",
    fix: "bg-red-500/20 text-red-400",
    docs: "bg-blue-500/20 text-blue-400",
    chore: "bg-slate-500/20 text-slate-400",
  };
  return <span className={`px-2 py-0.5 rounded text-xs ${colors[type] || colors.chore}`}>{type}</span>;
}

function IssueCard({ issue }: { issue: Issue }) {
  const priorityIcons: Record<string, string> = { urgent: "🔴", high: "🟠", medium: "🟡", low: "🔵" };
  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <span>{priorityIcons[issue.priority] || "⚪"}</span>
        <div className="flex-1">
          <div className="font-medium mb-2">{issue.name}</div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="px-2 py-0.5 rounded-full text-xs"
              style={{ background: `${issue.stateColor}20`, color: issue.stateColor }}
            >
              {issue.state}
            </span>
            {issue.labels.slice(0, 3).map((label) => {
              const labelData = data.labels.find((l) => l.name === label);
              return (
                <span
                  key={label}
                  className="px-2 py-0.5 rounded-full text-xs"
                  style={{ background: `${labelData?.color}20`, color: labelData?.color }}
                >
                  {label}
                </span>
              );
            })}
            <span className="text-slate-500 text-xs">📦 {issue.module}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModuleCard({ module }: { module: Module }) {
  const statusColors: Record<string, string> = {
    completed: "bg-green-500/20 text-green-400",
    "in-progress": "bg-blue-500/20 text-blue-400",
    planned: "bg-yellow-500/20 text-yellow-400",
  };
  return (
    <div className="bg-slate-800 rounded-xl p-6">
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold">{module.name}</h3>
        <span className={`px-2 py-0.5 rounded text-xs ${statusColors[module.status]}`}>{module.status}</span>
      </div>
      <p className="text-slate-400 text-sm mb-3">{module.description}</p>
      <div className="text-slate-500 text-sm">📋 {module.issueCount} issues</div>
    </div>
  );
}

function ProgressBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-1">
        <span className="capitalize">{label}</span>
        <span className="text-slate-500">{value}</span>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// App
export default function App() {
  return (
    <div className="min-h-screen bg-slate-900">
      <Nav />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/issues" element={<Issues />} />
          <Route path="/modules" element={<Modules />} />
          <Route path="/pages" element={<Pages />} />
          <Route path="/analytics" element={<Analytics />} />
        </Routes>
      </main>
      <footer className="border-t border-slate-800 py-6 text-center text-slate-500 text-sm">
        Plane Fork Progress • Read-only static site •{" "}
        <a href="https://github.com/TentacioPro/plane" className="text-blue-400 hover:underline">
          GitHub
        </a>
      </footer>
    </div>
  );
}
