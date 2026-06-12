import { test, expect } from '@playwright/test';

const AUTH_URL = process.env.VITE_AUTH_URL || 'http://localhost:4001';
const GAME_URL = process.env.VITE_GAME_URL || 'http://localhost:4002';
const RANKING_URL = process.env.VITE_RANKING_URL || 'http://localhost:4005';
const MARKET_URL = process.env.VITE_MARKETPLACE_URL || 'http://localhost:4004';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

test.describe('Health checks', () => {
  test('auth-service health', async ({ request }) => {
    const res = await request.get(`${AUTH_URL}/health`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.service).toBe('auth');
  });

  test('game-service health', async ({ request }) => {
    const res = await request.get(`${GAME_URL}/health`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.service).toBe('game');
  });

  test('ranking-service health', async ({ request }) => {
    const res = await request.get(`${RANKING_URL}/health`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.service).toBe('ranking');
  });

  test('marketplace-service health', async ({ request }) => {
    const res = await request.get(`${MARKET_URL}/health`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.service).toBe('marketplace');
  });
});

test.describe('Auth flow', () => {
  const testUser = { username: `test_${Date.now()}`, email: `test_${Date.now()}@test.com`, password: 'test1234' };

  test('register new user', async ({ request }) => {
    const res = await request.post(`${AUTH_URL}/auth/register`, {
      data: testUser,
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.token).toBeDefined();
    expect(body.user.username).toBe(testUser.username);
  });

  test('login with registered user', async ({ request }) => {
    await request.post(`${AUTH_URL}/auth/register`, { data: testUser });
    const res = await request.post(`${AUTH_URL}/auth/login`, {
      data: { email: testUser.email, password: testUser.password },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.token).toBeDefined();
  });

  test('login with wrong password returns 401', async ({ request }) => {
    await request.post(`${AUTH_URL}/auth/register`, { data: testUser });
    const res = await request.post(`${AUTH_URL}/auth/login`, {
      data: { email: testUser.email, password: 'wrong' },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe('Game API', () => {
  let token = '';

  test.beforeAll(async ({ request }) => {
    const user = { username: `gameuser_${Date.now()}`, email: `gameuser_${Date.now()}@test.com`, password: 'test1234' };
    const res = await request.post(`${AUTH_URL}/auth/register`, { data: user });
    const body = await res.json();
    token = body.token;
  });

  test('create vs AI game', async ({ request }) => {
    const res = await request.post(`${GAME_URL}/game`, {
      data: { vsAi: true },
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.gameId).toBeDefined();
  });

  test('create game without token returns 401', async ({ request }) => {
    const res = await request.post(`${GAME_URL}/game`, {
      data: { vsAi: true },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe('Ranking API', () => {
  test('ranking endpoint returns array', async ({ request }) => {
    const res = await request.get(`${RANKING_URL}/ranking?limit=5`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body.ranking)).toBeTruthy();
  });
});

test.describe('Frontend', () => {
  test('login page loads', async ({ page }) => {
    await page.goto(FRONTEND_URL + '/login');
    await expect(page.locator('h1')).toContainText('INICIAR SESIÓN');
  });

  test('redirects to login when not authenticated', async ({ page }) => {
    await page.goto(FRONTEND_URL + '/');
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Gameplay E2E', () => {
  const testUser = { username: `gameplay_${Date.now()}`, email: `gameplay_${Date.now()}@test.com`, password: 'test1234' };
  let token = '';
  let userJson = '';
  let gameId = '';

  test.beforeAll(async ({ request }) => {
    const reg = await request.post(`${AUTH_URL}/auth/register`, { data: testUser });
    expect(reg.ok()).toBeTruthy();
    const body = await reg.json();
    token = body.token;
    userJson = JSON.stringify(body.user);

    const create = await request.post(`${GAME_URL}/game`, {
      data: { vsAi: true },
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(create.ok()).toBeTruthy();
    const game = await create.json();
    gameId = game.gameId;
    expect(gameId).toBeDefined();
  });

  test('loads game page and shows board', async ({ page }) => {
    await page.goto(FRONTEND_URL + '/login');
    await page.evaluate(({ t, u }) => {
      localStorage.setItem('auth_token', t);
      localStorage.setItem('auth_user', u);
    }, { t: token, u: userJson });
    await page.goto(FRONTEND_URL + '/game/' + gameId);
    await expect(page.locator('.board')).toBeVisible({ timeout: 15000 });
    const squares = page.locator('button.board-square');
    await expect(squares).toHaveCount(64);
  });

  test('make a move vs AI and board updates', async ({ page }) => {
    await page.goto(FRONTEND_URL + '/login');
    await page.evaluate(({ t, u }) => {
      localStorage.setItem('auth_token', t);
      localStorage.setItem('auth_user', u);
    }, { t: token, u: userJson });
    await page.goto(FRONTEND_URL + '/game/' + gameId);
    await expect(page.locator('.board')).toBeVisible({ timeout: 15000 });

    const squares = page.locator('button.board-square');
    const fromIdx = 5 * 8 + 0;
    const toIdx = 4 * 8 + 1;

    await squares.nth(fromIdx).click();
    await expect(squares.nth(toIdx)).toHaveClass(/board-target/);
    await squares.nth(toIdx).click();

    await page.waitForTimeout(3000);
    const fromPiece = await squares.nth(fromIdx).locator('.board-piece').count();
    expect(fromPiece).toBe(0);
  });
});
