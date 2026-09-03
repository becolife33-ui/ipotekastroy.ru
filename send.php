<?php
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Получаем данные и чистим их
    $area = htmlspecialchars(trim($_POST['area']));
    $phone = htmlspecialchars(trim($_POST['phone']));

    // Настройки почты
    $to = "your-email@yandex.ru"; // ЗАМЕНИТЕ НА ВАШ EMAIL
    $subject = "Заявка на расчет стоимости дома";
    
    $message = "
    <h2>Новая заявка с сайта</h2>
    <p><strong>Площадь:</strong> {$area} м²</p>
    <p><strong>Телефон:</strong> {$phone}</p>
    ";

    $headers = "MIME-Version: 1.0" . "\r\n";
    $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
    $headers .= "From: <noreply@yourdomain.ru>" . "\r\n";

    if (mail($to, $subject, $message, $headers)) {
        // Перенаправление на страницу благодарности
        header("Location: thank-you.html");
    } else {
        echo "Ошибка при отправке. Пожалуйста, попробуйте позже.";
    }
} else {
    header("Location: index.html");
}
?>