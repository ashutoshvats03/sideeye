export default function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-neutral-600 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="font-display text-base font-extrabold text-neutral-900">
          SideEye — worth the second look.
        </p>
        <nav aria-label="Footer" className="flex flex-wrap gap-4">
          <span>Free shipping over Rs.999</span>
          <span aria-hidden="true">·</span>
          <span>Cash on delivery</span>
        </nav>
      </div>
    </footer>
  );
}
