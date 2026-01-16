'use client';

import { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface JsonViewerProps {
  data: unknown;
  initialExpanded?: boolean;
  maxHeight?: string;
}

export function JsonViewer({
  data,
  initialExpanded = false,
  maxHeight = '300px',
}: JsonViewerProps) {
  const [expanded, setExpanded] = useState(initialExpanded);

  if (data === null || data === undefined) {
    return <span className="text-gray-400 italic">null</span>;
  }

  const formattedJson = JSON.stringify(data, null, 2);
  const lineCount = formattedJson.split('\n').length;
  const isLarge = lineCount > 10;

  if (!isLarge) {
    return (
      <pre className="text-xs bg-gray-50 p-3 rounded-md overflow-x-auto font-mono text-gray-700">
        {formattedJson}
      </pre>
    );
  }

  return (
    <div className="border border-gray-200 rounded-md overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors text-sm text-gray-600"
      >
        {expanded ? (
          <ChevronDownIcon className="h-4 w-4 mr-2" />
        ) : (
          <ChevronRightIcon className="h-4 w-4 mr-2" />
        )}
        <span>{expanded ? 'Collapse' : 'Expand'} JSON</span>
        <span className="ml-auto text-xs text-gray-400">{lineCount} lines</span>
      </button>

      {expanded && (
        <pre
          className="text-xs p-3 overflow-auto font-mono text-gray-700 bg-white custom-scrollbar"
          style={{ maxHeight }}
        >
          {formattedJson}
        </pre>
      )}
    </div>
  );
}
