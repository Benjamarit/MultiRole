import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function BackButton({ to, className = '', children }) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline ${className}`}
    >
      <ArrowLeft size={16} aria-hidden="true" />
      {children}
    </Link>
  );
}