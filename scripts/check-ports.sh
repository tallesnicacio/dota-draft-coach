#!/bin/bash

# Script para verificar se as portas necessárias estão disponíveis
# Uso: ./scripts/check-ports.sh

echo "🔍 Verificando portas necessárias..."
echo ""

BACKEND_PORT=3001
FRONTEND_PORT=5173

check_port() {
  local port=$1
  local service=$2

  if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
    local pid=$(lsof -ti:$port)
    local process=$(ps -p $pid -o comm= 2>/dev/null || echo "unknown")
    echo "❌ Porta $port ($service) está EM USO"
    echo "   PID: $pid"
    echo "   Processo: $process"
    echo "   Para liberar: kill $pid"
    echo ""
    return 1
  else
    echo "✅ Porta $port ($service) está DISPONÍVEL"
    return 0
  fi
}

all_ok=true

if ! check_port $BACKEND_PORT "Backend/WebSocket"; then
  all_ok=false
fi

if ! check_port $FRONTEND_PORT "Frontend"; then
  all_ok=false
fi

echo ""
if [ "$all_ok" = true ]; then
  echo "✅ Todas as portas estão disponíveis!"
  echo "   Você pode executar: npm run dev"
  exit 0
else
  echo "⚠️  Algumas portas estão em uso. Libere-as antes de continuar."
  echo ""
  echo "Dica: Para matar todos os processos node:"
  echo "  pkill -f node"
  exit 1
fi
