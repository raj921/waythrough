"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import {
  Accessibility,
  ArrowUpRight,
  Check,
  ChevronRight,
  Clock3,
  DoorOpen,
  FileCheck2,
  HelpCircle,
  Landmark,
  Loader2,
  LockKeyhole,
  Mail,
  MapPin,
  Plus,
  Printer,
  RefreshCcw,
  Route,
  Search,
  Settings2,
  ShieldCheck,
  TriangleAlert,
  Users,
  X,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { overallStatus, type PlanStep } from "@/lib/plan-model";
import { cn } from "@/lib/utils";

type Journey = Doc<"journeys">;
type Status = PlanStep["status"];
const statusLabels: Record<Status, string> = {
  supported: "Supported",
  arrangement_needed: "Arrangement needed",
  blocked: "Blocked",
  unknown: "Needs evidence",
};
const colors: Record<Status, string> = {
  supported: "border-emerald-200 bg-emerald-50 text-emerald-900",
  arrangement_needed: "border-amber-200 bg-amber-50 text-amber-950",
  blocked: "border-rose-200 bg-rose-50 text-rose-900",
  unknown: "border-slate-200 bg-slate-100 text-slate-700",
};
const icons = {
  arrival: MapPin,
  entrance: DoorOpen,
  route: Route,
  destination: Landmark,
  facility: Accessibility,
};
const date = (value: string | number) =>
  new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
const panel =
  "rounded-xl border border-[#d9d8d2] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]";
function message(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "data" in error &&
    typeof error.data === "string"
  )
    return error.data;
  return error instanceof Error
    ? error.message.replace(/\[CONVEX[^\]]*\]\s*/g, "").slice(0, 300)
    : "Something went wrong. Please try again.";
}
function StatusBadge({ value }: { value: Status }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs",
        colors[value],
      )}
    >
      {value === "supported" ? (
        <ShieldCheck className="size-3.5" />
      ) : (
        <TriangleAlert className="size-3.5" />
      )}
      {statusLabels[value]}
    </Badge>
  );
}
function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-8 place-items-center rounded-lg bg-[#d6a149] text-[#111315]">
        <Route className="size-4" />
      </span>
      <span className="font-heading text-base font-semibold tracking-tight">
        WayThrough
      </span>
    </div>
  );
}

export default function Home() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signIn } = useAuthActions();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [shareToken, setShareToken] = useState("");
  useEffect(() => {
    const read = () =>
      setShareToken(
        new URLSearchParams(window.location.hash.slice(1)).get("share") ?? "",
      );
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  if (shareToken) return <SharedPlan token={shareToken} />;
  if (isAuthenticated) return <Workspace />;
  return (
    <div className="min-h-screen bg-[#f5f4ef]">
      <header className="bg-[#111315] px-6 py-5 text-white">
        <Brand />
      </header>
      <main className="mx-auto grid max-w-6xl gap-12 px-6 py-16 lg:grid-cols-[1.1fr_1fr] lg:py-28">
        <section>
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-amber-800">
            A plan you can question
          </p>
          <h1 className="font-heading text-4xl font-semibold leading-[1.16] tracking-[-0.05em] sm:text-5xl">
            Know what needs
            <br />
            to happen before
            <br />
            <span className="text-[#a16207]">you get there.</span>
          </h1>
          <p className="mt-6 max-w-md text-lg leading-8 text-slate-600">
            Turn venue information into a visit plan. Find the missing
            arrangements, ask the venue, and keep every promise connected to the
            route it makes possible.
          </p>
          <Button
            size="lg"
            className="pressable mt-8"
            disabled={isLoading || starting}
            onClick={async () => {
              setStarting(true);
              setError("");
              try {
                await signIn("anonymous");
              } catch (e) {
                setError(message(e));
              } finally {
                setStarting(false);
              }
            }}
          >
            {starting || isLoading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <ArrowUpRight />
            )}
            {starting ? "Opening your workspace…" : "Start a private session"}
          </Button>
          <p className="mt-3 max-w-md text-xs leading-5 text-slate-500">
            <LockKeyhole className="mr-1 inline size-3" />
            No email required. Your visits belong to this browser session. Keep
            this browser data to return to them.
          </p>
          {error && (
            <p role="alert" className="mt-4 text-sm text-rose-800">
              {error}
            </p>
          )}
        </section>
        <section
          className={cn(panel, "self-center overflow-hidden")}
          aria-label="How a visit becomes possible"
        >
          <div className="border-b bg-[#fcfbf8] p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              From evidence to arrangement
            </p>
            <h2 className="mt-2 font-heading text-xl">
              A door exists. Will it be open?
            </h2>
          </div>
          {[
            [
              "01",
              "Read the source",
              "See the exact passage behind each access condition.",
              FileCheck2,
            ],
            [
              "02",
              "Ask the missing question",
              "Review the recipient and message before sending.",
              Mail,
            ],
            [
              "03",
              "Keep the plan honest",
              "A conditional or withdrawn promise changes the route.",
              Route,
            ],
          ].map(([n, title, body, Icon]) => {
            const I = Icon as typeof Route;
            return (
              <div
                key={String(n)}
                className="flex gap-4 border-b p-5 last:border-0"
              >
                <span className="text-xs text-slate-400">{String(n)}</span>
                <I className="mt-1 size-5 shrink-0 text-amber-800" />
                <div>
                  <h3 className="font-semibold">{String(title)}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {String(body)}
                  </p>
                </div>
              </div>
            );
          })}
        </section>
      </main>
    </div>
  );
}

function Workspace() {
  const { signOut } = useAuthActions();
  const visits = useQuery(api.journeys.list) ?? [];
  const providers = useQuery(api.journeys.providers);
  const createExample = useMutation(api.journeys.example);
  const create = useMutation(api.journeys.create);
  const research = useMutation(api.journeys.startResearch);
  const scenario = useMutation(api.journeys.scenario);
  const share = useMutation(api.journeys.share);
  const flagStep = useMutation(api.journeys.flagStep);
  const [selectedId, setSelectedId] = useState<Id<"journeys"> | null>(null);
  const id = selectedId ?? visits[0]?._id;
  const data = useQuery(api.journeys.detail, id ? { id } : "skip");
  const j = data?.journey;
  const [selectedStep, setSelectedStep] = useState("entrance");
  const [tab, setTab] = useState("overview");
  const [filter, setFilter] = useState("");
  const [nav, setNav] = useState("visits");
  const [dialog, setDialog] = useState<
    "new" | "connections" | "help" | "share" | "source" | null
  >(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const step = j?.steps.find((s) => s.id === selectedStep) ?? j?.steps[0];
  const filtered = visits.filter(
    (v) =>
      v.venue.toLowerCase().includes(filter.toLowerCase()) &&
      (nav !== "awaiting" || ["queued", "sent"].includes(v.requestState)),
  );
  async function run(fn: () => Promise<unknown>, success?: string) {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      await fn();
      if (success) setNotice(success);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  const addExample = () =>
    run(async () => {
      const next = await createExample({});
      setSelectedId(next);
      setTab("overview");
    });
  const readyProviders = Boolean(providers?.firecrawl && providers?.openai);
  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-[#f5f4ef] text-[#18181b]">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-white focus:p-3"
        >
          Skip to main content
        </a>
        <header className="no-print sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-white/10 bg-[#111315] px-4 text-white sm:px-5">
          <Brand />
          <span className="hidden text-xs text-slate-400 sm:inline">
            / Your visits
          </span>
          <div className="relative ml-auto hidden max-w-sm flex-1 md:block">
            <Search className="absolute left-3 top-3 size-4 text-slate-400" />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              aria-label="Find a visit"
              placeholder="Find a visit…"
              className="border-white/15 bg-white/5 pl-9 text-white placeholder:text-slate-400"
            />
          </div>
          <Button
            className="pressable ml-auto bg-[#d6a149] text-[#111315] hover:bg-[#e1b362] md:ml-0"
            onClick={() => setDialog("new")}
          >
            <Plus />
            <span className="hidden sm:inline">New visit</span>
            <span className="sr-only sm:hidden">New visit</span>
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Help"
            onClick={() => setDialog("help")}
            className="text-slate-300 hover:bg-white/10 hover:text-white"
          >
            <HelpCircle />
          </Button>
        </header>
        <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-[1800px] lg:grid-cols-[232px_minmax(0,1fr)]">
          <aside className="no-print hidden flex-col bg-[#111315] px-3 py-6 text-slate-300 lg:flex">
            <p className="px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Your workspace
            </p>
            <nav className="mt-3 space-y-1" aria-label="Visit navigation">
              {[
                ["visits", "Your visits", MapPin],
                ["awaiting", "Awaiting venues", Clock3],
              ].map(([key, label, Icon]) => {
                const I = Icon as typeof Route;
                return (
                  <button
                    key={String(key)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition-colors",
                      nav === key
                        ? "bg-[#33240d] text-amber-100"
                        : "hover:bg-white/5",
                    )}
                    onClick={() => setNav(String(key))}
                    aria-current={nav === key ? "page" : undefined}
                  >
                    <I className="size-4" />
                    {String(label)}
                    <span className="ml-auto text-xs text-slate-400">
                      {key === "visits"
                        ? visits.length
                        : visits.filter((v) =>
                            ["queued", "sent"].includes(v.requestState),
                          ).length}
                    </span>
                  </button>
                );
              })}
              <button
                onClick={() => setDialog("connections")}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm hover:bg-white/5"
              >
                <Settings2 className="size-4" />
                Connections
                <span
                  className={cn(
                    "ml-auto size-1.5 rounded-full",
                    readyProviders && providers?.agentmail && providers?.webhook
                      ? "bg-emerald-400"
                      : "bg-amber-400",
                  )}
                />
              </button>
            </nav>
            <p className="mb-3 mt-8 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Recent visits
            </p>
            <div className="space-y-1">
              {filtered.map((v) => (
                <button
                  onClick={() => {
                    setSelectedId(v._id);
                    setTab("overview");
                  }}
                  key={v._id}
                  className={cn(
                    "w-full rounded-lg px-3 py-2.5 text-left hover:bg-white/5",
                    id === v._id && "bg-white/[0.07]",
                  )}
                >
                  <span className="block truncate text-sm text-stone-100">
                    {v.venue}
                  </span>
                  <span className="mt-1 block text-xs text-slate-400">
                    {v.mode === "example"
                      ? "Interactive example"
                      : date(v.visitAt)}
                  </span>
                </button>
              ))}
              {!filtered.length && (
                <p className="px-3 text-xs text-slate-400">
                  No matching visits.
                </p>
              )}
            </div>
            <div className="mt-auto pt-8">
              <div className="rounded-xl border border-white/10 p-3">
                <LockKeyhole className="size-4 text-[#d6a149]" />
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  Private to this browser. Share a route only when you choose.
                </p>
                <button
                  onClick={() => run(() => signOut())}
                  className="mt-3 text-xs text-amber-200 hover:underline"
                >
                  End session
                </button>
              </div>
            </div>
          </aside>
          <main id="main-content" className="min-w-0">
            <div className="no-print flex gap-2 border-b bg-white p-3 lg:hidden">
              <select
                aria-label="Choose visit"
                className="min-w-0 flex-1 rounded-md border bg-white p-2 text-sm"
                value={id ?? ""}
                onChange={(e) =>
                  setSelectedId(e.target.value as Id<"journeys">)
                }
              >
                <option value="" disabled>
                  Your visits
                </option>
                {visits.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.venue}
                  </option>
                ))}
              </select>
              <Button
                variant="outline"
                size="icon"
                aria-label="Connections"
                onClick={() => setDialog("connections")}
              >
                <Settings2 />
              </Button>
              <Button variant="ghost" onClick={() => run(() => signOut())}>
                End session
              </Button>
            </div>
            {(error || notice) && (
              <div
                role={error ? "alert" : "status"}
                className={cn(
                  "no-print flex items-center justify-between gap-3 border-b px-6 py-3 text-sm",
                  error
                    ? "bg-rose-50 text-rose-900"
                    : "bg-emerald-50 text-emerald-900",
                )}
              >
                <span>{error || notice}</span>
                <button
                  aria-label="Dismiss notice"
                  onClick={() => {
                    setError("");
                    setNotice("");
                  }}
                >
                  <X className="size-4" />
                </button>
              </div>
            )}
            {!j ? (
              <section className="mx-auto max-w-3xl px-6 py-16">
                <p className="text-xs font-bold uppercase tracking-widest text-amber-800">
                  Your first visit
                </p>
                <h1 className="mt-3 font-heading text-3xl tracking-tight">
                  Make the unknowns visible.
                </h1>
                <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
                  Add the venue page, choose a time, and describe the access you
                  need. WayThrough will show what is documented and what needs a
                  human arrangement.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Button onClick={() => setDialog("new")}>
                    <Plus />
                    Plan a visit
                  </Button>
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={addExample}
                  >
                    {busy ? <Loader2 className="animate-spin" /> : <Route />}
                    Explore the example
                  </Button>
                </div>
                <div className={cn(panel, "mt-10 p-6")}>
                  <p className="font-semibold">Try the part that matters.</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    In the example, a staffed door is the missing link. Confirm
                    the arrangement, then withdraw it. Only the affected part of
                    the plan changes. The example uses fictional evidence and
                    sends no email.
                  </p>
                </div>
              </section>
            ) : (
              <Tabs value={tab} onValueChange={setTab}>
                <div className="border-b bg-white px-5 pt-5 sm:px-8">
                  <p className="flex items-center gap-2 text-xs text-slate-500">
                    Your visits <ChevronRight className="size-3" />
                    {j.mode === "example"
                      ? "Interactive example"
                      : "Visit plan"}
                  </p>
                  <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-[28px]">
                        {j.venue}
                      </h1>
                      <p className="mt-1 text-sm text-slate-600">
                        {date(j.visitAt)}{" "}
                        <span className="text-slate-400">
                          · Your local time
                        </span>
                      </p>
                    </div>
                    <div className="no-print flex flex-wrap gap-2">
                      <StatusBadge
                        value={
                          j.steps.length ? overallStatus(j.steps) : "unknown"
                        }
                      />
                      <Button
                        variant="outline"
                        onClick={() => setDialog("share")}
                      >
                        <Users />
                        Share route
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label="Print visit brief"
                        onClick={() => window.print()}
                      >
                        <Printer />
                      </Button>
                    </div>
                  </div>
                  <TabsList className="no-print mt-6 h-11 w-full justify-start overflow-x-auto rounded-none bg-transparent p-0">
                    {[
                      ["overview", "Overview"],
                      ["evidence", "Evidence"],
                      ["request", "Venue request"],
                      ["history", "Activity"],
                    ].map(([key, label]) => (
                      <TabsTrigger
                        key={key}
                        value={key}
                        className="h-full rounded-none border-b-2 border-transparent bg-transparent px-3 text-sm data-[state=active]:border-amber-700 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                      >
                        {label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>
                <div className="grid xl:grid-cols-[minmax(0,1fr)_340px]">
                  <section className="min-w-0 px-5 py-6 sm:px-8">
                    <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-2">
                        <span
                          className={cn(
                            "size-1.5 rounded-full",
                            j.phase === "researching"
                              ? "animate-pulse bg-amber-500"
                              : "bg-slate-400",
                          )}
                        />
                        {j.phase === "researching"
                          ? "Retrieving and checking source evidence…"
                          : j.lastChecked
                            ? `Captured ${date(j.lastChecked)}`
                            : "No source captured yet"}
                      </span>
                      {j.mode === "live" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busy || j.phase === "researching"}
                          onClick={() => run(() => research({ id: j._id }))}
                        >
                          <RefreshCcw
                            className={
                              j.phase === "researching" ? "animate-spin" : ""
                            }
                          />
                          {j.lastChecked ? "Recheck source" : "Research venue"}
                        </Button>
                      )}
                    </div>
                    {j.error && (
                      <p
                        role="alert"
                        className="mb-5 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-900"
                      >
                        {j.error}
                      </p>
                    )}
                    {j.mode === "example" && (
                      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
                        <span>
                          <strong>Example workspace.</strong> Fictional venue
                          and evidence. No email is sent.
                        </span>
                        <button
                          onClick={() => setDialog("new")}
                          className="font-semibold underline"
                        >
                          Create a real visit
                        </button>
                      </div>
                    )}
                    <TabsContent value="overview" className="mt-0">
                      <h2 className="font-heading text-xl font-semibold tracking-tight">
                        Access route
                      </h2>
                      <p className="mb-5 mt-1 text-sm leading-6 text-slate-600">
                        {j.summary}
                      </p>
                      {j.steps.length === 0 ? (
                        <div className={cn(panel, "p-8 text-center")}>
                          <FileCheck2 className="mx-auto size-8 text-amber-800" />
                          <h3 className="mt-3 font-semibold">
                            Start with the venue&apos;s own words.
                          </h3>
                          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                            Research will retrieve your source page, extract
                            access conditions, and keep missing facts
                            unresolved.
                          </p>
                          <Button
                            disabled={busy || j.phase === "researching"}
                            className="mt-5"
                            onClick={() => run(() => research({ id: j._id }))}
                          >
                            {j.phase === "researching" ? (
                              <Loader2 className="animate-spin" />
                            ) : (
                              <Search />
                            )}
                            Research venue
                          </Button>
                        </div>
                      ) : (
                        <ol className="space-y-3" aria-label="Access route">
                          {j.steps.map((s, i) => {
                            const Icon = icons[s.id];
                            return (
                              <li key={s.id}>
                                <button
                                  type="button"
                                  onClick={() => setSelectedStep(s.id)}
                                  aria-pressed={step?.id === s.id}
                                  className={cn(
                                    panel,
                                    "pressable flex w-full items-start gap-3 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 sm:items-center",
                                    step?.id === s.id &&
                                      "border-amber-500 bg-amber-50/50",
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold",
                                      step?.id === s.id
                                        ? "bg-amber-800 text-white"
                                        : "bg-stone-100 text-slate-500",
                                    )}
                                  >
                                    {i + 1}
                                  </span>
                                  <Icon className="mt-1 size-5 shrink-0 text-slate-500 sm:mt-0" />
                                  <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-semibold">
                                      {s.label}
                                    </span>
                                    <span className="mt-1 block text-xs leading-5 text-slate-600">
                                      {s.place || s.detail}
                                    </span>
                                    <span className="mt-2 inline-flex sm:hidden">
                                      <StatusBadge value={s.status} />
                                    </span>
                                  </span>
                                  <span className="hidden sm:block">
                                    <StatusBadge value={s.status} />
                                  </span>
                                  <ChevronRight className="mt-1 size-4 shrink-0 text-slate-400" />
                                </button>
                              </li>
                            );
                          })}
                        </ol>
                      )}
                      {j.mode === "example" && (
                        <div className="no-print mt-6 rounded-xl bg-[#111315] p-5 text-white">
                          <div className="flex items-center gap-2">
                            <Route className="size-4 text-amber-300" />
                            <h3 className="text-sm font-semibold">
                              What happens when the promise changes?
                            </h3>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-400">
                            These controlled events exercise the real status
                            rules and sync through Convex. Open a shared route
                            to see both views update.
                          </p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {[
                              ["confirmed", "Confirm staffing"],
                              ["conditional", "Make it conditional"],
                              ["withdrawn", "Withdraw staffing"],
                              ["stale", "Mark evidence stale"],
                            ].map(([value, label]) => (
                              <Button
                                key={value}
                                disabled={busy}
                                size="sm"
                                variant="outline"
                                className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                                onClick={() =>
                                  run(() =>
                                    scenario({
                                      id: j._id,
                                      scenario: value as
                                        | "confirmed"
                                        | "conditional"
                                        | "withdrawn"
                                        | "stale",
                                    }),
                                  )
                                }
                              >
                                {label}
                              </Button>
                            ))}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-amber-200 hover:bg-white/10 hover:text-amber-100"
                              disabled={busy}
                              onClick={addExample}
                            >
                              Fresh example
                            </Button>
                          </div>
                        </div>
                      )}
                      <div className={cn(panel, "mt-6 p-4")}>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                          Your requirements
                        </h3>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                          {j.needs}
                        </p>
                      </div>
                    </TabsContent>
                    <TabsContent value="evidence" className="mt-0">
                      <h2 className="font-heading text-xl">Evidence ledger</h2>
                      <p className="mt-1 text-sm text-slate-600">
                        The source text, capture time, and interpretation stay
                        separate.
                      </p>
                      <div className="mt-5 space-y-4">
                        {data?.observations.map((o, i) => (
                          <article key={o._id} className={cn(panel, "p-5")}>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <Badge variant="secondary">
                                {i === 0 ? "Latest capture" : "Earlier capture"}
                              </Badge>
                              <span className="text-xs text-slate-500">
                                {date(o.capturedAt)}
                              </span>
                            </div>
                            <h3 className="mt-4 break-all text-sm font-semibold">
                              {o.source}
                            </h3>
                            <p className="mt-1 text-xs text-slate-500">
                              {o.provider} · fingerprint {o.hash.slice(0, 12)}
                            </p>
                            <details className="mt-4">
                              <summary className="cursor-pointer text-sm font-semibold text-amber-900">
                                Read captured source
                              </summary>
                              <pre className="mt-3 max-h-96 overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-stone-50 p-3 font-sans text-xs leading-6">
                                {o.text}
                              </pre>
                            </details>
                            {j.mode === "live" && (
                              <a
                                href={o.source}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-amber-900"
                              >
                                Open original page{" "}
                                <ArrowUpRight className="size-3" />
                              </a>
                            )}
                          </article>
                        ))}
                        {!data?.observations.length && (
                          <p className="rounded-lg border bg-white p-5 text-sm text-slate-500">
                            No source has been captured. Research the venue to
                            populate this ledger.
                          </p>
                        )}
                      </div>
                    </TabsContent>
                    <TabsContent value="request" className="mt-0">
                      <RequestEditor
                        error={error}
                        key={j._id + j.revision}
                        journey={j}
                        delivery={data?.delivery ?? null}
                        run={run}
                        busy={busy}
                      />
                    </TabsContent>
                    <TabsContent value="history" className="mt-0">
                      <h2 className="font-heading text-xl">
                        Why the plan changed
                      </h2>
                      <p className="mt-1 text-sm text-slate-600">
                        Every source check, reply, and withdrawal has a trace.
                      </p>
                      <ol className="mt-5 space-y-4">
                        {data?.events.map((e) => (
                          <li key={e._id} className={cn(panel, "p-5")}>
                            <div className="flex flex-wrap justify-between gap-2">
                              <h3 className="text-sm font-semibold">
                                {e.label}
                              </h3>
                              <time className="text-xs text-slate-500">
                                {date(e.at)}
                              </time>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                              {e.detail}
                            </p>
                            <p className="mt-2 text-xs text-amber-900">
                              {e.provider}
                            </p>
                            {e.raw && (
                              <details className="mt-3 text-sm">
                                <summary className="cursor-pointer font-semibold">
                                  Inspect original reply
                                </summary>
                                <blockquote className="mt-2 whitespace-pre-wrap border-l-2 border-amber-500 pl-3 text-slate-600">
                                  {e.raw}
                                </blockquote>
                              </details>
                            )}
                          </li>
                        ))}
                        {!data?.events.length && (
                          <li className="text-sm text-slate-500">
                            The activity trail starts with your first source
                            check or example event.
                          </li>
                        )}
                      </ol>
                    </TabsContent>
                  </section>
                  <aside
                    className="border-t bg-[#fcfbf8] px-5 py-6 xl:border-l xl:border-t-0 xl:px-6"
                    aria-label="Selected step context"
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div
                        key={step?.id ?? "empty"}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.18 }}
                      >
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                          Selected step
                        </p>
                        <h2 className="mt-2 font-heading text-xl">
                          {step?.label ?? "Waiting for evidence"}
                        </h2>
                        {step ? (
                          <>
                            <div className="mt-4">
                              <StatusBadge value={step.status} />
                            </div>
                            <div className={cn(panel, "mt-5 p-4")}>
                              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                What the source supports
                              </h3>
                              <p className="mt-2 text-sm leading-6">
                                {step.detail}
                              </p>
                              {step.quote ? (
                                <blockquote className="mt-3 border-l-2 border-amber-500 pl-3 text-xs leading-6 text-slate-600">
                                  “{step.quote}”
                                </blockquote>
                              ) : (
                                <p className="mt-3 text-xs text-slate-500">
                                  No supporting quote. This remains unknown.
                                </p>
                              )}
                              <button
                                onClick={() => setDialog("source")}
                                className="no-print mt-3 text-xs font-semibold text-amber-900 underline-offset-4 hover:underline"
                              >
                                Inspect evidence
                              </button>
                              <button
                                disabled={busy}
                                onClick={() =>
                                  run(
                                    () =>
                                      flagStep({ id: j._id, stepId: step.id }),
                                    "Step marked for review.",
                                  )
                                }
                                className="no-print mt-3 block text-xs text-slate-600 underline underline-offset-4"
                              >
                                Mark as needing review
                              </button>
                            </div>
                            <div className={cn(panel, "mt-3 p-4")}>
                              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                Condition
                              </h3>
                              <p className="mt-2 text-sm leading-6">
                                {step.condition ||
                                  "No additional arrangement is recorded for this step."}
                              </p>
                            </div>
                            <div
                              className={cn(
                                "mt-3 rounded-xl border p-4",
                                colors[step.status],
                              )}
                            >
                              <h3 className="text-[10px] font-bold uppercase tracking-widest">
                                Next action
                              </h3>
                              <p className="mt-2 text-sm leading-6">
                                {step.status === "supported"
                                  ? "Keep the source and date with your brief. Recheck before the visit."
                                  : step.status === "blocked"
                                    ? "Ask for a documented alternative. Keep this path blocked until the evidence changes."
                                    : "Ask the venue to resolve this specific condition."}
                              </p>
                              <Button
                                className="no-print mt-3"
                                size="sm"
                                onClick={() => setTab("request")}
                              >
                                <Mail />
                                Review venue request
                              </Button>
                            </div>
                          </>
                        ) : (
                          <p className="mt-3 text-sm leading-6 text-slate-500">
                            Your plan will keep facts, missing information, and
                            dated arrangements visible here.
                          </p>
                        )}
                        <p className="mt-6 text-xs leading-5 text-slate-500">
                          A documented condition is not a guarantee of physical
                          access. Confirm what matters for your visit.
                        </p>
                      </motion.div>
                    </AnimatePresence>
                  </aside>
                </div>
              </Tabs>
            )}
          </main>
        </div>
        <Modal
          error={error}
          open={dialog === "new"}
          onClose={() => setDialog(null)}
          title="Plan a visit"
          description="Start with an official venue page and your practical requirements."
        >
          <NewVisit
            busy={busy}
            onCreate={(values) =>
              run(async () => {
                const next = await create(values);
                setSelectedId(next);
                setTab("overview");
                setDialog(null);
                if (readyProviders) await research({ id: next });
              }, "Visit saved.")
            }
          />
          {!readyProviders && (
            <p className="mt-3 text-xs leading-5 text-amber-900">
              Live research will be available when Firecrawl and OpenAI are
              connected. Your visit can be saved now.
            </p>
          )}
        </Modal>
        <Modal
          error={error}
          open={dialog === "connections"}
          onClose={() => setDialog(null)}
          title="Connections"
          description="Configuration status. A configured key is not proof of a completed provider call."
        >
          <div className="space-y-3">
            {[
              ["Convex", "Private sessions and live state", true],
              [
                "Firecrawl",
                "Retrieve original venue pages",
                providers?.firecrawl,
              ],
              ["OpenAI", "Interpret evidence and replies", providers?.openai],
              ["AgentMail", "Send approved requests", providers?.agentmail],
              [
                "Signed webhook",
                "Receive and verify venue replies",
                providers?.webhook,
              ],
            ].map(([name, detail, ok]) => (
              <div
                key={String(name)}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="text-sm font-semibold">{String(name)}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {String(detail)}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={ok ? "text-emerald-800" : "text-amber-900"}
                >
                  {ok ? "Configured" : "Not connected"}
                </Badge>
              </div>
            ))}
          </div>
        </Modal>
        <Modal
          error={error}
          open={dialog === "help"}
          onClose={() => setDialog(null)}
          title="A plan you can inspect"
          description="WayThrough keeps source evidence and human arrangements separate."
        >
          <div className="space-y-4 text-sm leading-7 text-slate-600">
            <p>
              Start with a venue page, a date, and the access you need. Unknown
              details stay unknown. Review the exact recipient and text before
              sending a request.
            </p>
            <p>
              Only a reply from the requested recipient in the matching
              conversation can update the arrangement. Conditional replies stay
              conditional; withdrawn promises reopen their route steps.
            </p>
            <p>
              Guest sessions belong to this browser. Shared links expose the
              route, not your private requirements or email thread. You can
              revoke a link at any time.
            </p>
            <p>
              The interactive example is fictional. Use it to inspect
              confirmation, withdrawal, and stale-source behavior.
            </p>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => {
                setDialog(null);
                void addExample();
              }}
            >
              Open interactive example
            </Button>
          </div>
        </Modal>
        <Modal
          error={error}
          open={dialog === "source"}
          onClose={() => setDialog(null)}
          title="Evidence behind this step"
          description="Compare the exact source wording with the plan's interpretation."
        >
          <p className="text-sm leading-6">{step?.detail}</p>
          <blockquote className="mt-4 rounded-lg border bg-stone-50 p-4 text-sm leading-7">
            {step?.quote || "No supporting quote was found."}
          </blockquote>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              setDialog(null);
              setTab("evidence");
            }}
          >
            Open evidence ledger
          </Button>
        </Modal>
        <Modal
          error={error}
          open={dialog === "share"}
          onClose={() => setDialog(null)}
          title="Share this route"
          description="Anyone with the link can see the venue, time, route details, and status. Private requirements and email bodies are excluded."
        >
          {j && (
            <div className="space-y-4">
              {j.shareToken ? (
                <>
                  <Input
                    readOnly
                    aria-label="Shared route link"
                    value={
                      typeof window !== "undefined"
                        ? window.location.origin + "/#share=" + j.shareToken
                        : ""
                    }
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() =>
                        run(
                          () =>
                            navigator.clipboard.writeText(
                              window.location.origin +
                                "/#share=" +
                                j.shareToken,
                            ),
                          "Link copied.",
                        )
                      }
                    >
                      Copy link
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        run(
                          () => share({ id: j._id, enabled: false }),
                          "Shared link revoked.",
                        )
                      }
                    >
                      Revoke link
                    </Button>
                  </div>
                </>
              ) : (
                <Button
                  onClick={() =>
                    run(
                      () => share({ id: j._id, enabled: true }),
                      "A read-only link is ready.",
                    )
                  }
                >
                  Create read-only link
                </Button>
              )}
            </div>
          )}
        </Modal>
      </div>
    </MotionConfig>
  );
}

function Modal({
  open,
  onClose,
  title,
  description,
  children,
  error,
}: {
  error?: string;
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl bg-[#fcfbf8] sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">{title}</DialogTitle>
          <DialogDescription className="pt-2 leading-6">
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2">
          {error && (
            <p
              role="alert"
              className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-900"
            >
              {error}
            </p>
          )}
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
function NewVisit({
  busy,
  onCreate,
}: {
  busy: boolean;
  onCreate: (v: {
    venue: string;
    url: string;
    visitAt: string;
    needs: string;
  }) => void;
}) {
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        onCreate({
          venue: String(form.get("venue")),
          url: String(form.get("url")),
          visitAt: new Date(String(form.get("visitAt"))).toISOString(),
          needs: String(form.get("needs")),
        });
      }}
    >
      <Field label="Venue name" id="venue">
        <Input
          id="venue"
          name="venue"
          required
          maxLength={160}
          placeholder="e.g. Reading Museum"
        />
      </Field>
      <Field label="Official venue or accessibility page" id="url">
        <Input
          id="url"
          name="url"
          type="url"
          required
          placeholder="https://…"
        />
      </Field>
      <Field label="Visit date and time (your local time)" id="visitAt">
        <Input id="visitAt" name="visitAt" type="datetime-local" required />
      </Field>
      <Field label="What access do you need?" id="needs">
        <Textarea
          id="needs"
          name="needs"
          required
          minLength={5}
          maxLength={2000}
          rows={4}
          placeholder="A step-free route to the exhibition and an accessible toilet."
        />
      </Field>
      <p className="text-xs leading-5 text-slate-500">
        Describe practical needs. Include another person&apos;s details only
        with their permission. Research sends these requirements to OpenAI and
        the page URL to Firecrawl.
      </p>
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? <Loader2 className="animate-spin" /> : <Plus />}Create visit
      </Button>
    </form>
  );
}
function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
function RequestEditor({
  journey: j,
  delivery,
  run,
  busy,
  error,
}: {
  error: string;
  journey: Journey;
  delivery: { status: string; errorMessage: string | null } | null;
  run: (fn: () => Promise<unknown>, success?: string) => Promise<void>;
  busy: boolean;
}) {
  const save = useMutation(api.journeys.saveDraft);
  const send = useMutation(api.journeys.approveAndSend);
  const reopen = useMutation(api.journeys.reopenUnsentDraft);
  const [recipient, setRecipient] = useState(j.recipient);
  const [subject, setSubject] = useState(j.subject);
  const [request, setRequest] = useState(j.request);
  const [review, setReview] = useState(false);
  const locked = j.requestState !== "draft";
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading text-xl">One focused request</h2>
        <p className="mt-1 text-sm text-slate-600">
          Ask for the arrangement your current evidence cannot establish.
        </p>
      </div>
      <div className={cn(panel, "space-y-4 p-5")}>
        <Badge variant="outline">
          {delivery?.status ??
            (j.requestState === "draft" ? "Draft · not sent" : j.requestState)}
        </Badge>
        <Field label="Recipient" id="recipient">
          <Input
            id="recipient"
            type="email"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            readOnly={locked}
            placeholder="The venue's confirmed contact address"
          />
        </Field>
        <Field label="Subject" id="subject">
          <Input
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={180}
            readOnly={locked}
          />
        </Field>
        <Field label="Message" id="request">
          <Textarea
            id="request"
            rows={7}
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            maxLength={3000}
            readOnly={locked}
          />
        </Field>
        {delivery?.errorMessage && (
          <p role="alert" className="text-sm text-rose-800">
            The provider reported a delivery problem. The request is not
            confirmed delivered.
          </p>
        )}
        <p className="text-xs leading-5 text-slate-500">
          {j.mode === "example"
            ? "Example only. These controls do not send email."
            : "Verify the recipient against the venue's official site. Only the text above will be sent after your approval."}
        </p>
        {!locked && (
          <Button
            disabled={busy || j.mode === "example" || !j.subject}
            onClick={() =>
              run(async () => {
                await save({ id: j._id, recipient, subject, request });
                setReview(true);
              })
            }
          >
            <Mail />
            Save and review request
          </Button>
        )}
        {j.requestState === "failed" && !j.outboundId && (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() =>
              run(
                () => reopen({ id: j._id }),
                "Unsent request reopened for review.",
              )
            }
          >
            Reopen unsent draft
          </Button>
        )}
        {locked && (
          <p className="text-xs leading-5 text-slate-600">
            Replies update this visit automatically through its dedicated inbox.
            Check Activity to inspect the original message and interpretation.
          </p>
        )}
      </div>
      <Modal
        error={error}
        open={review}
        onClose={() => setReview(false)}
        title="Approve and send"
        description="This action sends an actual email through AgentMail. Review the recipient and full text."
      >
        <p className="break-all text-xs text-slate-500">To: {j.recipient}</p>
        <h3 className="mt-3 font-semibold">{j.subject}</h3>
        <p className="mt-3 whitespace-pre-wrap rounded-lg border bg-white p-4 text-sm leading-7">
          {j.request}
        </p>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          Replies will be processed by OpenAI to extract dated arrangements. No
          automatic follow-up email is sent.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setReview(false)}>
            Back
          </Button>
          <Button
            disabled={busy}
            onClick={() =>
              run(async () => {
                await send({
                  id: j._id,
                  subject: j.subject,
                  request: j.request,
                  recipient: j.recipient,
                });
                setReview(false);
              }, "Approved request queued. Delivery status will update here.")
            }
          >
            <Check />
            Approve and send email
          </Button>
        </div>
      </Modal>
    </div>
  );
}
function SharedPlan({ token }: { token: string }) {
  const plan = useQuery(api.journeys.shared, { token });
  return (
    <div className="min-h-screen bg-[#f5f4ef]">
      <header className="bg-[#111315] px-6 py-5 text-white">
        <Brand />
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10">
        {plan === undefined ? (
          <p>Loading shared route…</p>
        ) : plan === null ? (
          <>
            <h1 className="font-heading text-2xl">
              This link is no longer available.
            </h1>
            <p className="mt-3 text-slate-500">
              The owner may have revoked it.
            </p>
          </>
        ) : (
          <>
            <p className="text-xs font-bold uppercase tracking-widest text-amber-800">
              Shared route · read only{" "}
              {plan.mode === "example" && "· fictional example"}
            </p>
            <h1 className="mt-3 font-heading text-3xl">{plan.venue}</h1>
            <p className="mt-2 text-sm text-slate-500">
              {date(plan.visitAt)} · Updated {date(plan.updatedAt)}
            </p>
            <div className="mt-5">
              <StatusBadge
                value={
                  plan.steps.length ? overallStatus(plan.steps) : "unknown"
                }
              />
            </div>
            <ol className="mt-6 space-y-3">
              {plan.steps.map((s) => (
                <li className={cn(panel, "p-5")} key={s.id}>
                  <div className="flex flex-wrap justify-between gap-3">
                    <h2 className="font-semibold">{s.label}</h2>
                    <StatusBadge value={s.status} />
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{s.detail}</p>
                  {s.condition && (
                    <p className="mt-2 text-sm text-amber-900">{s.condition}</p>
                  )}
                </li>
              ))}
            </ol>
            <Button
              variant="outline"
              className="no-print mt-6"
              onClick={() => window.print()}
            >
              <Printer />
              Print route
            </Button>
          </>
        )}
        <Link
          href="/"
          className="no-print mt-8 block text-sm font-semibold text-amber-900"
        >
          Open WayThrough
        </Link>
      </main>
    </div>
  );
}
