#!/bin/bash

echo "🎮 Dota 2 Coach - Setup Inicial"
echo "================================"
echo ""

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado. Por favor, instale Node.js 18+ primeiro."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js versão 18+ é necessária. Versão atual: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detectado"
echo ""

# Instalar dependências
echo "📦 Instalando dependências..."
echo ""

npm install

if [ $? -ne 0 ]; then
    echo "❌ Erro ao instalar dependências"
    exit 1
fi

echo ""
echo "${GREEN}✅ Setup completo!${NC}"
echo ""
echo "Para iniciar o desenvolvimento:"
echo "${YELLOW}npm run dev${NC}"
echo ""
echo "Backend estará em: http://localhost:3001"
echo "Frontend estará em: http://localhost:5173"
echo ""
echo "Para executar testes:"
echo "${YELLOW}npm test${NC}"
echo ""
echo "Leia o README.md para mais informações."
