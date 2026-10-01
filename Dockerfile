FROM nginx:stable-alpine
ENV PORT=8080
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY index.html config.js app.js style.css /usr/share/nginx/html/
COPY assets/ /usr/share/nginx/html/assets/
EXPOSE 8080
