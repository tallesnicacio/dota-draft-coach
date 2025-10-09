import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MMRBucket, Patch } from '@/types/dota';

interface FiltersBarProps {
  patch: Patch;
  mmrBucket: MMRBucket;
  onPatchChange: (patch: Patch) => void;
  onMMRChange: (mmr: MMRBucket) => void;
}

export const FiltersBar = ({ patch, mmrBucket, onPatchChange, onMMRChange }: FiltersBarProps) => {
  return (
    <div className="flex flex-wrap gap-4 items-center">
      <div className="flex-1 min-w-[200px]">
        <label className="text-sm font-medium text-muted-foreground mb-2 block">Patch</label>
        <Select value={patch} onValueChange={(value) => onPatchChange(value as Patch)}>
          <SelectTrigger className="bg-secondary/50 border-border/50 hover:border-primary transition-colors">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="7.37">7.37</SelectItem>
            <SelectItem value="7.36">7.36</SelectItem>
            <SelectItem value="7.35">7.35</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 min-w-[200px]">
        <label className="text-sm font-medium text-muted-foreground mb-2 block">Faixa de MMR</label>
        <Select value={mmrBucket} onValueChange={(value) => onMMRChange(value as MMRBucket)}>
          <SelectTrigger className="bg-secondary/50 border-border/50 hover:border-primary transition-colors">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="Herald-Crusader">Herald - Crusader</SelectItem>
            <SelectItem value="Archon-Legend">Archon - Legend</SelectItem>
            <SelectItem value="Ancient-Divine">Ancient - Divine</SelectItem>
            <SelectItem value="Immortal">Immortal</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
