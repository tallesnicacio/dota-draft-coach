import { SkillOrder } from '@/types/dota';
import { Sparkles } from 'lucide-react';

interface SkillsPanelProps {
  skillOrder: SkillOrder;
}

const SkillBox = ({ skill, level }: { skill: string; level: number }) => {
  const getSkillColor = (skill: string) => {
    switch (skill) {
      case 'Q': return 'primary';
      case 'W': return 'accent';
      case 'E': return 'success';
      case 'R': return 'warning';
      default: return 'muted';
    }
  };

  const color = getSkillColor(skill);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`w-10 h-10 rounded-lg bg-${color}/20 border-2 border-${color}/50 flex items-center justify-center font-bold text-${color} hover:bg-${color}/30 transition-colors`}>
        {skill}
      </div>
      <span className="text-xs text-muted-foreground">{level}</span>
    </div>
  );
};

export const SkillsPanel = ({ skillOrder }: SkillsPanelProps) => {
  return (
    <div className="glass-card rounded-xl p-6 border space-y-6">
      <h3 className="text-xl font-bold text-primary flex items-center gap-2">
        <Sparkles className="h-5 w-5" />
        Ordem de Skills
      </h3>

      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {skillOrder.sequence.map((skill, idx) => (
            <SkillBox key={idx} skill={skill} level={idx + 1} />
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary/20 border border-primary/50 flex items-center justify-center text-xs font-bold text-primary">Q</div>
            <span className="text-muted-foreground">Habilidade Principal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-accent/20 border border-accent/50 flex items-center justify-center text-xs font-bold text-accent">W</div>
            <span className="text-muted-foreground">Habilidade Secundária</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-success/20 border border-success/50 flex items-center justify-center text-xs font-bold text-success">E</div>
            <span className="text-muted-foreground">Utilitário</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-warning/20 border border-warning/50 flex items-center justify-center text-xs font-bold text-warning">R</div>
            <span className="text-muted-foreground">Ultimate</span>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">💡 Dica:</strong> Priorize Q para máximo dano e proteção. 
          Pegue W em nível 2 para slow e visão. Deixe E por último, focando em stats se necessário.
        </p>
      </div>
    </div>
  );
};
