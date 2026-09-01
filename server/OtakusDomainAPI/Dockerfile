# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy project file and restore dependencies
COPY ["OtakusDomainAPI.csproj", "./"]
RUN dotnet restore "OtakusDomainAPI.csproj"

# Copy everything else and build release
COPY . .
RUN dotnet publish "OtakusDomainAPI.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

# Render exposes the port via the PORT environment variable (default 8080 or 10000)
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "OtakusDomainAPI.dll"]