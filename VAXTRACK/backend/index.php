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

function normalizeRoutePath($rawPath) {
  $path = parse_url($rawPath ?: '/', PHP_URL_PATH) ?: '/';
  $path = rawurldecode($path);
  $path = preg_replace('#/+#', '/', $path);

  $scriptName = str_replace('\\', '/', $_SERVER['SCRIPT_NAME'] ?? '');
  $scriptDir = rtrim(dirname($scriptName), '/');

  // Only strip the actual index.php script directory. Some PHP hosts report
  // SCRIPT_NAME as the requested API route, so stripping dirname(SCRIPT_NAME)
  // unconditionally can corrupt valid routes like /auth/login into /login.
  if (basename($scriptName) === 'index.php' && $scriptDir && $scriptDir !== '/' && str_starts_with($path, $scriptDir . '/')) {
    $path = substr($path, strlen($scriptDir)) ?: '/';
  }

  // Support index.php/path-style URLs and common deployment prefixes. Prefixes
  // are stripped only as complete path segments, not from arbitrary words.
  do {
    $previousPath = $path;
    $path = preg_replace('#^/index\.php(?=/|$)#', '', $path);
    $path = preg_replace('#^/backend(?=/|$)#', '', $path);
    $path = preg_replace('#^/api(?=/|$)#', '', $path);
    $path = $path ?: '/';
  } while ($path !== $previousPath);

  return '/' . trim($path, '/');
}

$routeCandidates = [];
foreach ([
  $_SERVER['REQUEST_URI'] ?? '/',
  $_SERVER['PATH_INFO'] ?? '',
  $_SERVER['ORIG_PATH_INFO'] ?? '',
  $_SERVER['REDIRECT_URL'] ?? '',
] as $candidate) {
  if ($candidate === '') continue;
  $normalizedCandidate = normalizeRoutePath($candidate);
  if (!in_array($normalizedCandidate, $routeCandidates, true)) {
    $routeCandidates[] = $normalizedCandidate;
  }
}

$path = $routeCandidates[0] ?? '/';
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