import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — The Weekly Plate",
  description:
    "How The Weekly Plate collects, uses, and protects your personal information.",
};

const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "privacy@theweeklyplate.app";

const LAST_UPDATED = "August 5, 2026";

export default function PrivacyPage() {
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
        <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: {LAST_UPDATED}
        </p>

        <div className="mt-10 space-y-10 text-[15px] leading-7 text-foreground/90">
          <Section title="Overview">
            <p>
              The Weekly Plate (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or
              &ldquo;our&rdquo;) is a weekly meal-planning application. This
              policy explains what personal information we collect when you use
              our website and mobile app, how we use it, and the choices you
              have.
            </p>
          </Section>

          <Section title="Information we collect">
            <p>When you create an account and use the app, we may collect:</p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>
                <strong>Account information</strong> — email address, display
                name, and profile image provided through our authentication
                provider (Clerk). If you sign in with Google, Clerk receives
                basic profile details from Google on your behalf.
              </li>
              <li>
                <strong>Meal and planning data</strong> — meals you add or
                import (names, ingredients, recipes, photos, diet tags,
                cuisine, meal types), weekly meal plans, and household size
                preferences.
              </li>
              <li>
                <strong>Group data</strong> — group names, membership, and
                email addresses you invite to a shared household workspace.
              </li>
              <li>
                <strong>Collection activity</strong> — if you browse or import
                from published meal collections, we record which items you
                imported. Creators with a special role may publish collections
                that other signed-in users can view.
              </li>
              <li>
                <strong>Import links</strong> — when you share or paste a
                TikTok, Instagram, or YouTube URL to import a recipe, we
                process that link and related metadata to extract recipe
                details.
              </li>
            </ul>
            <p className="mt-3">
              We do not intentionally collect precise location, contacts, or
              payment information. The app is free and does not show
              third-party advertising.
            </p>
          </Section>

          <Section title="How we use your information">
            <p>We use the information above to:</p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>Create and secure your account</li>
              <li>Store and sync your meal library and weekly plans</li>
              <li>Enable shared planning with people you invite</li>
              <li>Import recipes from links you provide</li>
              <li>Suggest meal details or images when you use optional autofill features</li>
              <li>Operate, maintain, and improve the service</li>
              <li>Respond to support requests and legal obligations</li>
            </ul>
          </Section>

          <Section title="Third-party services">
            <p>
              We use trusted providers to run the app. They process data on
              our behalf only as needed to provide the service:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>
                <strong>Clerk</strong> — authentication and session management
              </li>
              <li>
                <strong>MongoDB Atlas</strong> — database hosting for profiles,
                meals, plans, groups, and collections
              </li>
              <li>
                <strong>Vercel</strong> — application hosting and delivery
              </li>
              <li>
                <strong>Vercel Blob</strong> — optional storage for meal
                images you upload
              </li>
              <li>
                <strong>Google (Gemini)</strong> — optional AI processing when
                you import a recipe from YouTube
              </li>
              <li>
                <strong>Unsplash</strong> — optional photo suggestions when you
                use meal autofill
              </li>
              <li>
                <strong>Spoonacular</strong> — optional recipe suggestions when
                you use meal autofill
              </li>
              <li>
                <strong>YouTube, TikTok, and Instagram</strong> — when you
                import from a video link, we fetch public metadata or captions
                from those platforms
              </li>
            </ul>
            <p className="mt-3">
              Each provider has its own privacy policy governing how they handle
              data. We do not sell your personal information.
            </p>
          </Section>

          <Section title="How we share information">
            <p>
              Your personal meal library and weekly plans are private to your
              account unless you join or create a group workspace, in which
              case other members of that group can see the shared library and
              plans.
            </p>
            <p className="mt-3">
              Published collections are visible to signed-in users. We may also
              disclose information if required by law or to protect the rights,
              safety, and security of our users and the service.
            </p>
          </Section>

          <Section title="Data retention">
            <p>
              We keep your account and app data while your account is active.
              Deleting your account removes that data immediately, except where
              we must retain information for legal or security reasons, and
              except for encrypted backups, which age out within 30 days and are
              never restored into the live service.
            </p>
          </Section>

          <Section title="Security">
            <p>
              We use HTTPS in transit and industry-standard hosting practices.
              No method of transmission or storage is completely secure, but we
              work to protect your information against unauthorised access,
              alteration, or destruction.
            </p>
          </Section>

          <Section title="Your choices and account deletion">
            <p>
              You can update most of your meal and planning data directly in
              the app. You can leave a group or revoke pending invites from
              the Group page.
            </p>
            <p className="mt-3">
              You can delete your account yourself from the{" "}
              <Link
                href="/account"
                className="font-medium text-foreground underline underline-offset-4 hover:text-foreground/80"
              >
                Account page
              </Link>{" "}
              in the app. It takes effect immediately and permanently removes
              your sign-in account, your personal meal library and plans, meal
              photos you uploaded, your group membership, invitations addressed
              to you, and any collections you published. It cannot be undone.
            </p>
            <p className="mt-3">
              If you can no longer sign in, email{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=Account%20deletion%20request`}
                className="font-medium text-foreground underline underline-offset-4 hover:text-foreground/80"
              >
                {SUPPORT_EMAIL}
              </a>{" "}
              from the address linked to your account and we will delete it for
              you. We may ask you to verify ownership first.
            </p>
            <p className="mt-3">
              Meals and plans in a shared group library stay with the members
              who remain, and meals other people imported stay in their own
              libraries. Our{" "}
              <Link
                href="/delete-account"
                className="font-medium text-foreground underline underline-offset-4 hover:text-foreground/80"
              >
                account deletion page
              </Link>{" "}
              sets out exactly what is deleted, what is kept, and how long it
              takes.
            </p>
          </Section>

          <Section title="Children's privacy">
            <p>
              The Weekly Plate is not directed at children under 13, and we do
              not knowingly collect personal information from children under 13.
              If you believe a child has provided us personal information,
              contact us and we will delete it.
            </p>
          </Section>

          <Section title="International users">
            <p>
              Your information may be processed in countries where our service
              providers operate, including the United States. By using the app,
              you consent to this processing subject to applicable law.
            </p>
          </Section>

          <Section title="Changes to this policy">
            <p>
              We may update this policy from time to time. When we do, we will
              revise the &ldquo;Last updated&rdquo; date above. Continued use of
              the app after changes take effect means you accept the updated
              policy.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              Questions about this policy or your data? Email{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="font-medium text-foreground underline underline-offset-4 hover:text-foreground/80"
              >
                {SUPPORT_EMAIL}
              </a>
              .
            </p>
          </Section>
        </div>
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
