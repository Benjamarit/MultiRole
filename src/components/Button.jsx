export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className = '',
  ...props
}) {
  const baseStyle =
    'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-all duration-150 focus-visible:ring-2 focus-visible:ring-precision-blue focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.99]';

  const variants = {
    primary:
      'bg-gradient-to-b from-blue-600 to-blue-700 text-white shadow-xs hover:from-blue-700 hover:to-blue-800',
    secondary:
      'border border-slate-200 bg-white text-slate-700 shadow-2xs hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900',
    danger:
      'border border-red-200 bg-white text-red-700 shadow-2xs hover:border-red-300 hover:bg-red-50',
    text: 'bg-transparent text-precision-blue hover:bg-blue-50/80 hover:text-blue-800',
    textGray: 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={`${baseStyle} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <span className="mr-1 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      {children}
    </button>
  );
}