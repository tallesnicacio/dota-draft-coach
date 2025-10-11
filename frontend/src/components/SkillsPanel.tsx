import { SkillOrder } from '@/types/dota';
import { Sparkles, ArrowRight } from 'lucide-react';

interface SkillsPanelProps {
  skillOrder: SkillOrder;
  heroName?: string;
  nextSkill?: string | null;
  currentSkillLevels?: {
    q: number;
    w: number;
    e: number;
    r: number;
  };
}

const SkillBox = ({ skill, level, heroName }: { skill: string; level: number; heroName?: string }) => {
  const getSkillColor = (skill: string) => {
    switch (skill) {
      case 'Q': return 'border-blue-500';
      case 'W': return 'border-purple-500';
      case 'E': return 'border-yellow-500';
      case 'R': return 'border-red-500';
      default: return 'border-gray-500';
    }
  };

  const getSkillBgColor = (skill: string) => {
    switch (skill) {
      case 'Q': return 'bg-blue-500/20 hover:bg-blue-500/30';
      case 'W': return 'bg-purple-500/20 hover:bg-purple-500/30';
      case 'E': return 'bg-yellow-500/20 hover:bg-yellow-500/30';
      case 'R': return 'bg-red-500/20 hover:bg-red-500/30';
      default: return 'bg-gray-500/20 hover:bg-gray-500/30';
    }
  };

  const borderColor = getSkillColor(skill);
  const bgColor = getSkillBgColor(skill);

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`relative w-12 h-12 rounded-lg border-2 ${borderColor} ${bgColor} flex items-center justify-center font-bold transition-all group overflow-hidden`}
        title={`Level ${level}: ${skill}`}
      >
        {/* Letra da skill */}
        <span className="text-white text-sm font-bold z-10 drop-shadow-lg">{skill}</span>

        {/* Indicador de level */}
        <div className="absolute bottom-0 right-0 bg-black/70 text-white text-[10px] px-1 rounded-tl">
          {level}
        </div>
      </div>
    </div>
  );
};

export const SkillsPanel = ({ skillOrder, heroName, nextSkill, currentSkillLevels }: SkillsPanelProps) => {
  // Contar quantas vezes cada skill aparece
  const skillCounts = skillOrder.sequence.reduce((acc, skill) => {
    acc[skill] = (acc[skill] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="glass-card rounded-xl p-6 border space-y-6">
      <h3 className="text-xl font-bold text-primary flex items-center gap-2">
        <Sparkles className="h-5 w-5" />
        Ordem de Skills
      </h3>

      {nextSkill && (
        <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
          <div className="flex items-center gap-3">
            <ArrowRight className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-semibold text-primary">Próxima skill</p>
              <p className="text-2xl font-bold">{nextSkill}</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {skillOrder.sequence.map((skill, idx) => (
            <SkillBox key={idx} skill={skill} level={idx + 1} heroName={heroName} />
          ))}
        </div>

        {/* Legenda de skills */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm border-t border-border/50 pt-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-blue-500/20 border-2 border-blue-500 flex items-center justify-center text-xs font-bold text-white">
              Q
            </div>
            <div className="flex flex-col">
              <span className="text-foreground font-semibold">Skill 1</span>
              <span className="text-xs text-muted-foreground">x{skillCounts['Q'] || 0}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-purple-500/20 border-2 border-purple-500 flex items-center justify-center text-xs font-bold text-white">
              W
            </div>
            <div className="flex flex-col">
              <span className="text-foreground font-semibold">Skill 2</span>
              <span className="text-xs text-muted-foreground">x{skillCounts['W'] || 0}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-yellow-500/20 border-2 border-yellow-500 flex items-center justify-center text-xs font-bold text-white">
              E
            </div>
            <div className="flex flex-col">
              <span className="text-foreground font-semibold">Skill 3</span>
              <span className="text-xs text-muted-foreground">x{skillCounts['E'] || 0}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-red-500/20 border-2 border-red-500 flex items-center justify-center text-xs font-bold text-white">
              R
            </div>
            <div className="flex flex-col">
              <span className="text-foreground font-semibold">Ultimate</span>
              <span className="text-xs text-muted-foreground">x{skillCounts['R'] || 0}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">💡 Dica:</strong> A ordem mostrada é baseada em dados de partidas pro.
          Skills principais (Q) geralmente são maximizadas primeiro para maior impacto no early game.
        </p>
      </div>
    </div>
  );
};
