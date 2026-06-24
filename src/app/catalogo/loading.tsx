export default function CatalogoLoading() {
  return (
    <main className="min-h-screen bg-background">
      {/* Header skeleton */}
      <div className="bg-ui-surface border-b border-ui-border">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="h-8 w-32 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-4 w-56 bg-gray-200 rounded-lg animate-pulse mt-2" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Search skeleton */}
        <div className="h-10 w-full max-w-sm bg-gray-200 rounded-pill animate-pulse mb-6" />

        {/* Mobile chips */}
        <div className="flex gap-2 mb-6 lg:hidden overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-9 w-24 flex-shrink-0 bg-gray-200 rounded-pill animate-pulse" />
          ))}
        </div>

        <div className="flex gap-8">
          {/* Sidebar skeleton */}
          <div className="hidden lg:flex flex-col gap-2 w-52 flex-shrink-0">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-9 w-full bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>

          {/* Grid skeleton */}
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="bg-ui-surface rounded-card border border-ui-border overflow-hidden">
                <div className="aspect-square bg-gray-200 animate-pulse" />
                <div className="p-3 flex flex-col gap-2">
                  <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
                  <div className="flex gap-1 mt-1">
                    {[...Array(4)].map((_, j) => (
                      <div key={j} className="w-4 h-4 bg-gray-200 rounded-full animate-pulse" />
                    ))}
                  </div>
                  <div className="h-5 w-24 bg-gray-200 rounded animate-pulse mt-1" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
