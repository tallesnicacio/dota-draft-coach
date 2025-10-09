import { TrendingUp, Users, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ConfidenceBadgeProps {
  score: number;
  sampleSize: number;
  lastUpdated: string;
}

export const ConfidenceBadge = ({ score, sampleSize, lastUpdated }: ConfidenceBadgeProps) => {
  const confidenceColor = score >= 0.8 ? 'success' : score >= 0.6 ? 'warning' : 'destructive';
  const confidenceText = score >= 0.8 ? 'Alta' : score >= 0.6 ? 'Média' : 'Baixa';

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const hours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (hours < 1) return 'Menos de 1 hora atrás';
    if (hours === 1) return '1 hora atrás';
    if (hours < 24) return `${hours} horas atrás`;
    const days = Math.floor(hours / 24);
    if (days === 1) return '1 dia atrás';
    return `${days} dias atrás`;
  };

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <Badge variant="outline" className={`border-${confidenceColor}/50 text-${confidenceColor}`}>
        <TrendingUp className="h-3 w-3 mr-1" />
        Confiança: {confidenceText} ({(score * 100).toFixed(0)}%)
      </Badge>
      
      <Badge variant="outline" className="border-accent/50 text-accent">
        <Users className="h-3 w-3 mr-1" />
        {sampleSize.toLocaleString('pt-BR')} partidas
      </Badge>
      
      <Badge variant="outline" className="border-muted-foreground/50 text-muted-foreground">
        <Clock className="h-3 w-3 mr-1" />
        {getTimeAgo(lastUpdated)}
      </Badge>
    </div>
  );
};
