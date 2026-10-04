import React from 'react';
import { CustomHtmlBlockConfig } from '../../types/cms';

interface Props {
  block: CustomHtmlBlockConfig;
}

export default function CustomHtmlBlock({ block }: Props) {
  return (
    <section className="py-8 bg-white border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {block.title && (
          <h2 className="text-xl font-black text-slate-900 mb-4">{block.title}</h2>
        )}
        <div
          className="prose max-w-none"
          dangerouslySetInnerHTML={{ __html: block.rawHtml || '' }}
        />
      </div>
    </section>
  );
}
