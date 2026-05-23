<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../helpers/helpers.php';

$user = requireAuth();
$pdo = getDB();

$today = date('Y-m-d');

// Auto-update overdue schedules
$pdo->prepare("
  UPDATE schedules 
  SET status = 'Overdue' 
  WHERE target_date < ? AND status = 'Upcoming'
")->execute([$today]);

if ($user['role'] === 'admin') {
  $stmt = $pdo->prepare("
    SELECT s.*, c.first_name, c.last_name, c.registration_number
    FROM schedules s
    JOIN children c ON s.child_id = c.id
    ORDER BY s.target_date ASC
  ");
  $stmt->execute();
} else {
  $stmt = $pdo->prepare("
    SELECT s.*, c.first_name, c.last_name, c.registration_number
    FROM schedules s
    JOIN children c ON s.child_id = c.id
    WHERE c.user_id = ?
    ORDER BY s.target_date ASC
  ");
  $stmt->execute([$user['id']]);
}

$schedules = $stmt->fetchAll();
respond($schedules);