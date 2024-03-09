FROM node:18
WORKDIR /rtsApp
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000

# Add Tini
ENV TINI_VERSION v0.19.0
ADD https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini /tini
RUN chmod +x /tini
ENTRYPOINT ["/tini", "--"]

CMD ["npm", "run", "deploy"]
