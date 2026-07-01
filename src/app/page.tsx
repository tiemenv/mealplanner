import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { CalendarDays, BookOpen, Users, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center gap-2 font-semibold text-lg">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            🍳
          </span>
          Mealmate
        </div>
        <div className="flex items-center gap-2">
          <SignInButton mode="modal">
            <Button variant="ghost">Sign in</Button>
          </SignInButton>
          <SignUpButton mode="modal">
            <Button>Get started</Button>
          </SignUpButton>
        </div>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center text-center px-6 py-20">
        <div className="max-w-2xl space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4" /> Smart weekly meal planning
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-balance">
            Build your meal library. Generate a balanced week in one click.
          </h1>
          <p className="text-lg text-muted-foreground text-balance">
            Save your favourite meals, tag them by diet, meal type and cuisine,
            then auto-generate a varied weekly plan with the veg / non-veg mix
            you want.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <SignUpButton mode="modal">
              <Button size="lg">Start planning free</Button>
            </SignUpButton>
            <SignInButton mode="modal">
              <Button size="lg" variant="outline">
                Sign in
              </Button>
            </SignInButton>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-16 max-w-3xl w-full">
          <Feature
            icon={<BookOpen className="h-5 w-5" />}
            title="Meal library"
            desc="Tag meals by diet, breakfast/lunch/dinner and cuisine."
          />
          <Feature
            icon={<CalendarDays className="h-5 w-5" />}
            title="Auto planner"
            desc="Fill a varied week and dial in your veg vs non-veg balance."
          />
          <Feature
            icon={<Users className="h-5 w-5" />}
            title="Shared groups"
            desc="Invite housemates to plan from one shared library."
          />
        </div>
      </section>
    </main>
  );
}

function Feature({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-xl border p-5 text-left space-y-2">
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
        {icon}
      </div>
      <h3 className="font-medium">{title}</h3>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
