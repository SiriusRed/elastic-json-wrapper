FROM mhart/alpine-node:latest

COPY . .

RUN npm install

EXPOSE 3000 

ENTRYPOINT ["node","index.js"]