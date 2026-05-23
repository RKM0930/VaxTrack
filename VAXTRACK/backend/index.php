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

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = preg_replace('#^/backend#', '', $path);
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

} else {
  respondError('Route not found', 404);
}