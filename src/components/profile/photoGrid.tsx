"use client";

import { Card } from "@/components/ui/card";

export type PhotoItem = {
  key: string;
  imageUrl: string;
  href?: string;
  label?: string;
};

export function PhotoGrid({ photos }: { photos: PhotoItem[] }) {
  return (
    <Card className="p-4 bg-white">
      <div className="flex items-center justify-between mb-0">
        <h2 className="font-bold text-foreground">Photos</h2>
        <div className="text-sm text-muted-foreground">{photos.length}</div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {photos.map((p) => {
          const img = (
            <div className="relative w-full aspect-square overflow-hidden bg-muted">
              <img src={p.imageUrl} alt={p.label || ""} className="absolute inset-0 w-full h-full object-cover" />
            </div>
          );

          if (p.href) {
            return (
              <a key={p.key} href={p.href} target="_blank" rel="noreferrer" className="block">
                {img}
              </a>
            );
          }

          return <div key={p.key}>{img}</div>;
        })}
      </div>
    </Card>
  );
}