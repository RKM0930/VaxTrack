<?php
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/helpers/helpers.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(200);
  exit;
}

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/';

// Normalize the request path so API routes work whether the backend is served
// from the domain root, /backend, or through /index.php/path-style URLs.
// This prevents valid routes like /reports/export from falling into
// "Route not found" because of deployment-specific URL prefixes.
$scriptDir = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '')), '/');
if ($scriptDir && $scriptDir !== '/' && str_starts_with($path, $scriptDir)) {
  $path = substr($path, strlen($scriptDir)) ?: '/';
}
if (!empty($_SERVER['PATH_INFO']) && ($_SERVER['PATH_INFO'] !== '/')) {
  $path = $_SERVER['PATH_INFO'];
}

// Repeatedly strip common deployment prefixes so routes still match whether
// requests arrive as /api/admin/babies/1, /backend/index.php/api/admin/babies/1,
// or /index.php/admin/babies/1.
do {
  $previousPath = $path;
  $path = preg_replace('#^/backend#', '', $path);
  $path = preg_replace('#^/index\.php#', '', $path);
  $path = preg_replace('#^/api#', '', $path);
} while ($path !== $previousPath);

$path = '/' . trim($path, '/');
$method = $_SERVER['REQUEST_METHOD'];

// Auth routes
if ($path === '/auth/login' && $method === 'POST') {
  require __DIR__ . '/auth/login.php';

} elseif ($path === '/auth/register' && $method === 'POST') {
  require __DIR__ . '/auth/register.php';

// Baby routes
} elseif ($path === '/babies' && $method === 'GET') {
  require __DIR__ . '/babies/get.php';

} elseif ($path === '/babies' && $method === 'POST') {
  require __DIR__ . '/babies/create.php';

} elseif (preg_match('#^/(?:admin/)?(?:babies|children)/([^/]+)$#', $path, $m) && in_array($method, ['PATCH', 'PUT'], true)) {
  $_GET['child_identifier'] = rawurldecode($m[1]);
  require __DIR__ . '/babies/update.php';

} elseif (preg_match('#^/(?:admin/)?(?:babies|children)/([^/]+)/update$#', $path, $m) && in_array($method, ['PATCH', 'PUT', 'POST'], true)) {
  // Fallback alias for hosts/proxies that do not forward PATCH/PUT reliably.
  $_GET['child_identifier'] = rawurldecode($m[1]);
  require __DIR__ . '/babies/update.php';

} elseif (preg_match('#^/(?:admin/)?(?:babies|children)/([^/]+)$#', $path, $m) && $method === 'DELETE') {
  $_GET['child_identifier'] = rawurldecode($m[1]);
  require __DIR__ . '/babies/delete.php';

} elseif (preg_match('#^/(?:admin/)?(?:babies|children)/([^/]+)/delete$#', $path, $m) && in_array($method, ['DELETE', 'POST'], true)) {
  // Fallback alias for hosts/proxies that have difficulty forwarding DELETE
  // requests to clean URLs. The delete script still requires the typed
  // confirmation payload before it removes anything.
  $_GET['child_identifier'] = rawurldecode($m[1]);
  require __DIR__ . '/babies/delete.php';

// Vaccination routes
} elseif (preg_match('#^/babies/(\d+)/vaccinations$#', $path, $m) && $method === 'POST') {
  $_GET['child_id'] = $m[1];
  require __DIR__ . '/vaccinations/create.php';

// Document routes
} elseif (preg_match('#^/documents/(\d+)$#', $path, $m) && $method === 'PATCH') {
  $_GET['doc_id'] = $m[1];
  require __DIR__ . '/documents/update-status.php';

// Schedule routes
} elseif ($path === '/schedules' && $method === 'GET') {
  require __DIR__ . '/schedules/get.php';

// Dashboard stats
} elseif ($path === '/dashboard/stats' && $method === 'GET') {
  require __DIR__ . '/dashboard/stats.php';

// Admin report export
} elseif (in_array($path, ['/reports/export', '/admin/reports/export', '/dashboard/export'], true) && $method === 'GET') {
  require __DIR__ . '/reports/export.php';

} else {
  respondError('Route not found', 404);
}