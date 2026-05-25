<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../helpers/helpers.php';

$admin = requireAdminAuth();
$pdo = getDB();
$generatedAt = date('Y-m-d H:i:s');
$today = date('Y-m-d');
$filename = 'vaxtrack-report-' . date('Ymd-His') . '.csv';

header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="' . $filename . '"');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Expose-Headers: Content-Disposition');

$out = fopen('php://output', 'w');

// UTF-8 BOM so Excel and spreadsheet apps read Filipino names/symbols correctly.
fputs($out, "\xEF\xBB\xBF");

$headers = [
  'Report Section',
  'Record ID',
  'Child ID',
  'Registration No.',
  'Baby Name',
  'DOB',
  'Sex',
  'Parent/Guardian',
  'Contact No.',
  'Address',
  'Registration Status',
  'Vaccine/Item',
  'Dose',
  'Date',
  'Target Date',
  'Status',
  'Batch/Lot',
  'Administered By',
  'Source/Clinic',
  'Document Type',
  'Document Filename',
  'Comment/Remarks',
  'Alert Type',
  'Generated At'
];

fputcsv($out, $headers);

function csvValue($value, $fallback = '') {
  if ($value === null || $value === '') return $fallback;
  if (is_bool($value)) return $value ? 'Yes' : 'No';
  return $value;
}

function childNameFromRow($row) {
  return trim(implode(' ', array_filter([
    $row['first_name'] ?? '',
    $row['middle_name'] ?? '',
    $row['last_name'] ?? ''
  ])));
}

function writeCsvRow($out, $section, $recordId, $childId, $registrationNo, $babyName, $dob, $sex, $guardianName, $guardianPhone, $guardianAddress, $registrationStatus, $item, $dose, $date, $targetDate, $status, $batch, $worker, $source, $documentType, $documentFilename, $remarks, $alertType, $generatedAt) {
  fputcsv($out, [
    $section,
    csvValue($recordId),
    csvValue($childId),
    csvValue($registrationNo),
    csvValue($babyName, 'Unnamed baby'),
    csvValue($dob),
    csvValue($sex),
    csvValue($guardianName),
    csvValue($guardianPhone),
    csvValue($guardianAddress),
    csvValue($registrationStatus),
    csvValue($item),
    csvValue($dose),
    csvValue($date),
    csvValue($targetDate),
    csvValue($status),
    csvValue($batch),
    csvValue($worker),
    csvValue($source),
    csvValue($documentType),
    csvValue($documentFilename),
    csvValue($remarks),
    csvValue($alertType),
    $generatedAt
  ]);
}

// 1. Baby masterlist rows.
$childrenStmt = $pdo->query("SELECT * FROM children ORDER BY id DESC");
$children = $childrenStmt->fetchAll();

foreach ($children as $child) {
  writeCsvRow(
    $out,
    'Baby Records',
    $child['id'] ?? '',
    $child['id'] ?? '',
    $child['registration_number'] ?? '',
    childNameFromRow($child),
    $child['dob'] ?? '',
    $child['sex'] ?? '',
    $child['guardian_name'] ?? '',
    $child['guardian_phone'] ?? '',
    $child['guardian_address'] ?? '',
    $child['registration_status'] ?? '',
    '', '', $child['created_at'] ?? '', '',
    $child['registration_status'] ?? '',
    '', '', '', '', '', '', '',
    $generatedAt
  );
}

// 2. Vaccination administration records.
$vaccinationStmt = $pdo->query("
  SELECT v.*, c.registration_number, c.first_name, c.middle_name, c.last_name,
         c.dob, c.sex, c.guardian_name, c.guardian_phone, c.guardian_address, c.registration_status
  FROM vaccinations v
  JOIN children c ON v.child_id = c.id
  ORDER BY v.date DESC, v.id DESC
");
$vaccinations = $vaccinationStmt->fetchAll();

foreach ($vaccinations as $row) {
  $source = !empty($row['private_clinic'])
    ? ($row['clinic_name'] ?? 'Private Clinic')
    : (($row['clinic_name'] ?? '') ?: 'Barangay Health Center');

  writeCsvRow(
    $out,
    'Vaccination Records',
    $row['id'] ?? '',
    $row['child_id'] ?? '',
    $row['registration_number'] ?? '',
    childNameFromRow($row),
    $row['dob'] ?? '',
    $row['sex'] ?? '',
    $row['guardian_name'] ?? '',
    $row['guardian_phone'] ?? '',
    $row['guardian_address'] ?? '',
    $row['registration_status'] ?? '',
    $row['vaccine'] ?? '',
    $row['dose'] ?? '',
    $row['date'] ?? '',
    '',
    $row['status'] ?? 'Completed',
    $row['batch'] ?? '',
    $row['worker'] ?? '',
    $source,
    '', '',
    $row['remarks'] ?? $row['reaction'] ?? '',
    '',
    $generatedAt
  );
}

// 3. Uploaded document statuses.
$documentStmt = $pdo->query("
  SELECT d.*, c.registration_number, c.first_name, c.middle_name, c.last_name,
         c.dob, c.sex, c.guardian_name, c.guardian_phone, c.guardian_address, c.registration_status
  FROM documents d
  JOIN children c ON d.child_id = c.id
  ORDER BY d.id DESC
");
$documents = $documentStmt->fetchAll();

foreach ($documents as $row) {
  writeCsvRow(
    $out,
    'Document Statuses',
    $row['id'] ?? '',
    $row['child_id'] ?? '',
    $row['registration_number'] ?? '',
    childNameFromRow($row),
    $row['dob'] ?? '',
    $row['sex'] ?? '',
    $row['guardian_name'] ?? '',
    $row['guardian_phone'] ?? '',
    $row['guardian_address'] ?? '',
    $row['registration_status'] ?? '',
    '', '',
    $row['created_at'] ?? '',
    '',
    $row['status'] ?? '',
    '', '', '',
    $row['type'] ?? '',
    $row['filename'] ?? '',
    $row['comment'] ?? '',
    '',
    $generatedAt
  );
}

// 4. Schedule records.
$scheduleStmt = $pdo->query("
  SELECT s.*, c.registration_number, c.first_name, c.middle_name, c.last_name,
         c.dob, c.sex, c.guardian_name, c.guardian_phone, c.guardian_address, c.registration_status
  FROM schedules s
  JOIN children c ON s.child_id = c.id
  ORDER BY s.target_date ASC, s.id ASC
");
$schedules = $scheduleStmt->fetchAll();

foreach ($schedules as $row) {
  writeCsvRow(
    $out,
    'Schedule Records',
    $row['id'] ?? '',
    $row['child_id'] ?? '',
    $row['registration_number'] ?? '',
    childNameFromRow($row),
    $row['dob'] ?? '',
    $row['sex'] ?? '',
    $row['guardian_name'] ?? '',
    $row['guardian_phone'] ?? '',
    $row['guardian_address'] ?? '',
    $row['registration_status'] ?? '',
    $row['vaccine'] ?? '',
    $row['dose'] ?? '',
    '',
    $row['target_date'] ?? '',
    $row['status'] ?? '',
    '', '', $row['source'] ?? '', '', '',
    $row['remarks'] ?? '',
    '',
    $generatedAt
  );
}

// 5. Medical/test history if present in the existing schema.
$testStmt = $pdo->query("
  SELECT t.*, c.registration_number, c.first_name, c.middle_name, c.last_name,
         c.dob, c.sex, c.guardian_name, c.guardian_phone, c.guardian_address, c.registration_status
  FROM test_history t
  JOIN children c ON t.child_id = c.id
  ORDER BY t.date DESC, t.id DESC
");
$tests = $testStmt->fetchAll();

foreach ($tests as $row) {
  writeCsvRow(
    $out,
    'Medical Test History',
    $row['id'] ?? '',
    $row['child_id'] ?? '',
    $row['registration_number'] ?? '',
    childNameFromRow($row),
    $row['dob'] ?? '',
    $row['sex'] ?? '',
    $row['guardian_name'] ?? '',
    $row['guardian_phone'] ?? '',
    $row['guardian_address'] ?? '',
    $row['registration_status'] ?? '',
    $row['test'] ?? $row['type'] ?? 'Medical test',
    '',
    $row['date'] ?? '',
    '',
    $row['status'] ?? '',
    '', '', '', '', '',
    $row['result'] ?? $row['remarks'] ?? '',
    '',
    $generatedAt
  );
}

// 6. Action alerts generated from existing schedule/document records only.
foreach ($schedules as $row) {
  $scheduleStatus = strtolower(trim($row['status'] ?? ''));
  $targetDate = $row['target_date'] ?? '';
  $isOverdue = $targetDate && $targetDate < $today && $scheduleStatus !== 'completed';
  $isActionRequired = in_array($scheduleStatus, ['overdue', 'missed', 'action required', 'rejected'], true);

  if (!$isOverdue && !$isActionRequired) continue;

  $alertStatus = $isOverdue ? 'Overdue' : ucwords($scheduleStatus);
  writeCsvRow(
    $out,
    'Alerts',
    $row['id'] ?? '',
    $row['child_id'] ?? '',
    $row['registration_number'] ?? '',
    childNameFromRow($row),
    $row['dob'] ?? '',
    $row['sex'] ?? '',
    $row['guardian_name'] ?? '',
    $row['guardian_phone'] ?? '',
    $row['guardian_address'] ?? '',
    $row['registration_status'] ?? '',
    $row['vaccine'] ?? 'Vaccination follow-up',
    $row['dose'] ?? '',
    '',
    $targetDate,
    $alertStatus,
    '', '', $row['source'] ?? '', '', '',
    $row['remarks'] ?? '',
    'Medical Alert',
    $generatedAt
  );
}

foreach ($documents as $row) {
  $docStatus = strtolower(trim($row['status'] ?? ''));
  $isDocumentAction = in_array($docStatus, ['pending', 'rejected', 're-upload requested', 'reupload requested'], true);
  if (!$isDocumentAction) continue;

  writeCsvRow(
    $out,
    'Alerts',
    $row['id'] ?? '',
    $row['child_id'] ?? '',
    $row['registration_number'] ?? '',
    childNameFromRow($row),
    $row['dob'] ?? '',
    $row['sex'] ?? '',
    $row['guardian_name'] ?? '',
    $row['guardian_phone'] ?? '',
    $row['guardian_address'] ?? '',
    $row['registration_status'] ?? '',
    '', '',
    $row['created_at'] ?? '',
    '',
    $row['status'] ?? '',
    '', '', '',
    $row['type'] ?? '',
    $row['filename'] ?? '',
    $row['comment'] ?? '',
    'Document Action Item',
    $generatedAt
  );
}

fclose($out);
exit;
