FROM mcr.microsoft.com/dotnet/sdk:8.0

WORKDIR /workspace

ENV ASPNETCORE_URLS=http://0.0.0.0:8080

EXPOSE 8080

CMD ["sh", "-c", "dotnet restore apps/api/ExamRunner.sln && dotnet watch --project apps/api/src/ExamRunner.Api run --urls http://0.0.0.0:8080"]
