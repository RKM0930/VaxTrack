<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../helpers/helpers.php';

$body = getRequestBody();
$firstName = trim($body['firstName'] ?? '');
$lastName  = trim($body['lastName'] ?? '');
$email     = trim($body['email'] ?? '');
$password  = trim($body['password'] ?? '');
$confirm   = trim($body['confirmPassword'] ?? '');

if (!$firstName || !$lastName || !$email || !$password) {
  respondError('All fields are required');
}

if ($password !== $confirm) {
  respondError('Passwords do not match');
}

if (strlen($password) < 6) {
  respondError('Password must be at least 6 characters');
}

$pdo = getDB();

// Check if email already exists
$stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
$stmt->execute([$email]);
if ($stmt->fetch()) {
  respondError('Email already registered', 409);
}

$hashed = password_hash($password, PASSWORD_BCRYPT);
$stmt = $pdo->prepare("
  INSERT INTO users (first_name, last_name, email, password, role)
  VALUES (?, ?, ?, ?, 'parent')
");
$stmt->execute([$firstName, $lastName, $email, $hashed]);
$userId = $pdo->lastInsertId();
$token = base64_encode($userId);

respond([
  'token' => $token,
  'id'    => $userId,
  'name'  => $firstName . ' ' . $lastName,
  'email' => $email,
  'role'  => 'parent',
], 201);