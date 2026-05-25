<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../helpers/helpers.php';

$admin = requireAdminAuth();
$body = getRequestBody();
$childIdentifier = trim((string)($_GET['child_identifier'] ?? $_GET['child_id'] ?? $body['childId'] ?? $body['babyId'] ?? $body['registrationNumber'] ?? ''));

if ($childIdentifier === '') {
  respondError('Valid baby ID or registration number is required.', 400);
}

$confirmation = trim($body['confirmation'] ?? '');
$reason = trim($body['reason'] ?? '');

if ($confirmation !== 'DELETE') {
  respondError('Type DELETE to confirm record deletion.', 400);
}

$pdo = getDB();

function adminDeleteTableExists(PDO $pdo, string $table): bool {
  $stmt = $pdo->prepare("SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?");
  $stmt->execute([$table]);
  return ((int)($stmt->fetch()['count'] ?? 0)) > 0;
}

function adminDeleteColumnExists(PDO $pdo, string $table, string $column): bool {
  $stmt = $pdo->prepare("SELECT COUNT(*) AS count FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?");
  $stmt->execute([$table, $column]);
  return ((int)($stmt->fetch()['count'] ?? 0)) > 0;
}

function adminDeleteRowsByChild(PDO $pdo, string $table, array $candidateColumns, int $childId): int {
  if (!adminDeleteTableExists($pdo, $table)) return 0;

  $columns = array_values(array_filter($candidateColumns, fn($column) => adminDeleteColumnExists($pdo, $table, $column)));
  if (!$columns) return 0;

  $where = implode(' OR ', array_map(fn($column) => "`{$column}` = ?", $columns));
  $stmt = $pdo->prepare("DELETE FROM `{$table}` WHERE {$where}");
  $stmt->execute(array_fill(0, count($columns), $childId));
  return $stmt->rowCount();
}

function adminDeleteChildName(array $child): string {
  return trim(implode(' ', array_filter([
    $child['first_name'] ?? '',
    $child['middle_name'] ?? '',
    $child['last_name'] ?? ''
  ]))) ?: 'Selected baby record';
}

function adminDeleteLooksLikeSample(array $child): bool {
  $haystack = strtolower(implode(' ', array_filter([
    $child['registration_number'] ?? '',
    $child['first_name'] ?? '',
    $child['middle_name'] ?? '',
    $child['last_name'] ?? '',
    $child['guardian_name'] ?? '',
    $child['mother_name'] ?? '',
    $child['father_name'] ?? ''
  ])));

  return (bool)preg_match('/(^|[^a-z0-9])(test|sample|demo|dummy|trial)([^a-z0-9]|$)/i', $haystack);
}

function adminDeleteSafeFilePath(string $storedPath): ?string {
  if (!$storedPath) return null;
  if (str_contains($storedPath, '..')) return null;

  $projectRoot = realpath(__DIR__ . '/../..');
  if (!$projectRoot) return null;

  $candidate = $projectRoot . '/' . ltrim(str_replace('\\', '/', $storedPath), '/');
  $uploadRoot = realpath($projectRoot . '/uploads');
  $candidateDir = realpath(dirname($candidate));

  if (!$uploadRoot || !$candidateDir || !str_starts_with($candidateDir . '/', $uploadRoot . '/')) {
    return null;
  }

  return $candidate;
}

try {
  $pdo->beginTransaction();

  $child = null;

  if (ctype_digit($childIdentifier)) {
    $stmt = $pdo->prepare('SELECT * FROM children WHERE id = ? FOR UPDATE');
    $stmt->execute([(int)$childIdentifier]);
    $child = $stmt->fetch();
  }

  if (!$child && adminDeleteColumnExists($pdo, 'children', 'registration_number')) {
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

  $completedVaccinations = 0;
  if (adminDeleteTableExists($pdo, 'vaccinations') && adminDeleteColumnExists($pdo, 'vaccinations', 'child_id')) {
    $stmt = $pdo->prepare("\n      SELECT COUNT(*) AS count\n      FROM vaccinations\n      WHERE child_id = ?\n        AND (LOWER(COALESCE(status, 'completed')) IN ('completed', 'done', 'administered') OR status IS NULL OR status = '')\n    ");
    $stmt->execute([$childId]);
    $completedVaccinations = (int)($stmt->fetch()['count'] ?? 0);
  }

  $registrationStatus = strtolower(trim($child['registration_status'] ?? ''));
  $statusAllowsDelete = in_array($registrationStatus, ['pending', 'rejected'], true);
  $sampleRecord = adminDeleteLooksLikeSample($child);
  $noCompletedHistory = $completedVaccinations === 0;

  if (!$statusAllowsDelete && !$sampleRecord && !$noCompletedHistory) {
    $pdo->rollBack();
    respondError('This record is protected because it is approved and has completed vaccination history. Use archive instead of permanent delete for real health records.', 409);
  }

  $documentFiles = [];
  if (adminDeleteTableExists($pdo, 'documents') && adminDeleteColumnExists($pdo, 'documents', 'child_id')) {
    $selectColumns = ['id'];
    foreach (['file_path', 'filename'] as $column) {
      if (adminDeleteColumnExists($pdo, 'documents', $column)) $selectColumns[] = $column;
    }
    $stmt = $pdo->prepare('SELECT ' . implode(', ', array_map(fn($col) => "`{$col}`", $selectColumns)) . ' FROM documents WHERE child_id = ?');
    $stmt->execute([$childId]);
    foreach ($stmt->fetchAll() as $doc) {
      if (!empty($doc['file_path'])) {
        $safePath = adminDeleteSafeFilePath($doc['file_path']);
        if ($safePath) $documentFiles[] = $safePath;
      } elseif (!empty($doc['filename'])) {
        $safePath = adminDeleteSafeFilePath('uploads/' . basename($doc['filename']));
        if ($safePath) $documentFiles[] = $safePath;
      }
    }
  }

  $deletedRows = [];
  $relatedTables = [
    'notifications'      => ['child_id', 'baby_id'],
    'reminders'          => ['child_id', 'baby_id'],
    'vaccines_received'  => ['child_id', 'baby_id'],
    'test_history'       => ['child_id', 'baby_id'],
    'vaccinations'       => ['child_id', 'baby_id'],
    'schedules'          => ['child_id', 'baby_id'],
    'documents'          => ['child_id', 'baby_id'],
  ];

  foreach ($relatedTables as $table => $columns) {
    $deletedRows[$table] = adminDeleteRowsByChild($pdo, $table, $columns, $childId);
  }

  $stmt = $pdo->prepare('DELETE FROM children WHERE id = ?');
  $stmt->execute([$childId]);

  if ($stmt->rowCount() === 0) {
    throw new RuntimeException('Baby record could not be deleted.');
  }

  $pdo->commit();

  $deletedFiles = 0;
  foreach (array_unique($documentFiles) as $filePath) {
    if (is_file($filePath) && @unlink($filePath)) $deletedFiles++;
  }

  respond([
    'message' => 'Baby record deleted successfully',
    'id' => $childId,
    'babyName' => adminDeleteChildName($child),
    'reason' => $reason,
    'deletedRelatedRows' => $deletedRows,
    'deletedFiles' => $deletedFiles,
  ]);
} catch (Throwable $e) {
  if ($pdo->inTransaction()) $pdo->rollBack();
  respondError('Unable to delete baby record: ' . $e->getMessage(), 500);
}
