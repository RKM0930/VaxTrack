<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../helpers/helpers.php';

$admin = requireAdminAuth();
$body = getRequestBody();
$docId = $_GET['doc_id'] ?? null;

if (!$docId) {
  respondError('Document ID is required');
}

$newStatus = trim($body['status'] ?? '');
$comment   = trim($body['comment'] ?? '');

if (!in_array($newStatus, ['Approved', 'Rejected'])) {
  respondError('Invalid status');
}

if ($newStatus === 'Rejected' && !$comment) {
  respondError('Comment is required when rejecting a document');
}

$pdo = getDB();

// Update document status
$stmt = $pdo->prepare("
  UPDATE documents SET status = ?, comment = ? WHERE id = ?
");
$stmt->execute([$newStatus, $comment, $docId]);

if ($stmt->rowCount() === 0) {
  respondError('Document not found', 404);
}

// If approved, update child registration status
if ($newStatus === 'Approved') {
  $stmt = $pdo->prepare("
    SELECT child_id FROM documents WHERE id = ?
  ");
  $stmt->execute([$docId]);
  $doc = $stmt->fetch();

  if ($doc) {
    $stmt = $pdo->prepare("
      UPDATE children SET registration_status = 'Approved' WHERE id = ?
    ");
    $stmt->execute([$doc['child_id']]);
  }
}

// If rejected, update child registration status too
if ($newStatus === 'Rejected') {
  $stmt = $pdo->prepare("
    SELECT child_id FROM documents WHERE id = ?
  ");
  $stmt->execute([$docId]);
  $doc = $stmt->fetch();

  if ($doc) {
    $stmt = $pdo->prepare("
      UPDATE children SET registration_status = 'Rejected' WHERE id = ?
    ");
    $stmt->execute([$doc['child_id']]);
  }
}

respond([
  'message' => 'Document status updated successfully',
  'status'  => $newStatus
]);