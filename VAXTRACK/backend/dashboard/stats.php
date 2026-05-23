<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../helpers/helpers.php';

$admin = requireAdminAuth();
$pdo = getDB();
$today = date('Y-m-d');
$monthStart = date('Y-m-01');
$weekEnd = date('Y-m-d', strtotime('+7 days'));

// Total registered children
$stmt = $pdo->query("SELECT COUNT(*) as count FROM children");
$totalBabies = $stmt->fetch()['count'];

// Vaccines given this month
$stmt = $pdo->prepare("
  SELECT COUNT(*) as count FROM vaccinations 
  WHERE date >= ? AND date <= ?
");
$stmt->execute([$monthStart, $today]);
$vaccinesMonth = $stmt->fetch()['count'];

// Upcoming in next 7 days
$stmt = $pdo->prepare("
  SELECT COUNT(*) as count FROM schedules 
  WHERE target_date BETWEEN ? AND ? AND status = 'Upcoming'
");
$stmt->execute([$today, $weekEnd]);
$upcomingWeek = $stmt->fetch()['count'];

// Overdue
$stmt = $pdo->prepare("
  SELECT COUNT(*) as count FROM schedules 
  WHERE target_date < ? AND status != 'Completed'
");
$stmt->execute([$today]);
$overdue = $stmt->fetch()['count'];

// Pending documents
$stmt = $pdo->query("
  SELECT COUNT(*) as count FROM documents WHERE status = 'Pending'
");
$pendingDocs = $stmt->fetch()['count'];

respond([
  'totalBabies'      => (int)$totalBabies,
  'vaccinesThisMonth'=> (int)$vaccinesMonth,
  'upcomingThisWeek' => (int)$upcomingWeek,
  'overdue'          => (int)$overdue,
  'pendingDocs'      => (int)$pendingDocs,
]);