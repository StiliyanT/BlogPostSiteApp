# ---- Build stage ----
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ./api/*.csproj ./api/
RUN dotnet restore ./api/*.csproj

COPY ./api/. ./api/
RUN dotnet publish ./api/*.csproj -c Release -o /app/publish /p:UseAppHost=false

# ---- Runtime stage ----
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

# Render will inject PORT; bind Kestrel to it
ENV ASPNETCORE_URLS=http://0.0.0.0:${PORT}

# (optional) production environment
ENV ASPNETCORE_ENVIRONMENT=Production

COPY --from=build /app/publish .
# Replace with your actual dll name if different:
CMD ["dotnet", "BlogPostSiteAPI.dll"]
