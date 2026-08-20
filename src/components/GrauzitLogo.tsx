export function GrauzitLogo({ className = 'h-12 md:h-14' }: { className?: string }) {
  return (
    <div className={`inline-flex items-center bg-white/95 px-3 py-2 shadow-xl ${className}`}>
      <img
        src="/grauzit-logo.png"
        alt="GRAUZIT Logo"
        className="h-full w-auto object-contain"
      />
    </div>
  )
}
