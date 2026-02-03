<?php
/**
 * 測試資料庫連線 - 在瀏覽器開啟 api/test_db.php 檢查是否連線成功
 */
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/config.php';

try {
  $pdo = getPdo();
  $pdo->query('SELECT 1');
  echo json_encode([
    'success' => true,
    'message' => '資料庫連線成功',
    'database' => DB_NAME,
  ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
} catch (PDOException $e) {
  http_response_code(500);
  echo json_encode([
    'success' => false,
    'message' => '資料庫連線失敗',
    'error' => $e->getMessage(),
  ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
}
