import Link from "next/link";
import Header from "@/components/Header";

export default function Page() {
  return (
    <>
      <Header />
      <main>
        <section className="flex flex-col items-center justify-center text-center gap-12 px-8 py-24">
          <h1 className="text-3xl font-extrabold">Hashipost ⚡️</h1>

          <p className="text-lg opacity-80">One post to everywhere you want.</p>

          <Link href="/blog" className="link link-hover text-sm">
            Blog!
          </Link>
        </section>
      </main>
    </>
  );
}
