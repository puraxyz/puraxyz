import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { RecipeCard } from "@/components/RecipeCard";
import { PatternCard } from "@/components/PatternCard";
import { getAllRecipes, getAllPatterns } from "@/lib/recipes";
import { HeroSimulation } from "@/components/HeroSimulation";
import Link from "next/link";

export default function Home() {
  const recipes = getAllRecipes();
  const patterns = getAllPatterns();

  return (
    <>
      <Nav />
      <main>
        {/* Hero */}
        <section className="relative border-b border-[var(--color-border)] overflow-hidden">
          <div className="mx-auto max-w-7xl px-6 py-16">
            <div className="mb-8">
              <h1 className="text-4xl font-bold tracking-tight mb-3">
                Composable pipelines for backpressure economics
              </h1>
              <p className="text-lg text-[var(--color-text-muted)] max-w-2xl">
                Browse recipes. Fork them. Simulate backpressure routing with
                Boltzmann allocation and thermodynamic equilibrium in your
                browser. Deploy to Base with one CLI command.
              </p>
            </div>
            <HeroSimulation />
          </div>
        </section>

        {/* Recipe gallery */}
        <section className="mx-auto max-w-7xl px-6 py-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold">Recipes</h2>
            <Link
              href="/recipes"
              className="text-sm text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors"
            >
              View all →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recipes.map((r) => (
              <RecipeCard key={r.slug} recipe={r} />
            ))}
          </div>
        </section>

        {/* Patterns */}
        <section className="mx-auto max-w-7xl px-6 py-16 border-t border-[var(--color-border)]">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold">Atomic patterns</h2>
            <Link
              href="/patterns"
              className="text-sm text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors"
            >
              View all →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {patterns.map((p) => (
              <PatternCard key={p.slug} pattern={p} />
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
