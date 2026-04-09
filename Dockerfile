# ビルド用
FROM gradle:7.6-jdk17 AS build
WORKDIR /app
COPY . .
RUN gradle build -x test

# 実行用
FROM openjdk:17-jdk-slim
WORKDIR /app
# ビルドしたjarをコピー（ plain.jar を除外するため * を工夫しています）
COPY --from=build /app/build/libs/*-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java","-jar","app.jar"]
