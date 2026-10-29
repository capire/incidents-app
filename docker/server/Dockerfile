ARG REGISTRY
ARG NODE_VERSION=26-alpine
FROM ${REGISTRY}node:${NODE_VERSION} AS build

WORKDIR /usr/src/build
COPY package*.json ./
RUN ["npm", "i"]

COPY /app ./app
COPY /srv ./srv
COPY /db ./db
COPY /mtx ./mtx

RUN ["npx", "cds", "build", "--for", "nodejs", "--production"]

WORKDIR /usr/src/build/gen/srv
RUN ["npm", "i", "--omit=dev"]

# runtime step
FROM ${REGISTRY}node:${NODE_VERSION} AS run
USER node
WORKDIR /usr/src/app

# copy compiled result from builder
COPY --chown=node:node --from=build /usr/src/build/gen/srv .
ENV NODE_ENV=production
EXPOSE 4004
# execute cds start script
CMD ["node", "./node_modules/@sap/cds/bin/serve"]