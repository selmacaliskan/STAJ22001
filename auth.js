// Kullanıcı giriş yaptıktan sonra alınan Token LocalStorage'da saklanır:
// localStorage.setItem('token', userToken);

async function sendCncLog(logData) {
    const token = localStorage.getItem('token');

    const response = await fetch('api.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` // JWT token header'a ekleniyor
        },
        body: JSON.stringify(logData)
    });

    const result = await response.json();
    console.log(result);
}