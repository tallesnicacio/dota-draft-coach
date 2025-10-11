import { useState } from 'react';
import { FileText, Download, ExternalLink, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

/**
 * LiveSetupBanner - Instructions for setting up Game State Integration
 *
 * Shows step-by-step guide for configuring GSI in Dota 2
 * Dismissable banner with expandable instructions
 */

interface LiveSetupBannerProps {
  onDismiss?: () => void;
}

export const LiveSetupBanner = ({ onDismiss }: LiveSetupBannerProps) => {
  const [expanded, setExpanded] = useState(false);

  const cfgContent = `"Dota 2 Coach Integration Configuration"
{
  "uri"           "http://127.0.0.1:3001/api/gsi"
  "timeout"       "5.0"
  "buffer"        "0.1"
  "throttle"      "0.5"
  "heartbeat"     "30.0"
  "data"
  {
    "provider"      "1"
    "map"           "1"
    "player"        "1"
    "hero"          "1"
    "abilities"     "1"
    "items"         "1"
    "draft"         "1"
  }
  "auth"
  {
    "token"         "your_secret_token_here"
  }
}`;

  const handleDownload = () => {
    const blob = new Blob([cfgContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gamestate_integration_coach.cfg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getConfigPath = () => {
    const platform = navigator.platform.toLowerCase();

    if (platform.includes('win')) {
      return 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\dota 2 beta\\game\\dota\\cfg\\gamestate_integration\\';
    } else if (platform.includes('mac')) {
      return '~/Library/Application Support/Steam/steamapps/common/dota 2 beta/game/dota/cfg/gamestate_integration/';
    } else {
      return '~/.steam/steam/steamapps/common/dota 2 beta/game/dota/cfg/gamestate_integration/';
    }
  };

  return (
    <Alert className="border-blue-500/50 bg-blue-50 dark:bg-blue-950/20">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-500" />
            <AlertTitle className="text-lg">Configure o Live Mode</AlertTitle>
            <Badge variant="secondary" className="ml-2">
              Opcional
            </Badge>
          </div>

          <AlertDescription className="mt-2">
            <p className="mb-3">
              O Live Mode permite visualizar dados em tempo real durante suas partidas de Dota 2.
              Siga as instruções abaixo para configurar o Game State Integration (GSI).
            </p>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="mb-3"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Ocultar instruções
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Ver instruções passo a passo
                </>
              )}
            </Button>

            {expanded && (
              <Card className="mt-3">
                <CardContent className="pt-4">
                  <ol className="space-y-3 text-sm">
                    <li className="flex gap-2">
                      <span className="font-bold text-blue-500 min-w-[1.5rem]">1.</span>
                      <div>
                        <p className="font-medium mb-1">Baixe o arquivo de configuração</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDownload}
                          className="mt-1"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Baixar gamestate_integration_coach.cfg
                        </Button>
                      </div>
                    </li>

                    <li className="flex gap-2">
                      <span className="font-bold text-blue-500 min-w-[1.5rem]">2.</span>
                      <div>
                        <p className="font-medium mb-1">Copie para a pasta do Dota 2</p>
                        <p className="text-muted-foreground">
                          Cole o arquivo na pasta:
                        </p>
                        <code className="block mt-1 p-2 bg-muted rounded text-xs break-all">
                          {getConfigPath()}
                        </code>
                        <p className="text-xs text-muted-foreground mt-1">
                          💡 Crie a pasta <code>gamestate_integration</code> se ela não existir
                        </p>
                      </div>
                    </li>

                    <li className="flex gap-2">
                      <span className="font-bold text-blue-500 min-w-[1.5rem]">3.</span>
                      <div>
                        <p className="font-medium mb-1">Inicie o Dota 2 Coach Backend</p>
                        <p className="text-muted-foreground">
                          Certifique-se de que o backend está rodando na porta 3001
                        </p>
                        <code className="block mt-1 p-2 bg-muted rounded text-xs">
                          npm run dev:backend
                        </code>
                      </div>
                    </li>

                    <li className="flex gap-2">
                      <span className="font-bold text-blue-500 min-w-[1.5rem]">4.</span>
                      <div>
                        <p className="font-medium mb-1">Reinicie o Dota 2</p>
                        <p className="text-muted-foreground">
                          Feche e abra o Dota 2 para carregar a configuração
                        </p>
                      </div>
                    </li>

                    <li className="flex gap-2">
                      <span className="font-bold text-blue-500 min-w-[1.5rem]">5.</span>
                      <div>
                        <p className="font-medium mb-1">Entre em uma partida</p>
                        <p className="text-muted-foreground">
                          O status mudará para "LIVE" quando conectado
                        </p>
                      </div>
                    </li>
                  </ol>

                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm font-medium mb-2">Precisa de ajuda?</p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open('https://github.com/anthropics/claude-code', '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Documentação completa
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </AlertDescription>
        </div>

        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-6 w-6 p-0 ml-2"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </Alert>
  );
};
