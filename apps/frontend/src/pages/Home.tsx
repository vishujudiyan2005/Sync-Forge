import { motion } from "framer-motion";
import { ArrowRight, Braces, Check, CirclePlay, Code2, FolderPlus, Link2, MessagesSquare, MousePointer2, ShieldCheck, Sparkles, UsersRound, Workflow, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";

const features = [
  { icon: UsersRound, title: "A room that feels shared", description: "See who is active and collaborate in the same workspace—without losing the thread." },
  { icon: MessagesSquare, title: "The conversation stays close", description: "Discuss ideas beside the code, share context, and make faster decisions together." },
  { icon: Braces, title: "Everything in its place", description: "Code, run, sketch, and review with an interface built for uninterrupted flow." },
];

const steps = [
  { icon: FolderPlus, number: "01", title: "Create a room", description: "Open a focused workspace in a few seconds. No complex setup required." },
  { icon: Link2, number: "02", title: "Share your link", description: "Invite collaborators with a room code or a shareable link whenever you’re ready." },
  { icon: Workflow, number: "03", title: "Build in sync", description: "Write, talk, draw, and run code together from one polished workspace." },
];

export const Home = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--page)] text-[var(--text)]">
      <div className="premium-grid pointer-events-none absolute inset-0 opacity-70" />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <nav className="flex h-24 items-center justify-between">
          <Link to="/" className="flex items-center gap-3 text-lg font-extrabold tracking-tight text-[var(--text-strong)]">
            <span className="neu-icon-btn h-11 w-11 !text-[var(--brand)]"><Code2 size={21} /></span>
            SyncForge
          </Link>
          <div className="hidden items-center gap-7 text-sm font-bold text-[var(--muted)] md:flex">
            <a href="#how-it-works" className="transition-colors duration-200 hover:text-[var(--text)]">How it works</a>
            <a href="#features" className="transition-colors duration-200 hover:text-[var(--text)]">Features</a>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" className="theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`} title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              <span className="hidden sm:inline">{theme === "dark" ? "Light" : "Dark"}</span>
            </button>
            <Link to="/start" className="neu-btn h-10 rounded-full px-5 text-sm font-bold">Enter a room</Link>
          </div>
        </nav>

        <section className="grid items-center gap-16 py-16 lg:grid-cols-[1fr_.92fr] lg:py-24">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .55 }}>
            <div className="neu-flat mb-7 inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold tracking-wide text-[var(--brand)]">
              <Sparkles size={14} /> THE COLLABORATIVE CODING SPACE
            </div>
            <h1 className="max-w-3xl text-5xl font-extrabold leading-[1.04] tracking-[-.045em] text-[var(--text-strong)] sm:text-6xl lg:text-7xl">
              Real-time coding, <span className="text-[var(--brand)]">perfectly synced.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-[var(--muted)]">SyncForge brings your editor, conversations, whiteboard, and execution environment into one calm space—so your team can stay in flow.</p>
            <div className="mt-9 flex flex-wrap gap-4">
              <Link to="/start" className="neu-btn neu-btn-primary group h-14 rounded-[var(--radius)] px-6 text-sm font-extrabold">
                Create a workspace <ArrowRight size={17} className="transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
              <a href="#how-it-works" className="neu-btn h-14 rounded-[var(--radius)] px-6 text-sm font-bold">
                <CirclePlay size={17} className="text-[var(--brand)]" /> See how it works
              </a>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-[var(--muted)]">
              {["Instant rooms", "Live presence", "No setup required"].map(item => (
                <span key={item} className="flex items-center gap-2"><Check size={16} className="text-[var(--brand)]" />{item}</span>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .65, delay: .12 }} className="relative mx-auto w-full max-w-xl">
            <div className="neu-card relative overflow-hidden p-4">
              <div className="neu-inset mb-4 flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[var(--brand)]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[var(--brown)]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[var(--muted)]" />
                </div>
                <span className="font-mono-app text-[11px] text-[var(--muted)]">workspace / checkout.ts</span>
                <span className="neu-flat px-2 py-1 text-[10px] font-bold text-[var(--brand)]">LIVE</span>
              </div>
              <div className="grid min-h-[330px] grid-cols-[1fr_155px] gap-3">
                <div className="neu-inset p-5 font-mono-app text-xs leading-7 text-[var(--text)]">
                  <span className="text-[var(--brand)]">const</span> session = <span className="text-[var(--brown)]">createRoom</span>({'{'}<br />
                  &nbsp;&nbsp;team: <span className="text-[var(--muted)]">'distributed'</span>,<br />
                  &nbsp;&nbsp;flow: <span className="text-[var(--muted)]">'in-sync'</span>,<br />
                  &nbsp;&nbsp;mode: <span className="text-[var(--muted)]">'focused'</span><br />
                  {'}'});<br /><br />
                  <span className="text-[var(--muted)]">// ship better, together</span><br />
                  <span className="text-[var(--brand)]">await</span> session.<span className="text-[var(--brown)]">collaborate</span>();
                </div>
                <div className="neu-flat space-y-3 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">In this room</div>
                  {["Ava", "Mateo", "You"].map((name, i) => (
                    <div key={name} className="flex items-center gap-2">
                      <span className={`grid h-7 w-7 place-items-center rounded-full text-[10px] font-bold ${i === 2 ? 'bg-[var(--panel-3)] text-[var(--text)]' : 'bg-[var(--brand)] text-[var(--brand-ink)]'}`}>{name[0]}</span>
                      <span className="text-xs text-[var(--text)]">{name}</span>
                    </div>
                  ))}
                  <div className="neu-inset mt-6 p-2 text-[10px] leading-4 text-[var(--brand)]">Mateo updated the API handler</div>
                </div>
              </div>
            </div>
            <div className="neu-float absolute -bottom-5 -left-4 flex items-center gap-3 p-3 sm:-left-7">
              <span className="neu-icon-btn h-9 w-9 !text-[var(--brand)] !shadow-none"><MousePointer2 size={17} /></span>
              <div>
                <p className="text-xs font-bold text-[var(--text-strong)]">Your cursor is live</p>
                <p className="text-[11px] text-[var(--muted)]">Move as one team</p>
              </div>
            </div>
          </motion.div>
        </section>

        <section className="neu-flat grid gap-4 px-3 py-5 sm:grid-cols-3">
          {[['One workspace', 'Code, chat, whiteboard, and output'], ['Instant collaboration', 'Invite teammates with one link'], ['Built for momentum', 'A focused interface for getting things done']].map(([title, detail]) => (
            <div key={title} className="flex items-center gap-3 px-3 py-2">
              <span className="h-8 w-1 rounded-full bg-[var(--brand)]" />
              <div>
                <p className="text-sm font-extrabold text-[var(--text-strong)]">{title}</p>
                <p className="text-xs text-[var(--muted)]">{detail}</p>
              </div>
            </div>
          ))}
        </section>

        <section id="how-it-works" className="py-24">
          <div className="max-w-2xl">
            <p className="text-xs font-bold tracking-[.18em] text-[var(--brand)]">SIMPLE BY DESIGN</p>
            <h2 className="mt-4 text-3xl font-extrabold tracking-[-.03em] text-[var(--text-strong)] sm:text-5xl">From idea to shared momentum in three steps.</h2>
            <p className="mt-5 text-base leading-7 text-[var(--muted)]">A deliberate workflow that gets your team collaborating quickly—and keeps the focus on the work.</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {steps.map(({ icon: Icon, number, title, description }) => (
              <div key={number} className="neu-card group relative overflow-hidden p-6">
                <div className="flex items-center justify-between">
                  <span className="neu-flat grid h-11 w-11 place-items-center text-[var(--brand)]"><Icon size={20} /></span>
                  <span className="font-mono-app text-xs text-[var(--muted)]">{number}</span>
                </div>
                <h3 className="mt-8 text-lg font-extrabold text-[var(--text-strong)]">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="grid gap-6 py-20 sm:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <div key={title} className="neu-card p-6">
              <span className="neu-flat mb-5 grid h-10 w-10 place-items-center text-[var(--brand)]"><Icon size={20} /></span>
              <h2 className="text-base font-extrabold text-[var(--text-strong)]">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>
            </div>
          ))}
        </section>

        <section className="neu-raised relative mb-16 overflow-hidden px-6 py-14 text-center sm:px-12">
          <div className="relative">
            <span className="neu-flat mx-auto grid h-11 w-11 place-items-center text-[var(--brand)]"><Zap size={21} /></span>
            <h2 className="mx-auto mt-5 max-w-2xl text-3xl font-extrabold tracking-[-.03em] text-[var(--text-strong)] sm:text-4xl">Ready to make your next session count?</h2>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-[var(--muted)]">Create a room, invite your team, and keep the best ideas moving.</p>
            <Link to="/start" className="neu-btn neu-btn-primary mt-8 inline-flex h-14 rounded-[var(--radius)] px-6 text-sm font-extrabold">
              Start collaborating <ArrowRight size={17} />
            </Link>
          </div>
        </section>

        <footer className="flex flex-col items-center justify-between gap-4 border-t border-[var(--border)] py-7 text-xs text-[var(--muted)] sm:flex-row">
          <div className="flex items-center gap-2"><ShieldCheck size={14} /> Built for teams that care about the craft.</div>
          <div className="flex items-center gap-4">
            <span>Created by <span className="font-semibold text-[var(--brand)]">Vishu Judiyan</span></span>
            <a href="https://github.com/vishujudiyan2005" target="_blank" rel="noopener noreferrer" className="transition-colors duration-200 hover:text-[var(--text)]">GitHub</a>
            <a href="mailto:vishujudiyan2005@gmail.com" className="transition-colors duration-200 hover:text-[var(--text)]">Email</a>
          </div>
        </footer>
      </div>
    </main>
  );
};