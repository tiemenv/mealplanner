import type { Metadata } from "next";
import Link from "next/link";
import { Mail, Trash2 } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Delete your account — The Weekly Plate",
  description:
    "How to permanently delete your The Weekly Plate account and all associated data, in the app or by email request.",
};

const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "privacy@theweeklyplate.app";

const MAILTO = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
  "Account deletion request — The Weekly Plate"
)}&body=${encodeURIComponent(
  "Please delete my The Weekly Plate account and all associated data.\n\nAccount email: \n"
)}`;

const LAST_UPDATED = "August 7, 2026";

export default function DeleteAccountPage() {
  return (
    <main className="flex flex-1 flex-col">
      <header className="border-b px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold text-lg"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              🍳
            </span>
            The Weekly Plate
          </Link>
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Back to home
          </Link>
        </div>
      </header>

      <article className="mx-auto w-full max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight">
          Delete your The Weekly Plate account
        </h1>
        <p className="mt-3 text-[15px] leading-7 text-foreground/90">
          You can permanently delete your The Weekly Plate account and the data
          attached to it at any time. Deletion is permanent — your account is
          removed rather than deactivated, and we cannot restore it afterwards.
        </p>

        <section className="mt-8 rounded-xl border p-5">
          <h2 className="text-lg font-semibold tracking-tight">
            Request deletion
          </h2>
          <p className="mt-2 text-[15px] leading-7 text-foreground/90">
            Deleting from inside the app is immediate and needs no waiting. If
            you can no longer sign in, email us instead and we will do it for
            you.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/account" size="lg">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete in the app
            </ButtonLink>
            <ButtonLink href={MAILTO} size="lg" variant="outline">
              <Mail className="mr-2 h-4 w-4" />
              Email {SUPPORT_EMAIL}
            </ButtonLink>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            In the app: sign in, open <strong>Account</strong>, choose{" "}
            <strong>Delete my account</strong>, and type{" "}
            <strong>DELETE</strong> to confirm. By email: write from the address
            linked to your account so we can verify it is yours.
          </p>
        </section>

        <div className="mt-10 space-y-10 text-[15px] leading-7 text-foreground/90">
          <Section title="What is deleted">
            <p>Deleting your account permanently removes:</p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>
                <strong>Your sign-in account</strong> — your email address,
                display name, and profile photo, deleted from our
                authentication provider (Clerk)
              </li>
              <li>
                <strong>Your profile</strong> — household size and group
                membership
              </li>
              <li>
                <strong>Your personal meal library</strong> — every meal you
                added or imported, with its ingredients, recipe, tags, and
                photo
              </li>
              <li>
                <strong>Your weekly meal plans</strong> — every week you have
                planned
              </li>
              <li>
                <strong>Meal photos you uploaded</strong> — removed from our
                image storage, unless the same photo is still in use by a meal
                someone else imported
              </li>
              <li>
                <strong>Invitations</strong> — any group invitations addressed
                to your email address
              </li>
              <li>
                <strong>Collections you published</strong> — meal collections
                you created as a collection author
              </li>
            </ul>
          </Section>

          <Section title="What is kept, and why">
            <p>
              A few things survive deletion because they are no longer only
              yours. We do not keep them to hold on to your data — removing them
              would destroy other people&rsquo;s.
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>
                <strong>A shared group library, if other members remain.</strong>{" "}
                Meals and plans in a group workspace are shared with everyone in
                that group. When you delete your account you are removed from
                the group, and if you were its owner, ownership passes to
                another member. The shared meals and plans stay for them, with
                your name detached from anything you contributed. If you are the
                last member, the group and its shared library are deleted with
                your account.
              </li>
              <li>
                <strong>Meals other people already imported.</strong> Importing
                from a collection copies the meal into that person&rsquo;s own
                library. Those copies are their data and stay with them.
              </li>
              <li>
                <strong>Routine backups.</strong> Our database provider keeps
                encrypted backups for a short period. Deleted records may
                persist in those backups until they age out, and are not
                restored into the live service.
              </li>
              <li>
                <strong>Records we are legally required to keep</strong> —
                limited information kept only where the law, security, or fraud
                prevention requires it.
              </li>
            </ul>
          </Section>

          <Section title="How long it takes">
            <p>
              Deleting from inside the app takes effect immediately: your
              account and data are removed as you confirm, and you are signed
              out.
            </p>
            <p className="mt-3">
              Email requests are handled within 30 days of us verifying that the
              request comes from the account holder, and normally much sooner.
              Encrypted backups holding already-deleted records age out within
              30 days.
            </p>
          </Section>

          <Section title="Before you delete">
            <p>
              There is no export or undo. If you want to keep your meals or
              plans, copy them out of the app first. If you share a group
              library and want to keep a copy of meals you added, another member
              will still have them after you go.
            </p>
          </Section>

          <Section title="Questions">
            <p>
              Ask us anything about deletion at{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="font-medium text-foreground underline underline-offset-4 hover:text-foreground/80"
              >
                {SUPPORT_EMAIL}
              </a>
              . Our{" "}
              <Link
                href="/privacy"
                className="font-medium text-foreground underline underline-offset-4 hover:text-foreground/80"
              >
                Privacy Policy
              </Link>{" "}
              explains what we collect and why.
            </p>
          </Section>
        </div>

        <p className="mt-10 text-sm text-muted-foreground">
          Last updated: {LAST_UPDATED}
        </p>
      </article>

      <footer className="mt-auto border-t px-6 py-6 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} The Weekly Plate</p>
      </footer>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}
