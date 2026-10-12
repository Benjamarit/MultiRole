// src/components/Button.jsx
export default function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  isLoading = false, 
  className = '', 
  ...props 
}) {
  const baseStyle = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:ring-2 focus-visible:ring-precision-blue focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
  
  const variants = {
    primary: "bg-precision-blue text-white hover:bg-blue-700",
    secondary: "border border-border bg-surface text-primary-text hover:bg-slate-50",
    danger: "border border-red-200 bg-surface text-red-700 hover:bg-red-50",
    text: "bg-transparent text-precision-blue hover:bg-blue-50 hover:text-blue-800",
    textGray: "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-primary-text"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base"
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      {children}
    </button>
  );
}