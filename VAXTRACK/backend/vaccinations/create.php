<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../helpers/helpers.php';

$admin = requireAdminAuth();
$body = getRequestBody();
$childId = $_GET['child_id'] ?? null;

if (!$childId) {
  respondError('Child ID is required');
}

$vaccine = trim($body['vaccine'] ?? '');
$date    = trim($body['date'] ?? '');
$dose    = intval($body['dose'] ?? 1);

if (!$vaccine || !$date) {
  respondError('Vaccine name and date are required');
}

$pdo = getDB();

// Insert vaccination record
$stmt = $pdo->prepare("
  INSERT INTO vaccinations (
    child_id, vaccine, date, dose, batch,
    worker, private_clinic, clinic_name, status
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Completed')
");

$isPrivate = isset($body['privateClinic']) && $body['privateClinic'] ? 1 : 0;

$stmt->execute([
  $childId,
  $vaccine,
  $date,
  $dose,
  trim($body['batch'] ?? ''),
  trim($body['worker'] ?? ''),
  $isPrivate,
  trim($body['clinicName'] ?? ''),
]);

$vaccinationId = $pdo->lastInsertId();

// Update schedule status to Completed if vaccine matches
$stmt = $pdo->prepare("
  UPDATE schedules 
  SET status = 'Completed' 
  WHERE child_id = ? 
  AND LOWER(vaccine) = LOWER(?) 
  AND status != 'Completed'
  ORDER BY target_date ASC
  LIMIT 1
");
$stmt->execute([$childId, $vaccine]);

// Update vaccines_received table
$vaccineColumn = null;
$vaccineMap = [
  'bcg'    => 'bcg_date',
  'penta 3' => 'penta3_date',
  'opv 3'  => 'opv3_date',
  'mcv 1'  => 'mcv1_date',
  'mcv 2'  => 'mcv2_date',
];

$vaccineLower = strtolower($vaccine);
foreach ($vaccineMap as $key => $column) {
  if (str_contains($vaccineLower, $key)) {
    $vaccineColumn = $column;
    break;
  }
}

if ($vaccineColumn) {
  $stmt = $pdo->prepare("
    UPDATE vaccines_received SET {$vaccineColumn} = ? WHERE child_id = ?
  ");
  $stmt->execute([$date, $childId]);
}

respond([
  'id'      => $vaccinationId,
  'message' => 'Vaccination record saved successfully'
], 201);