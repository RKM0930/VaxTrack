<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../helpers/helpers.php';

$user = requireAuth();
$body = getRequestBody();

// Validate required fields
$firstName = trim($body['firstName'] ?? '');
$lastName  = trim($body['lastName'] ?? '');
$middleName = trim($body['middleName'] ?? '');
$dob       = trim($body['dob'] ?? '');
$sex       = trim($body['sex'] ?? '');

if (!$firstName || !$lastName || !$dob || !$sex) {
  respondError('Required fields are missing');
}

$pdo = getDB();

// Generate unique registration number
$regNumber = generateRegNumber();

// Insert child record
$stmt = $pdo->prepare("
  INSERT INTO children (
    user_id, registration_number, first_name, middle_name, last_name,
    dob, sex, place_of_birth, birth_weight, blood_type,
    mother_name, father_name, guardian_name, guardian_phone,
    guardian_address, private_clinic, private_clinic_name,
    registration_status
  ) VALUES (
    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending'
  )
");

$stmt->execute([
  $user['id'],
  $regNumber,
  $firstName,
  $middleName,
  $lastName,
  $dob,
  $sex,
  trim($body['placeOfBirth'] ?? ''),
  trim($body['birthWeight'] ?? ''),
  trim($body['bloodType'] ?? ''),
  trim($body['motherName'] ?? ''),
  trim($body['fatherName'] ?? ''),
  trim($body['guardianName'] ?? ''),
  trim($body['guardianPhone'] ?? ''),
  trim($body['guardianAddress'] ?? ''),
  isset($body['privateClinic']) ? 1 : 0,
  trim($body['privateClinicName'] ?? ''),
]);

$childId = $pdo->lastInsertId();
$documentId = null;
$documentUploadDate = date('Y-m-d');

// Handle document upload
if (!empty($body['documentDataUrl'])) {
  $uploadDir = __DIR__ . '/../../uploads/';
  if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);

  $dataUrl = $body['documentDataUrl'];
  $parts = explode(',', $dataUrl);
  $fileData = base64_decode($parts[1] ?? '');
  $mimeType = $body['documentMimeType'] ?? 'application/pdf';
  $ext = $mimeType === 'application/pdf' ? 'pdf' : (str_contains($mimeType, 'png') ? 'png' : 'jpg');
  $filename = $regNumber . '_birthcert.' . $ext;
  $filePath = $uploadDir . $filename;

  file_put_contents($filePath, $fileData);

  $stmt = $pdo->prepare("
    INSERT INTO documents (child_id, type, filename, file_path, mime_type, status)
    VALUES (?, 'Birth Certificate', ?, ?, ?, 'Pending')
  ");
  $stmt->execute([$childId, $filename, 'uploads/' . $filename, $mimeType]);
  $documentId = $pdo->lastInsertId();
}

// Auto-generate DOH vaccine schedules
$dohSchedule = [
  ['BCG', 0],
  ['Hepatitis B', 0],
  ['Penta 1', 42],
  ['OPV 1', 42],
  ['Penta 2', 70],
  ['OPV 2', 70],
  ['Penta 3', 98],
  ['OPV 3', 98],
  ['IPV', 98],
  ['MCV 1', 270],
  ['MCV 2', 365],
];

$dob = new DateTime($dob);
foreach ($dohSchedule as [$vaccine, $daysAfterBirth]) {
  $targetDate = clone $dob;
  $targetDate->modify("+{$daysAfterBirth} days");
  $stmt = $pdo->prepare("
    INSERT INTO schedules (child_id, vaccine, target_date, status)
    VALUES (?, ?, ?, 'Upcoming')
  ");
  $stmt->execute([$childId, $vaccine, $targetDate->format('Y-m-d')]);
}

// Create vaccines_received record
$stmt = $pdo->prepare("INSERT INTO vaccines_received (child_id) VALUES (?)");
$stmt->execute([$childId]);

respond([
  'id'                 => $childId,
  'userId'             => $user['id'],
  'registrationNumber' => $regNumber,
  'registrationStatus' => 'Pending',
  'status'             => 'Pending',
  'documentId'         => $documentId,
  'documentStatus'     => 'Pending',
  'uploadDate'         => $documentUploadDate,
  'message'            => 'Baby registered successfully'
], 201);