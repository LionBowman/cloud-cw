FROM alpine
RUN apk add --update nodejs npm
WORKDIR /usr/src/app
EXPOSE 3000
COPY src/ .
COPY package.json ./
RUN npm install
RUN npm install pm2 -g
CMD [ "pm2-runtime", "app.js" ]

