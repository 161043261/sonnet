import { GlobalSearch } from "@/components/global-search";

function App() {
  return (
    <main className="bg-base-200 min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-4 py-6 sm:px-6">
        <nav className="navbar px-0">
          <div className="navbar-start">
            <span className="btn btn-ghost px-0 text-xl">Global Search</span>
          </div>
          <div className="navbar-end">
            <kbd className="kbd kbd-sm">Cmd/Ctrl + P</kbd>
          </div>
        </nav>

        <section className="flex flex-1 items-center py-16">
          <div className="w-full space-y-8">
            <div className="space-y-3 text-center">
              <h1 className="text-4xl tracking-tight md:text-5xl">
                Global Search
              </h1>
              <p className="text-base-content/60 mx-auto max-w-xl text-sm leading-6">
                Press Cmd/Ctrl + P, type a query, and open a result.
              </p>
            </div>

            <GlobalSearch cacheTtlSeconds={30} />
          </div>
        </section>
      </div>
    </main>
  );
}

export default App;
