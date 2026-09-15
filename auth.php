<?php
// auth.php - JWT Oluşturma ve Doğrulama Yardımcı Fonksiyonları

define('JWT_SECRET_KEY', 'fabrika_cnc_gizli_anahtari_2026!'); // Güvenli bir anahtar

// JWT Üretme Fonksiyonu (Giriş yapıldığında çalışır)
function generate_jwt($payload) {
    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
    
    $base64UrlHeader = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
    $base64UrlPayload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode(json_encode($payload)));
    
    $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, JWT_SECRET_KEY, true);
    $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
    
    return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
}

// İsteğin Token'ını Kontrol Etme Fonksiyonu
function authenticate_request() {
    $headers = getallheaders();
    if (!isset($headers['Authorization'])) {
        http_response_code(401);
        echo json_encode(["status" => "error", "message" => "Yetkilendirme başlığı (Authorization) eksik."]);
        exit();
    }

    $authHeader = $headers['Authorization'];
    list($jwt) = sscanf($authHeader, 'Bearer %s');

    if (!$jwt) {
        http_response_code(401);
        echo json_encode(["status" => "error", "message" => "Geçersiz Token formatı."]);
        exit();
    }

    $tokenParts = explode('.', $jwt);
    if (count($tokenParts) !== 3) {
        http_response_code(401);
        echo json_encode(["status" => "error", "message" => "Token yapısı geçersiz."]);
        exit();
    }

    $signature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode(hash_hmac('sha256', $tokenParts[0] . "." . $tokenParts[1], JWT_SECRET_KEY, true)));

    if ($signature !== $tokenParts[2]) {
        http_response_code(403);
        echo json_encode(["status" => "error", "message" => "Token doğrulaması başarısız! Yetkisiz erişim."]);
        exit();
    }

    // Token geçerli ise payload bilgisini dön
    return json_decode(base64_decode($tokenParts[1]), true);
}