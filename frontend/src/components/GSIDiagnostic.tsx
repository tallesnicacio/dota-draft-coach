import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Copy,
  Terminal,
} from 'lucide-react';
import { toast } from '@/components/ui/sonner';

interface DiagnosticResult {
  step: string;
  status: 'success' | 'error' | 'warning' | 'pending';
  message: string;
  details?: string;
}

/**
 * GSIDiagnostic - Ferramenta de diagnóstico para GSI
 *
 * Verifica:
 * - Backend está rodando
 * - WebSocket conectado
 * - GSI endpoint acessível
 * - Última vez que recebeu dados
 */
export function GSIDiagnostic() {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [testing, setTesting] = useState(false);
  const [gsiStats, setGsiStats] = useState<any>(null);

  const runDiagnostics = async () => {
    setTesting(true);
    const newResults: DiagnosticResult[] = [];

    // Test 1: Backend Health
    try {
      const response = await fetch('http://localhost:3001/health');
      if (response.ok) {
        newResults.push({
          step: 'Backend Health',
          status: 'success',
          message: 'Backend está rodando',
          details: 'http://localhost:3001',
        });
      } else {
        newResults.push({
          step: 'Backend Health',
          status: 'error',
          message: 'Backend respondeu com erro',
          details: `Status: ${response.status}`,
        });
      }
    } catch (error) {
      newResults.push({
        step: 'Backend Health',
        status: 'error',
        message: 'Backend não está acessível',
        details: 'Certifique-se de que "npm run dev" está rodando',
      });
    }

    // Test 2: GSI Endpoint
    try {
      const response = await fetch('http://localhost:3001/api/gsi/stats');
      if (response.ok) {
        const data = await response.json();
        setGsiStats(data);

        if (data.totalSnapshots > 0) {
          newResults.push({
            step: 'GSI Endpoint',
            status: 'success',
            message: `GSI recebeu ${data.totalSnapshots} snapshots`,
            details: `Última atualização: ${new Date(data.lastUpdate).toLocaleTimeString('pt-BR')}`,
          });
        } else {
          newResults.push({
            step: 'GSI Endpoint',
            status: 'warning',
            message: 'GSI endpoint OK, mas nenhum snapshot recebido',
            details: 'Verifique se o arquivo gamestate_integration_coach.cfg está no lugar certo',
          });
        }
      } else {
        newResults.push({
          step: 'GSI Endpoint',
          status: 'error',
          message: 'GSI endpoint não responde',
        });
      }
    } catch (error) {
      newResults.push({
        step: 'GSI Endpoint',
        status: 'error',
        message: 'Erro ao checar GSI stats',
        details: 'Backend pode não estar rodando',
      });
    }

    // Test 3: WebSocket
    try {
      const wsUrl = 'ws://localhost:3001/ws';
      const ws = new WebSocket(wsUrl);

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          ws.close();
          reject(new Error('Timeout'));
        }, 3000);

        ws.onopen = () => {
          clearTimeout(timeout);
          ws.close();
          resolve(true);
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('Connection failed'));
        };
      });

      newResults.push({
        step: 'WebSocket',
        status: 'success',
        message: 'WebSocket conectado com sucesso',
        details: wsUrl,
      });
    } catch (error) {
      newResults.push({
        step: 'WebSocket',
        status: 'error',
        message: 'WebSocket não conectou',
        details: 'Verifique se o backend está rodando',
      });
    }

    setResults(newResults);
    setTesting(false);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const copyConfigFile = () => {
    const config = `"Dota 2 Integration Configuration"
{
    "uri"           "http://127.0.0.1:3001/api/gsi"
    "timeout"       "5.0"
    "buffer"        "0.1"
    "throttle"      "0.1"
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
        "wearables"     "0"
    }
    "auth"
    {
        "token"         ""
    }
}`;

    navigator.clipboard.writeText(config);
    toast.success('Config copiada!', {
      description: 'Cole no arquivo gamestate_integration_coach.cfg',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Terminal className="w-5 h-5" />
              Diagnóstico GSI
            </CardTitle>
            <Button
              onClick={runDiagnostics}
              disabled={testing}
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${testing ? 'animate-spin' : ''}`} />
              Testar Novamente
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Results */}
          <div className="space-y-3">
            {results.map((result, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  result.status === 'success'
                    ? 'bg-green-500/10 border-green-500/30'
                    : result.status === 'error'
                    ? 'bg-red-500/10 border-red-500/30'
                    : 'bg-yellow-500/10 border-yellow-500/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  {getStatusIcon(result.status)}
                  <div className="flex-1">
                    <div className="font-semibold">{result.step}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {result.message}
                    </div>
                    {result.details && (
                      <div className="text-xs text-muted-foreground mt-2 font-mono">
                        {result.details}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* GSI Stats */}
          {gsiStats && (
            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="text-sm">Estatísticas GSI</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total de Snapshots:</span>
                  <Badge variant="secondary">{gsiStats.totalSnapshots}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Última Atualização:</span>
                  <span className="font-mono text-xs">
                    {gsiStats.lastUpdate
                      ? new Date(gsiStats.lastUpdate).toLocaleString('pt-BR')
                      : 'Nunca'}
                  </span>
                </div>
                {gsiStats.currentMatch && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Match ID:</span>
                    <span className="font-mono text-xs">{gsiStats.currentMatch}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-3 mt-2">
                <div>
                  <strong>Se o GSI não está recebendo dados:</strong>
                </div>

                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>
                    Copie o config file:
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyConfigFile}
                      className="ml-2"
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copiar Config
                    </Button>
                  </li>

                  <li className="mt-2">
                    Cole no arquivo:
                    <code className="block mt-1 p-2 bg-muted rounded text-xs">
                      Windows: C:\Program Files (x86)\Steam\steamapps\common\dota 2 beta\game\dota\cfg\gamestate_integration\gamestate_integration_coach.cfg
                    </code>
                    <code className="block mt-1 p-2 bg-muted rounded text-xs">
                      Linux: ~/.steam/steam/steamapps/common/dota 2 beta/game/dota/cfg/gamestate_integration/gamestate_integration_coach.cfg
                    </code>
                  </li>

                  <li className="mt-2">
                    <strong>REINICIE O DOTA 2 COMPLETAMENTE</strong>
                  </li>

                  <li>Entre em uma partida (demo, bot match, ou ranked)</li>

                  <li>Clique em "Testar Novamente" acima</li>
                </ol>

                <div className="mt-4 p-3 bg-yellow-500/10 rounded border border-yellow-500/30">
                  <strong className="text-yellow-600">⚠️ IMPORTANTE:</strong>
                  <div className="text-xs mt-1">
                    O Dota 2 SÓ envia dados quando você está EM JOGO, não no menu.
                    Se você já configurou o GSI e reiniciou o Dota, entre em uma partida primeiro!
                  </div>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
