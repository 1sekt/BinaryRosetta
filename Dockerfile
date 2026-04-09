# 1. ビルド環境（新しいGradle用イメージ）
FROM gradle:7.6-jdk17 AS build
WORKDIR /app
COPY . .
# Gradleのラッパーに実行権限を与えてビルド
RUN chmod +x gradlew && ./gradlew build -x test

# 2. 実行環境（削除されたopenjdkの代わり）
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
# ビルドしたjarファイルをコピー
COPY --from=build /app/build/libs/*.jar app.jar
EXPOSE 8081
ENTRYPOINT ["java","-jar","app.jar"]
