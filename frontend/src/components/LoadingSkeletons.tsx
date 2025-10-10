import { Skeleton } from '@/components/ui/skeleton';

// Skeleton para o grid de heróis
export const HeroGridSkeleton = () => {
  return (
    <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 max-h-[400px] overflow-y-auto pr-2">
      {Array.from({ length: 50 }).map((_, i) => (
        <Skeleton key={i} className="aspect-square rounded-lg" />
      ))}
    </div>
  );
};

// Skeleton para o painel de build
export const BuildPanelSkeleton = () => {
  return (
    <div className="glass-card rounded-xl p-6 border space-y-6">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-6 w-32" />
      </div>

      <div className="space-y-6">
        {/* Starting Items */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-5 w-16" />
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-24 rounded-lg" />
            ))}
          </div>
        </div>

        {/* Early Game */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-28 rounded-lg" />
            ))}
          </div>
        </div>

        {/* Mid Game */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-5 w-20" />
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-32 rounded-lg" />
            ))}
          </div>
        </div>

        {/* Situational */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-5 w-28" />
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-28 rounded-lg" />
            ))}
          </div>
        </div>
      </div>

      <Skeleton className="h-20 w-full rounded-lg" />
    </div>
  );
};

// Skeleton para o painel de skills
export const SkillsPanelSkeleton = () => {
  return (
    <div className="glass-card rounded-xl p-6 border space-y-6">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-6 w-40" />
      </div>

      {/* Skill sequence */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 15 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-8 rounded" />
          ))}
        </div>
      </div>

      {/* Talents */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-24" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex justify-between items-center">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-10 w-32" />
            </div>
          ))}
        </div>
      </div>

      <Skeleton className="h-16 w-full rounded-lg" />
    </div>
  );
};

// Skeleton para o painel de matchups
export const MatchupsPanelSkeleton = () => {
  return (
    <div className="glass-card rounded-xl p-6 border space-y-6">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-6 w-28" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-md" />
        ))}
      </div>

      {/* Matchup cards */}
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-3 rounded-lg border">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-6 w-16 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
};

// Skeleton para card de herói selecionado
export const HeroCardSkeleton = () => {
  return (
    <div className="glass-card rounded-xl p-6 border">
      <div className="flex items-center gap-4">
        <Skeleton className="w-24 h-24 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-6 w-32" />
        </div>
      </div>
    </div>
  );
};
