<?php
/**
 * 會員登入 / 註冊 API
 */
header('Content-Type: application/json; charset=utf-8');
session_name(SESSION_NAME);
session_start();

require_once __DIR__ . '/config.php';

$action = $_GET['action'] ?? '';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  jsonResponse(['success' => false, 'message' => 'Method not allowed']);
  exit;
}

$input = json_decode(file_get_contents('php://input'), true) ?: [];

if ($action === 'login') {
  $email = trim($input['email'] ?? '');
  $password = $input['password'] ?? '';
  if (!$email || !$password) {
    jsonResponse(['success' => false, 'message' => '請輸入電子郵件與密碼']);
    exit;
  }
  try {
    $pdo = getPdo();
    $stmt = $pdo->prepare('SELECT id, name, email, password FROM users WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    $row = $stmt->fetch();
    if (!$row || !password_verify($password, $row['password'])) {
      jsonResponse(['success' => false, 'message' => '電子郵件或密碼錯誤']);
      exit;
    }
    $_SESSION['user_id'] = (int) $row['id'];
    $_SESSION['user_name'] = $row['name'];
    $_SESSION['user_email'] = $row['email'];
    jsonResponse([
      'success' => true,
      'user' => [
        'id' => (int) $row['id'],
        'name' => $row['name'],
        'email' => $row['email'],
      ],
    ]);
  } catch (PDOException $e) {
    jsonResponse(['success' => false, 'message' => '系統錯誤，請稍後再試']);
  }
  exit;
}

if ($action === 'register') {
  $name = trim($input['name'] ?? '');
  $email = trim($input['email'] ?? '');
  $password = $input['password'] ?? '';
  if (!$name || !$email || !$password) {
    jsonResponse(['success' => false, 'message' => '請填寫姓名、電子郵件與密碼']);
    exit;
  }
  if (strlen($password) < 6) {
    jsonResponse(['success' => false, 'message' => '密碼至少 6 碼']);
    exit;
  }
  try {
    $pdo = getPdo();
    $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
      jsonResponse(['success' => false, 'message' => '此電子郵件已被註冊']);
      exit;
    }
    $hash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $pdo->prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)');
    $stmt->execute([$name, $email, $hash]);
    $id = (int) $pdo->lastInsertId();
    $_SESSION['user_id'] = $id;
    $_SESSION['user_name'] = $name;
    $_SESSION['user_email'] = $email;
    jsonResponse([
      'success' => true,
      'user' => ['id' => $id, 'name' => $name, 'email' => $email],
    ]);
  } catch (PDOException $e) {
    jsonResponse(['success' => false, 'message' => '註冊失敗，請稍後再試']);
  }
  exit;
}

if ($action === 'logout') {
  $_SESSION = [];
  if (ini_get('session.use_cookies')) {
    $p = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
  }
  session_destroy();
  jsonResponse(['success' => true]);
  exit;
}

jsonResponse(['success' => false, 'message' => 'Invalid action']);
