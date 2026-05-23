<?php
function respond($data, $code = 200) {
  http_response_code($code);
  header('Content-Type: application/json');
  header('Access-Control-Allow-Origin: *');
  header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
  header('Access-Control-Allow-Headers: Content-Type, Authorization');
  echo json_encode($data);
  exit;
}

function respondError($message, $code = 400) {
  respond(['error' => $message], $code);
}

function getRequestBody() {
  return json_decode(file_get_contents('php://input'), true) ?? [];
}

function generateRegNumber() {
  return 'VAX-' . strtoupper(substr(md5(uniqid()), 0, 8));
}

function getBearerToken() {
  $headers = getallheaders();
  $auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';
  if (str_starts_with($auth, 'Bearer ')) {
    return substr($auth, 7);
  }
  return null;
}

function requireAuth() {
  $token = getBearerToken();
  if (!$token) respondError('Unauthorized', 401);

  $pdo = getDB();
  $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");

  // Decode simple token (user id encoded in base64)
  $userId = base64_decode($token);
  $stmt->execute([$userId]);
  $user = $stmt->fetch();

  if (!$user) respondError('Unauthorized', 401);
  return $user;
}

function requireAdminAuth() {
  $user = requireAuth();
  if ($user['role'] !== 'admin') respondError('Forbidden', 403);
  return $user;
}