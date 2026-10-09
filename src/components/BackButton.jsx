import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function BackButton({ to, className = '', children }) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-1 rounded-sm text-sm font-medium text-precision-blue hover:text-blue-800 hover:underline focus-visible:outline-offset-4 ${className}`}
    >
      <ArrowLeft size={16} aria-hidden="true" />
      {children}
    </Link>
  );
}