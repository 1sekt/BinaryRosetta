# ビルド用
FROM gradle:7.6-jdk17 AS build
WORKDIR /app
COPY . .
RUN gradle build -x test

# 実行環境
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar

# ここを 8081 に変更
EXPOSE 8081

ENTRYPOINT ["java","-jar","app.jar"]
