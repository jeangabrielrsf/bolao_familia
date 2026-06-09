export function Footer() {
  return (
    <footer className="border-t border-border bg-background mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <p className="text-center text-sm text-muted-foreground font-display tracking-wide">
          BOLÃO DA “FAMÍLIA” &copy; {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  )
}
