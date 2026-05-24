FROM php:8.2-cli

RUN docker-php-ext-install pdo pdo_mysql

WORKDIR /app

COPY . .

CMD ["sh", "-c", "find /app -type f -name '*.php' | head -20 && php -S 0.0.0.0:$PORT -t /app/backend /app/backend/index.php"]