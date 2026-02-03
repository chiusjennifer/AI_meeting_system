<?php
/**
 * 會議紀錄 API - 列表、儲存、取得單筆
 */
header('Content-Type: application/json; charset=utf-8');
session_name(SESSION_NAME);
session_start();

require_once __DIR__ . '/config.php';

$userId = $_SESSION['user_id'] ?? null;
if (!$userId) {
  http_response_code(401);
  jsonResponse(['success' => false, 'message' => '請先登入']);
  exit;
}

$method = $_SERVER['REQUEST_METHOD'];

try {
  $pdo = getPdo();

  if ($method === 'GET') {
    // 取得當前使用者的會議紀錄列表
    $stmt = $pdo->prepare('SELECT id, title, created_at, transcript, summary FROM meetings WHERE user_id = ? ORDER BY created_at DESC');
    $stmt->execute([$userId]);
    $rows = $stmt->fetchAll();
    $list = array_map(function ($r) {
      return [
        'id' => (int) $r['id'],
        'title' => $r['title'],
        'date' => date('Y/n/j H:i', strtotime($r['created_at'])),
        'transcript' => $r['transcript'],
        'summary' => $r['summary'] ? json_decode($r['summary'], true) : null,
      ];
    }, $rows);
    jsonResponse(['success' => true, 'list' => $list]);
    exit;
  }

  if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $title = trim($input['title'] ?? '會議紀錄');
    $transcript = $input['transcript'] ?? '';
    $summary = isset($input['summary']) ? json_encode($input['summary'], JSON_UNESCAPED_UNICODE) : null;
    $stmt = $pdo->prepare('INSERT INTO meetings (user_id, title, transcript, summary) VALUES (?, ?, ?, ?)');
    $stmt->execute([$userId, $title, $transcript, $summary]);
    $id = (int) $pdo->lastInsertId();
    jsonResponse(['success' => true, 'id' => $id]);
    exit;
  }
} catch (PDOException $e) {
  http_response_code(500);
  jsonResponse(['success' => false, 'message' => '系統錯誤']);
}
