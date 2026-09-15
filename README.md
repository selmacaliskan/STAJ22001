# 🛠️ CNC Machine V1 - Lazer Kesim İzleme ve Kayıt Paneli

Bu proje, **Baykal Makine A.Ş.** bünyesinde gerçekleştirilen zorunlu yaz stajı kapsamındaki Ar-Ge ve Yazılım geliştirme süreçlerinde kurgulanmıştır. 

CNC lazer kesim makinelerindeki operasyonel verileri (kesim ölçüsü, durum bilgisi, operatör bilgisi) ve makine arıza/hata kayıtlarını gerçek zamanlı izlemek ve veritabanına kaydetmek amacıyla geliştirilmiş **full-stack web uygulamasıdır**.

---

## 🚀 Öne Çıkan Özellikler

* **Dinamik Gösterge (Gauge Panel):** Toplam çalıştırma sayısı ve işlenen mesafe verilerinin SVG tabanlı grafik bileşeni üzerinde anlık görselleştirilmesi.
* **İşlem Kaydı Yönetimi:** Operatörlerin lazer kesim başlatma, tamamlama ve geçmiş kayıtları listeleme modülü.
* **Hata Kayıt (Error Logging) Modülü:** Kritik makine arızalarının (`FAIL` durum kodlu) önem derecesine göre (`LOW`, `MEDIUM`, `HIGH`) sisteme işlenmesi ve kırmızı rozetlerle vurgulanması.
* **REST API & JWT Güvenliği:** Backend ve frontend ayrımı, PDO mimarisi ve Bearer Token yetkilendirme katmanı.
* **Periyodik Otomatik Yenileme:** Background `setInterval` mekanizması ile 15 saniyede bir veri güncelleme ve try/catch hata yakalama.

---

## 🛠️ Kullanılan Teknolojiler

### **Frontend (Ön Yüz)**
* **HTML5 & CSS3:** Modüler topbar/sidebar tasarımı, CSS Değişkenleri (`--purple-900`, `--cream`).
* **JavaScript (ES6+):** Fetch API, DOM Manipülasyonu, SVG Stroke Offset hesaplamaları.

### **Backend (Arka Yüz)**
* **PHP 8.x:** RESTful API uç noktaları (`api.php`), CORS başlık yapılandırmaları.
* **JWT (JSON Web Token):** HMAC-SHA256 algoritmalı kimlik doğrulama (`auth.php`).

### **Veritabanı & Sunucu**
* **MySQL / MariaDB:** 3NF normalizasyon standartlarında veritabanı şeması (`machine_logs`, `machine_errors`, `users`, `operations`).
* **WampServer (Apache):** Yerel sunucu geliştirme ortamı.

---

## 📊 Veritabanı Mimarisi (ER Diagram Özet)

Sistemdeki ilişkisel yapı 3NF standartlarına uygun şekilde kurulmuştur:
* `users` 1 ─── N `machine_logs`
* `operations` 1 ─── N `machine_logs`
* `machine_logs` 1 ─── N `machine_errors`

---

## 💻 Kurulum ve Çalıştırma

1. **Depoyu klonlayın:**
   ```bash
   git clone [https://github.com/selmacaliskan/STAJ22001.git](https://github.com/selmacaliskan/STAJ22001.git)
