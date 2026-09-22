"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="mx-auto max-w-lg px-6 py-24 text-center"><h1 className="font-heading text-2xl">This view could not load.</h1><p className="mt-4 text-sm leading-7 text-slate-600">Your saved visits remain in your workspace. Try loading the view again.</p><Button className="mt-6" onClick={reset}>Try again</Button></main>;
}
