import { SeriesSkeleton } from "./SeriesSkeleton";

export default function Loading() {
  return (
    <SeriesSkeleton
      titleWidth={300}
      dekWidth={440}
      metaWidths={[64, 56, 72, 96]}
      pillWidths={[92, 110, 84]}
    />
  );
}
