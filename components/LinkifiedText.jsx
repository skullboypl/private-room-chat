'use client';

import { useMemo } from 'react';
import { splitTextWithLinks } from '@/lib/linkify';

export default function LinkifiedText({ text, className = '' }) {
  const parts = useMemo(() => splitTextWithLinks(text), [text]);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.type === 'link') {
          return (
            <a
              key={`link-${index}-${part.href}`}
              href={part.href}
              className="message__link"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              {part.value}
            </a>
          );
        }

        return <span key={`text-${index}`}>{part.value}</span>;
      })}
    </span>
  );
}
