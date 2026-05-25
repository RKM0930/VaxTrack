<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../helpers/helpers.php';

$user = requireAuth();
$pdo = getDB();

function babyGetTableExists(PDO $pdo, string $table): bool {
  $stmt = $pdo->prepare("SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?");
  $stmt->execute([$table]);
  return ((int)($stmt->fetch()['count'] ?? 0)) > 0;
}

$hasEditAuditTable = babyGetTableExists($pdo, 'child_edit_audit');

// Admin gets all babies, parent gets only their own
if ($user['role'] === 'admin') {
  $stmt = $pdo->prepare("SELECT * FROM children ORDER BY created_at DESC");
  $stmt->execute();
} else {
  $stmt = $pdo->prepare("SELECT * FROM children WHERE user_id = ? ORDER BY created_at DESC");
  $stmt->execute([$user['id']]);
}

$children = $stmt->fetchAll();

// Attach documents, vaccinations, schedules for each child
foreach ($children as &$child) {
  $id = $child['id'];

  $stmt = $pdo->prepare("SELECT * FROM documents WHERE child_id = ?");
  $stmt->execute([$id]);
  $child['documents'] = $stmt->fetchAll();

  $stmt = $pdo->prepare("SELECT * FROM vaccinations WHERE child_id = ? ORDER BY date DESC");
  $stmt->execute([$id]);
  $child['vaccinations'] = $stmt->fetchAll();

  $stmt = $pdo->prepare("SELECT * FROM schedules WHERE child_id = ? ORDER BY target_date ASC");
  $stmt->execute([$id]);
  $child['upcoming'] = $stmt->fetchAll();

  $stmt = $pdo->prepare("SELECT * FROM test_history WHERE child_id = ? ORDER BY date DESC");
  $stmt->execute([$id]);
  $child['testHistory'] = $stmt->fetchAll();

  if ($hasEditAuditTable) {
    $stmt = $pdo->prepare("SELECT edited_by, edited_at, reason, fields_changed FROM child_edit_audit WHERE child_id = ? ORDER BY edited_at DESC, id DESC LIMIT 1");
    $stmt->execute([$id]);
    $latestEdit = $stmt->fetch();
    if ($latestEdit) {
      $child['lastEdit'] = $latestEdit;
      $child['updatedAt'] = $latestEdit['edited_at'] ?? null;
      $child['updateReason'] = $latestEdit['reason'] ?? null;
      $child['updatedBy'] = $latestEdit['edited_by'] ?? null;
    }
  }

  // Format for frontend
  $child['name'] = implode(' ', array_filter([$child['first_name'] ?? '', $child['middle_name'] ?? '', $child['last_name'] ?? '']));
  $child['registrationNumber'] = $child['registration_number'];
  $child['registrationStatus'] = $child['registration_status'];
  $child['guardianAddress'] = $child['guardian_address'];
  $child['guardianPhone'] = $child['guardian_phone'];
  $child['guardianName'] = $child['guardian_name'];
  $child['motherName'] = $child['mother_name'];
  $child['fatherName'] = $child['father_name'];
  $child['placeOfBirth'] = $child['place_of_birth'];
  $child['birthWeight'] = $child['birth_weight'];
  $child['bloodType'] = $child['blood_type'];
  $child['privateClinic'] = (bool)$child['private_clinic'];
  $child['privateClinicName'] = $child['private_clinic_name'];
}

respond($children);