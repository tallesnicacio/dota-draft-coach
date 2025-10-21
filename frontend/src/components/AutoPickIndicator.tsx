import { Badge } from '@/components/ui/badge';
import { Zap, Users, Swords } from 'lucide-react';

interface AutoPickIndicatorProps {
  type: 'selected' | 'ally' | 'enemy';
  isAutomatic?: boolean;
}

/**
 * AutoPickIndicator - Shows if hero was detected automatically
 */
export function AutoPickIndicator({ type, isAutomatic = false }: AutoPickIndicatorProps) {
  if (!isAutomatic) return null;

  const config = {
    selected: {
      icon: Zap,
      text: 'Auto-Detectado',
      variant: 'default' as const,
    },
    ally: {
      icon: Users,
      text: 'Auto',
      variant: 'secondary' as const,
    },
    enemy: {
      icon: Swords,
      text: 'Auto',
      variant: 'destructive' as const,
    },
  };

  const { icon: Icon, text, variant } = config[type];

  return (
    <Badge variant={variant} className="text-xs gap-1">
      <Icon className="w-3 h-3" />
      {text}
    </Badge>
  );
}
