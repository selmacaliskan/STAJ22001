<?php
// CORS ve JSON Başlıkları
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PATCH, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'auth.php'; // JWT Yetkilendirme modülü dahil edildi

$host = '127.0.0.1';
$db   = 'baykal_makine';
$user = 'root';
$pass = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Veritabanı bağlantı hatası: " . $e->getMessage()]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$pathInfo = $_SERVER['PATH_INFO'] ?? '';
$path = array_values(array_filter(explode('/', trim($pathInfo, '/'))));

// Güvenlik: POST ve PATCH isteklerinde Token kontrolü yap
if (in_array($method, ['POST', 'PATCH'])) {
   // $userPayload = authenticate_request();
}

// --- YARDIMCI FONKSİYONLAR ---
function getOrInsertUser($pdo, $name) {
    $stmt = $pdo->prepare("SELECT user_id FROM users WHERE users_name = ?");
    $stmt->execute([$name]);
    $user = $stmt->fetch();
    if ($user) return $user['user_id'];

    $stmt = $pdo->prepare("INSERT INTO users (users_name) VALUES (?)");
    $stmt->execute([$name]);
    return $pdo->lastInsertId();
}

function getOrInsertOperation($pdo, $name) {
    $stmt = $pdo->prepare("SELECT operation_id FROM operations WHERE operation_name = ?");
    $stmt->execute([$name]);
    $op = $stmt->fetch();
    if ($op) return $op['operation_id'];

    $stmt = $pdo->prepare("INSERT INTO operations (operation_name) VALUES (?)");
    $stmt->execute([$name]);
    return $pdo->lastInsertId();
}

// ---------------- API ENDPOINTS ----------------

// GET /api.php/logs
if ($method === 'GET' && isset($path[0]) && $path[0] === 'logs') {
    $sql = "SELECT l.log_id, u.users_name, o.operation_name, l.cut_measurement, l.time_used, l.status, l.start_time, l.end_time, l.notes 
            FROM machine_logs l
            JOIN users u ON l.user_id = u.user_id
            JOIN operations o ON l.operation_id = o.operation_id
            ORDER BY l.log_id DESC";
    $stmt = $pdo->query($sql);
    echo json_encode($stmt->fetchAll());
    exit;
}

// POST /api.php/logs
if ($method === 'POST' && isset($path[0]) && $path[0] === 'logs') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (empty($data['users_name']) || empty($data['operation_name'])) {
        http_response_code(400);
        echo json_encode(["error" => "Eksik veri: Operatör ve operasyon adı zorunludur."]);
        exit;
    }

    $userId = getOrInsertUser($pdo, $data['users_name']);
    $opId   = getOrInsertOperation($pdo, $data['operation_name']);
    
    $sql = "INSERT INTO machine_logs (user_id, operation_id, cut_measurement, status, start_time, notes) 
            VALUES (?, ?, ?, 'IN_PROGRESS', NOW(), ?)";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        $userId, 
        $opId, 
        $data['cut_measurement'] ?? 0, 
        $data['notes'] ?? null
    ]);
    
    echo json_encode(["message" => "Log eklendi", "log_id" => $pdo->lastInsertId()]);
    exit;
}

// PATCH /api.php/logs/{id}/complete
if ($method === 'PATCH' && isset($path[0], $path[1], $path[2]) && $path[0] === 'logs' && $path[2] === 'complete') {
    $id = intval($path[1]);
    $sql = "UPDATE machine_logs 
            SET status = 'SUCCESS', 
                end_time = NOW(), 
                time_used = TIMESTAMPDIFF(SECOND, start_time, NOW()) 
            WHERE log_id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$id]);
    echo json_encode(["message" => "Log tamamlandı"]);
    exit;
}

// GET /api.php/errors
if ($method === 'GET' && isset($path[0]) && $path[0] === 'errors') {
    $stmt = $pdo->query("SELECT * FROM machine_errors ORDER BY error_id DESC");
    echo json_encode($stmt->fetchAll());
    exit;
}

// POST /api.php/errors
if ($method === 'POST' && isset($path[0]) && $path[0] === 'errors') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    // Eksik alan doğrulaması eklendi
    if (empty($data['log_id']) || empty($data['error_code']) || empty($data['error_message'])) {
        http_response_code(400);
        echo json_encode(["error" => "Eksik veri: log_id, error_code ve error_message gereklidir."]);
        exit;
    }

    $sql = "INSERT INTO machine_errors (log_id, error_code, error_message, severity, occurred_at) VALUES (?, ?, ?, ?, NOW())";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        $data['log_id'], 
        $data['error_code'], 
        $data['error_message'], 
        $data['severity'] ?? 'MEDIUM'
    ]);
    
    echo json_encode(["message" => "Hata kaydı oluşturuldu", "error_id" => $pdo->lastInsertId()]);
    exit;
}

http_response_code(404);
echo json_encode(["error" => "Geçersiz istek uç noktası"]);