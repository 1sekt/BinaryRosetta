# 1. ビルド環境 (Java 21 / Gradle 8.5)
FROM gradle:8.5-jdk21 AS build
WORKDIR /app
COPY . .
# Gradleのラッパーに実行権限を与えてビルド
RUN chmod +x gradlew && ./gradlew build -x test --no-daemon

# 2. 実行環境 (Java 21 / JRE)
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
# ビルドしたjarファイルをコピー
COPY --from=build /app/build/libs/*.jar app.jar
# ポート番号はご自身の8081に合わせています
EXPOSE 8081
ENTRYPOINT ["java","-jar","app.jar"]
