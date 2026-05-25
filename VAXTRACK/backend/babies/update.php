<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../helpers/helpers.php';

$admin = requireAdminAuth();
$body = getRequestBody();
$childIdentifier = trim((string)($_GET['child_identifier'] ?? $_GET['child_id'] ?? $body['childId'] ?? $body['babyId'] ?? $body['id'] ?? $body['registrationNumber'] ?? ''));

if ($childIdentifier === '') {
  respondError('Valid baby ID or registration number is required.', 400);
}

$reason = trim((string)($body['reason'] ?? $body['updateReason'] ?? ''));
if ($reason === '') {
  respondError('Edit reason/comment is required.', 400);
}

$pdo = getDB();

function adminEditTableExists(PDO $pdo, string $table): bool {
  $stmt = $pdo->prepare("SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?");
  $stmt->execute([$table]);
  return ((int)($stmt->fetch()['count'] ?? 0)) > 0;
}

function adminEditColumnExists(PDO $pdo, string $table, string $column): bool {
  $stmt = $pdo->prepare("SELECT COUNT(*) AS count FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?");
  $stmt->execute([$table, $column]);
  return ((int)($stmt->fetch()['count'] ?? 0)) > 0;
}

function adminEditNormalizeValue($value) {
  if (is_bool($value)) return $value ? '1' : '0';
  if ($value === null) return '';
  return trim((string)$value);
}

function adminEditCleanDate(?string $value): string {
  $value = trim((string)$value);
  if ($value === '') return '';
  $timestamp = strtotime($value);
  if ($timestamp === false) return $value;
  return date('Y-m-d', $timestamp);
}

function adminEditFormatName(array $child): string {
  return trim(implode(' ', array_filter([
    $child['first_name'] ?? '',
    $child['middle_name'] ?? '',
    $child['last_name'] ?? ''
  ]))) ?: 'Baby record';
}

function adminEditEnsureAuditTable(PDO $pdo): bool {
  try {
    $pdo->exec("\n      CREATE TABLE IF NOT EXISTS child_edit_audit (\n        id INT AUTO_INCREMENT PRIMARY KEY,\n        child_id INT NOT NULL,\n        edited_by INT NULL,\n        edited_at DATETIME NOT NULL,\n        reason TEXT NULL,\n        fields_changed TEXT NULL,\n        INDEX idx_child_edit_audit_child_id (child_id)\n      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4\n    ");
    return true;
  } catch (Throwable $e) {
    error_log('Unable to ensure child_edit_audit table: ' . $e->getMessage());
    return false;
  }
}

$canWriteAudit = adminEditEnsureAuditTable($pdo);

try {
  $pdo->beginTransaction();

  $child = null;
  if (ctype_digit($childIdentifier)) {
    $stmt = $pdo->prepare('SELECT * FROM children WHERE id = ? FOR UPDATE');
    $stmt->execute([(int)$childIdentifier]);
    $child = $stmt->fetch();
  }

  if (!$child && adminEditColumnExists($pdo, 'children', 'registration_number')) {
    $stmt = $pdo->prepare('SELECT * FROM children WHERE registration_number = ? FOR UPDATE');
    $stmt->execute([$childIdentifier]);
    $child = $stmt->fetch();
  }

  if (!$child) {
    $pdo->rollBack();
    respondError('Baby record not found for the provided ID or registration number.', 404);
  }

  $childId = (int)$child['id'];
  if ($childId <= 0) {
    $pdo->rollBack();
    respondError('Selected baby record has an invalid database ID.', 400);
  }

  $fieldMap = [
    'firstName'         => ['column' => 'first_name',          'label' => 'Baby first name',        'required' => true],
    'middleName'        => ['column' => 'middle_name',         'label' => 'Baby middle name',       'required' => false],
    'lastName'          => ['column' => 'last_name',           'label' => 'Baby last name',         'required' => true],
    'dob'               => ['column' => 'dob',                 'label' => 'Date of birth',         'required' => true, 'type' => 'date'],
    'sex'               => ['column' => 'sex',                 'label' => 'Sex',                   'required' => true],
    'placeOfBirth'      => ['column' => 'place_of_birth',      'label' => 'Place of birth',        'required' => false],
    'birthWeight'       => ['column' => 'birth_weight',        'label' => 'Birth weight',          'required' => false],
    'bloodType'         => ['column' => 'blood_type',          'label' => 'Blood type',            'required' => false],
    'motherName'        => ['column' => 'mother_name',         'label' => 'Mother name',           'required' => false],
    'fatherName'        => ['column' => 'father_name',         'label' => 'Father name',           'required' => false],
    'guardianName'      => ['column' => 'guardian_name',       'label' => 'Parent/guardian name',  'required' => false],
    'guardianPhone'     => ['column' => 'guardian_phone',      'label' => 'Contact number',        'required' => false],
    'guardianAddress'   => ['column' => 'guardian_address',    'label' => 'Address',               'required' => false],
    'privateClinic'     => ['column' => 'private_clinic',      'label' => 'Private clinic record', 'required' => false, 'type' => 'boolean'],
    'privateClinicName' => ['column' => 'private_clinic_name', 'label' => 'Private clinic name',   'required' => false],
  ];

  $updates = [];
  $values = [];
  $changedFields = [];

  foreach ($fieldMap as $payloadKey => $meta) {
    $column = $meta['column'];
    if (!adminEditColumnExists($pdo, 'children', $column)) continue;

    $submitted = array_key_exists($payloadKey, $body);
    if (!$submitted) continue;

    $newValue = $body[$payloadKey];
    if (($meta['type'] ?? '') === 'boolean') {
      $newValue = filter_var($newValue, FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
    } elseif (($meta['type'] ?? '') === 'date') {
      $newValue = adminEditCleanDate((string)$newValue);
    } else {
      $newValue = trim((string)$newValue);
    }

    if (!empty($meta['required']) && adminEditNormalizeValue($newValue) === '') {
      $pdo->rollBack();
      respondError($meta['label'] . ' is required.', 400);
    }

    if (($meta['type'] ?? '') === 'date' && adminEditNormalizeValue($newValue) !== '' && strtotime((string)$newValue) === false) {
      $pdo->rollBack();
      respondError('Date of birth is invalid.', 400);
    }

    $oldValue = $child[$column] ?? '';
    if (adminEditNormalizeValue($oldValue) !== adminEditNormalizeValue($newValue)) {
      $updates[] = "`{$column}` = ?";
      $values[] = $newValue;
      $changedFields[] = [
        'field' => $payloadKey,
        'label' => $meta['label'],
        'oldValue' => $oldValue,
        'newValue' => $newValue,
      ];
    }
  }

  if (!$changedFields) {
    $pdo->commit();
    respond([
      'message' => 'No changes were made to the baby record.',
      'id' => $childId,
      'changedFields' => [],
    ]);
  }

  $now = date('Y-m-d H:i:s');
  $optionalMetaColumns = [
    'updated_at' => $now,
    'last_updated' => $now,
    'updated_by' => $admin['id'] ?? null,
    'last_updated_by' => $admin['id'] ?? null,
    'update_reason' => $reason,
    'last_update_reason' => $reason,
  ];

  foreach ($optionalMetaColumns as $column => $value) {
    if (adminEditColumnExists($pdo, 'children', $column)) {
      $updates[] = "`{$column}` = ?";
      $values[] = $value;
    }
  }

  $values[] = $childId;
  $stmt = $pdo->prepare('UPDATE children SET ' . implode(', ', $updates) . ' WHERE id = ?');
  $stmt->execute($values);

  $auditStored = false;
  if ($canWriteAudit) {
    try {
      $stmt = $pdo->prepare("\n        INSERT INTO child_edit_audit (child_id, edited_by, edited_at, reason, fields_changed)\n        VALUES (?, ?, ?, ?, ?)\n      ");
      $stmt->execute([
        $childId,
        $admin['id'] ?? null,
        $now,
        $reason,
        json_encode($changedFields, JSON_UNESCAPED_UNICODE),
      ]);
      $auditStored = true;
    } catch (Throwable $e) {
      error_log('Unable to write child edit audit row: ' . $e->getMessage());
    }
  }

  $stmt = $pdo->prepare('SELECT * FROM children WHERE id = ?');
  $stmt->execute([$childId]);
  $updatedChild = $stmt->fetch() ?: [];

  $pdo->commit();

  respond([
    'message' => 'Baby record updated successfully',
    'id' => $childId,
    'registrationNumber' => $updatedChild['registration_number'] ?? ($child['registration_number'] ?? ''),
    'babyName' => adminEditFormatName($updatedChild ?: $child),
    'editedAt' => $now,
    'editedBy' => $admin['name'] ?? $admin['email'] ?? $admin['id'] ?? 'Admin',
    'reason' => $reason,
    'changedFields' => $changedFields,
    'auditStored' => $auditStored,
  ]);
} catch (Throwable $e) {
  if ($pdo->inTransaction()) $pdo->rollBack();
  respondError('Unable to update baby record: ' . $e->getMessage(), 500);
}
