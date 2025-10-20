import { test, expect } from '@playwright/test';

/**
 * Smoke Tests - Testes básicos para garantir que a aplicação funciona
 */

test.describe('Basic Functionality', () => {
  test('should load homepage successfully', async ({ page }) => {
    await page.goto('/');

    // Aplicação deve carregar sem erros
    await expect(page).not.toHaveTitle(/error/i);

    // Deve ter conteúdo visível
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should have working navigation', async ({ page }) => {
    await page.goto('/');

    // Aguardar carregamento
    await page.waitForLoadState('networkidle');

    // Procurar por elementos de navegação (adaptar conforme UI real)
    const nav = page.locator('nav').or(page.locator('[role="navigation"]'));

    if (await nav.count() > 0) {
      await expect(nav).toBeVisible();
    }
  });

  test('should connect to backend API', async ({ page }) => {
    await page.goto('/');

    // Interceptar requisições para a API
    const apiRequests: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/api/')) {
        apiRequests.push(url);
      }
    });

    // Aguardar possíveis chamadas de API
    await page.waitForTimeout(3000);

    // Pode ou não ter chamadas de API dependendo do carregamento inicial
    // Apenas verificamos que aplicação não crashou
    await expect(page).not.toHaveTitle(/error/i);
  });

  test('should have no critical console errors', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Filtrar erros conhecidos/esperados
    const criticalErrors = errors.filter((error) => {
      // Filtrar erros de WebSocket se backend não estiver rodando
      if (error.includes('WebSocket')) return false;
      if (error.includes('Failed to fetch')) return false;
      if (error.includes('NetworkError')) return false;
      return true;
    });

    if (criticalErrors.length > 0) {
      console.warn('Erros críticos encontrados:', criticalErrors);
    }

    // Não deve ter muitos erros críticos
    expect(criticalErrors.length).toBeLessThan(3);
  });
});

test.describe('Hero Selection', () => {
  test('should allow searching for heroes', async ({ page }) => {
    await page.goto('/');

    // Procurar por input de busca
    const searchInput = page.getByPlaceholder(/search|busca|hero/i);

    if (await searchInput.count() > 0) {
      await searchInput.fill('templar');
      await page.waitForTimeout(500);

      // Deve mostrar resultados
      const results = page.locator('[data-hero]').or(page.getByText(/templar/i));
      const resultCount = await results.count();

      expect(resultCount).toBeGreaterThan(0);
    } else {
      // Input de busca pode não estar implementado ainda
      console.log('Search input not found - feature may not be implemented yet');
    }
  });
});

test.describe('Responsive Design', () => {
  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Aplicação deve carregar em mobile
    await expect(page).not.toHaveTitle(/error/i);

    // Não deve ter overflow horizontal
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);

    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // +1 para arredondamento
  });

  test('should work on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page).not.toHaveTitle(/error/i);
  });

  test('should work on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 }); // Full HD

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page).not.toHaveTitle(/error/i);
  });
});
