<?php
/**
 * AI 會議記錄系統 - 資料庫與路徑設定
 */
define('DB_HOST', '127.0.0.1');
define('DB_PORT', '3306');
define('DB_NAME', 'ai_meetings');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_CHARSET', 'utf8mb4');

define('UPLOAD_DIR', __DIR__ . '/../uploads/');
define('SESSION_NAME', 'ai_meeting_sess');

function getPdo() {
  static $pdo = null;
  if ($pdo === null) {
    try {
      $dsn = 'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
      $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
      ]);
    } catch (PDOException $e) {
      http_response_code(500);
      echo json_encode(['success' => false, 'message' => '資料庫連線失敗']);
      exit;
    }
  }
  return $pdo;
}

function jsonResponse($data) {
  echo json_encode($data, JSON_UNESCAPED_UNICODE);
}
