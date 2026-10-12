// src/components/Card.jsx
export default function Card({ children, className = '', noPadding = false }) {
  return (
    <div className={`overflow-hidden rounded-md border border-border bg-surface ${className}`}>
      <div className={noPadding ? '' : 'p-6'}>
        {children}
      </div>
    </div>
  );
}