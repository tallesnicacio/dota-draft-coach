import { Circle, Wifi, WifiOff, AlertCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLiveStore } from '@/store/liveStore';
import { liveClient } from '@/services/liveClient';

/**
 * LiveBadge - Status indicator for Live Mode
 *
 * Shows connection status, last update time, and reliability indicator
 * Allows users to connect/disconnect from Live Mode
 */

export const LiveBadge = () => {
  const { enabled, status, lastUpdate, reliability, error } = useLiveStore();

  const handleToggle = () => {
    if (enabled && status !== 'disconnected') {
      // Disconnect
      liveClient.disconnect();
      useLiveStore.getState().setEnabled(false);
    } else {
      // Connect
      useLiveStore.getState().setEnabled(true);
      liveClient.connect();
    }
  };

  const getStatusColor = () => {
    if (error) return 'destructive';
    switch (status) {
      case 'connected':
        return 'success';
      case 'connecting':
        return 'warning';
      case 'disconnected':
        return 'secondary';
      case 'error':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getStatusText = () => {
    if (error) return 'Erro';
    switch (status) {
      case 'connected':
        return 'LIVE';
      case 'connecting':
        return 'Conectando...';
      case 'disconnected':
        return 'Desconectado';
      case 'error':
        return 'Erro';
      default:
        return 'Desconectado';
    }
  };

  const getStatusIcon = () => {
    if (error) return <AlertCircle className="h-3 w-3 mr-1" />;
    switch (status) {
      case 'connected':
        return <Circle className="h-3 w-3 mr-1 fill-current animate-pulse" />;
      case 'connecting':
        return <Wifi className="h-3 w-3 mr-1 animate-pulse" />;
      case 'disconnected':
        return <WifiOff className="h-3 w-3 mr-1" />;
      case 'error':
        return <AlertCircle className="h-3 w-3 mr-1" />;
      default:
        return <WifiOff className="h-3 w-3 mr-1" />;
    }
  };

  const getReliabilityText = () => {
    switch (reliability) {
      case 'high':
        return 'Excelente';
      case 'medium':
        return 'Boa';
      case 'low':
        return 'Fraca';
      default:
        return '';
    }
  };

  const getReliabilityColor = () => {
    switch (reliability) {
      case 'high':
        return 'text-green-500';
      case 'medium':
        return 'text-yellow-500';
      case 'low':
        return 'text-red-500';
      default:
        return 'text-muted-foreground';
    }
  };

  const getTimeAgo = () => {
    if (!lastUpdate) return '';

    const now = Date.now();
    const diff = now - lastUpdate;

    if (diff < 1000) return 'agora';
    if (diff < 60000) return `${Math.floor(diff / 1000)}s atrás`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m atrás`;
    return `${Math.floor(diff / 3600000)}h atrás`;
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={enabled && status === 'connected' ? 'default' : 'outline'}
        size="sm"
        onClick={handleToggle}
        className="h-7 gap-1"
      >
        {getStatusIcon()}
        {getStatusText()}
      </Button>

      {enabled && status === 'connected' && lastUpdate && (
        <>
          <Badge variant="outline" className="h-7 gap-1 border-muted-foreground/50">
            <Clock className="h-3 w-3" />
            {getTimeAgo()}
          </Badge>

          {reliability !== 'unknown' && (
            <Badge variant="outline" className={`h-7 border-muted-foreground/50 ${getReliabilityColor()}`}>
              {getReliabilityText()}
            </Badge>
          )}
        </>
      )}

      {error && (
        <Badge variant="destructive" className="h-7">
          {error}
        </Badge>
      )}
    </div>
  );
};
