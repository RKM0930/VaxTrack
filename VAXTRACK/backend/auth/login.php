<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../helpers/helpers.php';

$body = getRequestBody();
$email = trim($body['email'] ?? '');
$password = trim($body['password'] ?? '');

if (!$email || !$password) {
  respondError('Email and password are required');
}

$pdo = getDB();
$stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password'])) {
  respondError('Invalid email or password', 401);
}

// Simple token: base64 of user id
$token = base64_encode($user['id']);

respond([
  'token' => $token,
  'id'    => $user['id'],
  'name'  => $user['first_name'] . ' ' . $user['last_name'],
  'email' => $user['email'],
  'role'  => $user['role'],
]);