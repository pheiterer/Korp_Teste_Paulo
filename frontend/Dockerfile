# Stage 1: Build Angular Application
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar arquivos de dependências
COPY package.json package-lock.json ./

# Instalar dependências limpas
RUN npm ci

# Copiar código fonte da aplicação
COPY . .

# Compilar a aplicação Angular em modo de produção
RUN npm run build -- --configuration production

# Stage 2: Serve SPA via Nginx Alpine
FROM nginx:alpine

# Remover a configuração padrão do Nginx
RUN rm -rf /etc/nginx/conf.d/default.conf

# Copiar a configuração personalizada do Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar os arquivos estáticos compilados do Stage 1
COPY --from=builder /app/dist/frontend/browser /usr/share/nginx/html

# Expor a porta HTTP 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
